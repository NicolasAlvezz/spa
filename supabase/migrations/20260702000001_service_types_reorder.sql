-- Update service types to match current Booksy offerings.
-- Deactivated services keep their rows so existing visit records are preserved.

alter table public.service_types
  add column if not exists sort_order integer not null default 999;

-- Deactivate services no longer offered
update public.service_types set is_active = false
  where slug in ('massage_60', 'mothers_day', 'neck', 'valentine_special', 'valentine_facial');

-- Fix prices that changed
update public.service_types set price_usd = 110 where slug = 'therapeutic';
update public.service_types set price_usd = 110 where slug = 'relaxation';
update public.service_types set price_usd = 110 where slug = 'sports';
update public.service_types set price_usd = 180 where slug = 'massage_120';

-- Set display order matching Booksy (active services only)
update public.service_types set sort_order = 1  where slug = 'full_body';
update public.service_types set sort_order = 2  where slug = 'deep_tissue';
update public.service_types set sort_order = 3  where slug = 'therapeutic';
update public.service_types set sort_order = 4  where slug = 'lymphatic';
update public.service_types set sort_order = 5  where slug = 'relaxation';
update public.service_types set sort_order = 6  where slug = 'sports';
update public.service_types set sort_order = 7  where slug = 'prenatal';
update public.service_types set sort_order = 8  where slug = 'couples';
update public.service_types set sort_order = 9  where slug = 'cupping';
update public.service_types set sort_order = 10 where slug = 'body_scrub';
update public.service_types set sort_order = 11 where slug = 'massage_120';
update public.service_types set sort_order = 12 where slug = 'massage_90';
update public.service_types set sort_order = 13 where slug = 'massage_30';
update public.service_types set sort_order = 14 where slug = 'post_op';
