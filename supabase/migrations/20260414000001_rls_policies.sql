-- =============================================================================
-- VM Integral Massage Inc. — Row Level Security Policies
--
-- Roles (stored in auth.users.app_metadata.role):
--   'admin'  → Maria Victoria (dueña). Full access to everything.
--   'client' → Spa customers. Read-only access to their own data.
--
-- Role assignment:
--   Set via Supabase service role key (server-side only, cannot be self-assigned):
--   supabase.auth.admin.updateUserById(userId, {
--     app_metadata: { role: 'admin' }   -- or 'client'
--   })
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper function: is_admin()
-- Reads role from the JWT app_metadata. Runs as postgres (SECURITY DEFINER)
-- so it is safe to call from within RLS policies.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- -----------------------------------------------------------------------------
-- Helper function: own_client_id()
-- Returns the clients.id linked to the current auth user.
-- SECURITY DEFINER bypasses RLS on the clients table to avoid recursion.
-- Returns NULL if the user has no linked client row.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.own_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clients WHERE user_id = auth.uid() LIMIT 1;
$$;

-- =============================================================================
-- Enable RLS on all tables
-- =============================================================================
ALTER TABLE public.clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types    ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- TABLE: clients
-- Admin → full CRUD
-- Client → read own row only
-- =============================================================================

CREATE POLICY "clients: admin full access"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "clients: client reads own row"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- TABLE: membership_plans
-- Everyone reads (needed by clients to display their plan info).
-- Only admin can insert/update (catalog management).
-- =============================================================================

CREATE POLICY "membership_plans: authenticated can read"
  ON public.membership_plans
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "membership_plans: admin can write"
  ON public.membership_plans
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- TABLE: memberships
-- Admin → full access
-- Client → read own memberships only
-- =============================================================================

CREATE POLICY "memberships: admin full access"
  ON public.memberships
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "memberships: client reads own"
  ON public.memberships
  FOR SELECT
  TO authenticated
  USING (client_id = public.own_client_id());

-- =============================================================================
-- TABLE: payments
-- Admin → full access
-- Client → read own payments only (payments are immutable: no client updates)
-- =============================================================================

CREATE POLICY "payments: admin full access"
  ON public.payments
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "payments: client reads own"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (client_id = public.own_client_id());

-- =============================================================================
-- TABLE: visits
-- Admin → full access
-- Client → read own visits only
-- =============================================================================

CREATE POLICY "visits: admin full access"
  ON public.visits
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "visits: client reads own"
  ON public.visits
  FOR SELECT
  TO authenticated
  USING (client_id = public.own_client_id());

-- =============================================================================
-- TABLE: service_types
-- Everyone reads (public catalog).
-- Only admin can write.
-- =============================================================================

CREATE POLICY "service_types: authenticated can read"
  ON public.service_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "service_types: admin can write"
  ON public.service_types
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- NOTES FOR FUTURE MAINTENANCE
-- =============================================================================
-- 1. To promote a user to admin (run server-side with service role key):
--      supabase.auth.admin.updateUserById(userId, {
--        app_metadata: { role: 'admin' }
--      })
--
-- 2. To link an existing client row to an auth account (after client signup):
--      UPDATE clients SET user_id = '<auth_user_id>' WHERE id = '<client_id>';
--
-- 3. The is_admin() and own_client_id() functions use SECURITY DEFINER,
--    meaning they run as the postgres superuser. Do not expand their logic
--    without careful review.
--
-- 4. Payments have no UPDATE or DELETE for clients by design (immutable records).
--    Admin can add notes via the admin policy (FOR ALL).
-- =============================================================================
