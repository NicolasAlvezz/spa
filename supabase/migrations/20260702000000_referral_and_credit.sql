-- Referral system: track who referred a client and store credit balance.
-- credit_balance accumulates $10 for each successful referral; fully consumed
-- when the admin applies it to a payment (resets to 0).

alter table public.clients
  add column if not exists credit_balance      numeric(10,2) not null default 0,
  add column if not exists referred_by_client_id uuid references public.clients(id) default null;
