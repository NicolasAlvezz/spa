-- Monthly memberships include 1 session per "cycle", where a cycle is one month
-- from the purchase date (anniversary), not the calendar month. Until now nothing
-- reset sessions_used_this_month automatically within the 6-month commitment
-- window, so a client could only ever use their included session once.
--
-- next_session_reset_at tracks the next anniversary date; app code checks it on
-- every check-in/visit and resets sessions_used_this_month (granting rollover for
-- the cycle that just ended) once that date has passed.

alter table public.memberships
  add column if not exists next_session_reset_at date default null;

-- Backfill: for active, non-pack memberships, compute the next anniversary date
-- from started_at that is still in the future (or today).
do $$
declare
  m record;
  next_reset date;
begin
  for m in
    select mm.id, mm.started_at
    from public.memberships mm
    join public.membership_plans mp on mp.id = mm.plan_id
    where mp.plan_type <> 'pack'
      and mm.status <> 'cancelled'
  loop
    next_reset := m.started_at + interval '1 month';
    while next_reset <= current_date loop
      next_reset := next_reset + interval '1 month';
    end loop;
    update public.memberships set next_session_reset_at = next_reset where id = m.id;
  end loop;
end $$;
