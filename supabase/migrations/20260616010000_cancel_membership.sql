-- Extend the payments.concept check constraint to include 'cancellation_fee'.
-- Also adds any other concepts that may have been inserted by application code
-- after the initial migration (pack_purchase, pack_split_second, post_op_visit).

-- Dynamically drop the existing concept check so this is idempotent regardless
-- of whether prior concepts were already added manually or via another migration.
do $$ declare c text; begin
  select conname into c
  from pg_constraint
  join pg_class on pg_class.oid = pg_constraint.conrelid
  where pg_class.relname = 'payments'
    and contype = 'c'
    and pg_get_constraintdef(pg_constraint.oid) like '%concept%';
  if c is not null then
    execute format('alter table public.payments drop constraint %I', c);
  end if;
end $$;

alter table public.payments
  add constraint payments_concept_check
  check (concept in (
    'monthly_membership',
    'additional_visit',
    'welcome_offer',
    'pack_purchase',
    'pack_split_second',
    'post_op_visit',
    'cancellation_fee'
  ));
