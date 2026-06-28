-- Remove NOT NULL constraint from payments.method — payment method is no longer tracked
alter table public.payments alter column method drop not null;
