-- Add visit_id FK to payments so each payment can be directly linked to its visit.
-- Nullable for backward compatibility — existing payments remain unlinked.
alter table public.payments
  add column if not exists visit_id uuid references public.visits(id) on delete set null;

create index if not exists payments_visit_id_idx on public.payments(visit_id);
