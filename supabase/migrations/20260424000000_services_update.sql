-- =============================================================================
-- VM Integral Massage Inc. — Services catalog update
--
-- Replaces the old single-language description/price columns with bilingual
-- description_en/description_es and price_usd. Re-seeds the catalog from Booksy.
--
-- ⚠️  This DELETE removes all existing service_types rows.
--     Any visits/appointments referencing the old rows will have service_type_id = NULL
--     if the FK is ON DELETE SET NULL, or will violate the constraint otherwise.
--     Verify FK constraints before running in production with existing visit data.
-- =============================================================================

-- 1. Add new columns (idempotent)
ALTER TABLE public.service_types
  ADD COLUMN IF NOT EXISTS price_usd      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_es TEXT;

-- duration_minutes already added in 20260428000000_service_types_extend.sql

-- 2. Migrate any existing price data before dropping the column
UPDATE public.service_types
  SET price_usd = price
  WHERE price IS NOT NULL AND price_usd IS NULL;

-- 3. Drop old single-language columns (superseded by the new ones)
ALTER TABLE public.service_types DROP COLUMN IF EXISTS price;
ALTER TABLE public.service_types DROP COLUMN IF EXISTS description;

-- 4. Re-seed with the full Booksy catalog
DELETE FROM public.service_types;

INSERT INTO public.service_types
  (slug, name_en, name_es, price_usd, duration_minutes, is_active)
VALUES
  ('massage_60',        '60 min massage',              'Masaje 60 min',                 80,  60,  true),
  ('massage_30',        '30 min massage',              'Masaje 30 min',                 60,  30,  true),
  ('full_body',         'Full body massage',            'Masaje cuerpo completo',        100, 60,  true),
  ('deep_tissue',       'Deep tissue massage',          'Masaje descontracturante',      100, 60,  true),
  ('back_massage',      'Back massage',                 'Masaje de espalda',             60,  30,  true),
  ('therapeutic',       'Therapeutic massage',          'Masaje terapéutico',            100, 60,  true),
  ('sports',            'Sports massage',               'Masaje deportivo',              100, 60,  true),
  ('cupping',           'Cupping therapy',              'Terapia de ventosas',           100, 60,  true),
  ('neck',              'Neck massage',                 'Masaje de cuello',              100, 60,  true),
  ('couples',           'Couples massage',              'Masaje en pareja',              190, 60,  true),
  ('prenatal',          'Pregnancy massage',            'Masaje prenatal',               100, 60,  true),
  ('lymphatic',         'Lymphatic drainage',           'Drenaje linfático',             100, 60,  true),
  ('relaxation',        'Relaxation massage',           'Masaje relajante',              100, 60,  true),
  ('foot',              'Foot massage',                 'Masaje de pies',                90,  60,  true),
  ('head',              'Head massage',                 'Masaje de cabeza',              100, 60,  true),
  ('body_scrub',        'Body scrub',                   'Exfoliación corporal',          110, 60,  true),
  ('facials',           'Facials',                      'Limpieza facial',               100, 60,  true),
  ('body_contouring',   'Body contouring',              'Masaje moldeador',              110, 60,  true),
  ('cellulite',         'Cellulite removal',            'Eliminación de celulitis',      110, 60,  true),
  ('post_op',           'Post-Op Massage',              'Masaje Post Operatorio',        90,  60,  true),
  ('valentine_special', 'San Valentine Special',        'Especial San Valentín',         170, 60,  true),
  ('valentine_facial',  'Valentine Massage & Facial',   'Masaje y Facial San Valentín',  340, 120, true),
  ('mothers_day',       'Mothers Day Special',          'Especial Día de las Madres',    200, 120, true);
