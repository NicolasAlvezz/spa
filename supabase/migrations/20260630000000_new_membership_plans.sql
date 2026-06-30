-- Add additional_price_usd: preferred price for extra visits within the same month.
-- Nullable — falls back to price_usd in application code when null.
alter table public.membership_plans
  add column if not exists additional_price_usd numeric(10,2) default null;

-- Deactivate old healthcare-worker plans
update public.membership_plans
  set is_active = false
  where slug in ('healthcare_basic', 'healthcare_95');

-- Insert new open-access monthly plans
insert into public.membership_plans
  (slug, name_en, name_es, price_usd, additional_price_usd,
   sessions_per_month, rollover_max, min_months,
   extras_en, extras_es, requires_healthcare, is_active, plan_type)
values
  (
    'basic',
    'Basic Membership',
    'Membresía Básica',
    89, 89, 1, 2, 6,
    array[
      'Muscle Recovery Tools',
      'Other complementary therapies per therapist''s recommendation'
    ],
    array[
      'Herramientas de Recuperación Muscular',
      'Otras terapias complementarias según recomendación del terapeuta'
    ],
    false, true, 'monthly'
  ),
  (
    'premium',
    'Premium Membership',
    'Membresía Premium',
    99, 95, 1, 3, 6,
    array[
      'Aromatherapy',
      'Hot Stones',
      'Cupping Therapy (Suction Therapy)',
      'Muscle Recovery Tools',
      'Other complementary therapies per therapist''s recommendation'
    ],
    array[
      'Aromaterapia',
      'Piedras Calientes',
      'Cupping Therapy (Terapia de Ventosas)',
      'Herramientas de Recuperación Muscular',
      'Otras terapias complementarias según recomendación del terapeuta'
    ],
    false, true, 'monthly'
  );
