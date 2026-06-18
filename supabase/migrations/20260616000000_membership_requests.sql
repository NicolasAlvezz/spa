-- =============================================================================
-- Membership Requests — admin-initiated digital contracts sent to client phones
-- =============================================================================

-- Generic updated_at trigger function (reusable across tables)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.membership_requests (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  plan_id           uuid not null references public.membership_plans(id),
  requested_by      text not null,            -- email of the admin who sent it
  status            text not null default 'pending'
                      check (status in ('pending', 'signed', 'declined', 'cancelled', 'expired')),

  -- Preferred language for the contract (client's preferred_language at creation time)
  language          text not null check (language in ('en', 'es')),
  version           text not null,             -- e.g. 'membership-v1.0'

  -- Snapshot of contract text at creation time (immutable evidence, same pattern as consent_acceptances)
  terms_title       text not null,
  terms_body        text not null,

  -- Forensic evidence captured at signing time
  signed_at         timestamptz,
  signed_ip         inet,
  signed_user_agent text,

  -- Timing
  expires_at        timestamptz not null,      -- created_at + 30 minutes (set by API)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Client portal: find the pending contract for this client quickly
create index on public.membership_requests (client_id, status, created_at desc);

-- Conflict check in POST /api/membership-requests
create index on public.membership_requests (client_id, status, expires_at);

-- ── Trigger: updated_at ───────────────────────────────────────────────────────

create trigger membership_requests_updated_at
  before update on public.membership_requests
  for each row execute function public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.membership_requests enable row level security;

-- Admins have full access (same helper function used across all tables)
create policy "membership_requests: admin full access"
  on public.membership_requests
  for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Clients can only read their own requests
create policy "membership_requests: client reads own"
  on public.membership_requests
  for select
  to authenticated
  using (client_id = (select id from public.clients where user_id = auth.uid()));

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Enables the admin waiting screen to receive live UPDATE events via WebSocket.
-- Run this after the table exists. If the publication already exists in the
-- Supabase dashboard, you can also enable it from there instead.
alter publication supabase_realtime add table public.membership_requests;

-- REPLICA IDENTITY FULL is required for Supabase Realtime filtered UPDATE subscriptions.
-- Without it, payload.new only contains the primary key and filters don't fire correctly.
alter table public.membership_requests replica identity full;
