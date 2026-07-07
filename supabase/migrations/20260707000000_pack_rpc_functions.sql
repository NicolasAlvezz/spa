-- Drop existing functions first to allow changing return types
DROP FUNCTION IF EXISTS consume_pack_session(uuid);
DROP FUNCTION IF EXISTS confirm_split_payment_atomic(uuid, text);

-- ─── Pack session consumption ─────────────────────────────────────────────────
-- Atomically decrements sessions_remaining on a pack membership and increments
-- sessions_used_this_month (used for split-payment threshold tracking).
-- Returns: sessions_remaining (int), split_payment_warning (bool)
-- Error codes:
--   P0001 = membership not found
--   P0002 = no sessions remaining
--   P0003 = split payment required (sessions_used >= threshold and pending)

CREATE OR REPLACE FUNCTION consume_pack_session(p_membership_id uuid)
RETURNS TABLE(sessions_remaining int, split_payment_warning bool)
LANGUAGE plpgsql
AS $$
DECLARE
  v_membership memberships%ROWTYPE;
  v_new_remaining int;
  v_split_threshold constant int := 4;
BEGIN
  -- Lock the row to prevent concurrent consumption
  SELECT * INTO v_membership
  FROM memberships
  WHERE id = p_membership_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'membership_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_membership.sessions_remaining IS NULL OR v_membership.sessions_remaining <= 0 THEN
    RAISE EXCEPTION 'no_sessions_remaining' USING ERRCODE = 'P0002';
  END IF;

  -- Block if split payment is pending and threshold has been reached
  IF v_membership.split_payment_pending
     AND v_membership.sessions_used_this_month >= v_split_threshold THEN
    RAISE EXCEPTION 'split_payment_required' USING ERRCODE = 'P0003';
  END IF;

  v_new_remaining := v_membership.sessions_remaining - 1;

  UPDATE memberships
  SET
    sessions_remaining     = v_new_remaining,
    sessions_used_this_month = sessions_used_this_month + 1
  WHERE id = p_membership_id;

  -- Warn on the session that hits the threshold (4th session consumed)
  RETURN QUERY SELECT
    v_new_remaining,
    (v_membership.split_payment_pending
     AND v_membership.sessions_used_this_month + 1 = v_split_threshold)::bool;
END;
$$;


-- ─── Split payment confirmation ───────────────────────────────────────────────
-- Atomically marks split_payment_pending = false and inserts the second payment.
-- Two concurrent calls cannot both succeed — the second sees pending=false and
-- raises P0004, preventing double-charging.
-- Returns: amount_paid (numeric)
-- Error codes:
--   P0001 = membership not found
--   P0002 = not a pack plan
--   P0003 = membership not active
--   P0004 = no split payment pending

CREATE OR REPLACE FUNCTION confirm_split_payment_atomic(
  p_membership_id uuid,
  p_payment_method text DEFAULT NULL
)
RETURNS TABLE(amount_paid numeric)
LANGUAGE plpgsql
AS $$
DECLARE
  v_membership memberships%ROWTYPE;
  v_plan       membership_plans%ROWTYPE;
  v_second_amount numeric;
BEGIN
  -- Lock row
  SELECT * INTO v_membership
  FROM memberships
  WHERE id = p_membership_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'membership_not_found' USING ERRCODE = 'P0001';
  END IF;

  -- Fetch the plan
  SELECT * INTO v_plan
  FROM membership_plans
  WHERE id = v_membership.plan_id;

  IF v_plan.plan_type IS DISTINCT FROM 'pack' THEN
    RAISE EXCEPTION 'not_a_pack' USING ERRCODE = 'P0002';
  END IF;

  IF v_membership.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'membership_not_active' USING ERRCODE = 'P0003';
  END IF;

  IF NOT v_membership.split_payment_pending THEN
    RAISE EXCEPTION 'no_split_payment_pending' USING ERRCODE = 'P0004';
  END IF;

  -- Calculate second installment
  v_second_amount := v_plan.price_usd - COALESCE(v_plan.split_first_amount, 0);

  -- Mark payment as settled
  UPDATE memberships
  SET split_payment_pending = false
  WHERE id = p_membership_id;

  -- Insert second payment record
  INSERT INTO payments (client_id, membership_id, amount_usd, method, concept)
  VALUES (
    v_membership.client_id,
    p_membership_id,
    v_second_amount,
    p_payment_method,
    'pack_split_second'
  );

  RETURN QUERY SELECT v_second_amount;
END;
$$;
