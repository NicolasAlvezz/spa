-- =============================================================================
-- Consent Acceptances — per-visit signed consent persistence
-- =============================================================================

create table public.consent_acceptances (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients(id) on delete cascade,
  accepted_at      timestamptz not null default now(),
  language         text not null check (language in ('en', 'es')),
  version          text not null,

  -- Snapshot of the consent text at signing time (immutable evidence)
  medical_title    text not null,
  medical_body     text not null,
  agreement_title  text not null,
  agreement_body   text not null,

  -- Optional forensic evidence
  ip_address       inet,
  user_agent       text,

  -- Association with a visit (set when staff does check-in, 1:1)
  consumed_at       timestamptz,
  consumed_by_visit uuid references public.visits(id) on delete set null
);

create index on public.consent_acceptances (client_id, accepted_at desc);
create index on public.consent_acceptances (consumed_by_visit);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.consent_acceptances enable row level security;

-- Clients can read their own consents
create policy "clients read own consents" on public.consent_acceptances
  for select using (
    auth.uid() = (select user_id from public.clients where id = client_id)
  );

-- Clients can insert their own consents
create policy "clients insert own consents" on public.consent_acceptances
  for insert with check (
    auth.uid() = (select user_id from public.clients where id = client_id)
  );

-- Admins have full access.
-- The app stores the admin flag in app_metadata (not the root `role` claim,
-- which Supabase Auth fills with 'authenticated' / 'anon'), so we must look
-- it up under -> 'app_metadata' ->> 'role'.
create policy "admins full access" on public.consent_acceptances
  for all using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
