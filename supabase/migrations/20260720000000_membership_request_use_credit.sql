-- Monthly memberships are created server-side when the client signs the contract
-- (assignMembershipAfterSign). Capture the admin's "use credit" choice at the time
-- the contract is sent so the credit can be applied to the payment on signing.

alter table public.membership_requests
  add column if not exists use_credit boolean not null default false;
