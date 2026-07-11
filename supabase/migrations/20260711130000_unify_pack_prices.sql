-- Packs: uniform price by session count (5 = $475, 10 = $900).
-- All pack plans of the same size must show the same price in the app.

update public.membership_plans
set
  price_usd = 475,
  allows_split_payment = false,
  split_first_amount = null
where plan_type = 'pack'
  and total_sessions = 5;

update public.membership_plans
set
  price_usd = 900,
  allows_split_payment = true,
  split_first_amount = 450
where plan_type = 'pack'
  and total_sessions = 10;

-- Legacy duplicate from old "30 minute" naming; keep one canonical 5-pack active.
update public.membership_plans
set is_active = false
where slug = 'sesion_pack_5_30_minute';
