-- Link memberships back to the membership_request that originated them.
-- Nullable: existing memberships (assigned before this feature) have no request.
alter table public.memberships
  add column membership_request_id uuid references public.membership_requests(id) on delete set null;

create index on public.memberships (membership_request_id);
