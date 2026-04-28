-- =============================================================================
-- VM Integral Massage Inc. — Extend service_types
--
-- Rationale: service_types already exists as the massage catalog and is used
-- as FK in both appointments and visits. Adding columns here keeps a single
-- source of truth instead of a separate massage_types table.
-- =============================================================================

ALTER TABLE public.service_types
  ADD COLUMN IF NOT EXISTS description      TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes INT          NOT NULL DEFAULT 60
                             CHECK (duration_minutes > 0),
  ADD COLUMN IF NOT EXISTS price            NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW();

-- Seed realistic values for each service type
UPDATE public.service_types SET
  duration_minutes = 60,
  description      = 'Classic full-body massage focused on relaxation and stress reduction.'
WHERE slug = 'relaxing';

UPDATE public.service_types SET
  duration_minutes = 60,
  description      = 'Firm-pressure massage targeting deep muscle layers to relieve chronic tension and knots.'
WHERE slug = 'deep_tissue';

UPDATE public.service_types SET
  duration_minutes = 60,
  description      = 'Specialized massage to reduce post-operative swelling, fibrosis, and accelerate recovery.'
WHERE slug = 'post_op';

UPDATE public.service_types SET
  duration_minutes = 60,
  description      = 'Gentle manual drainage technique to stimulate lymphatic flow and reduce fluid retention.'
WHERE slug = 'lymphatic';

UPDATE public.service_types SET
  duration_minutes = 60,
  description      = 'Massage designed to support athletic performance, prevent injuries, and speed recovery.'
WHERE slug = 'sports';

UPDATE public.service_types SET
  duration_minutes = 30,
  description      = 'Recovery technology session using targeted techniques to accelerate muscle healing.'
WHERE slug = 'muscle_recovery';

-- -----------------------------------------------------------------------------
-- Appointments: clients can now INSERT their own appointments via server action
-- (server action uses service client so RLS is bypassed — policies below are
--  a defense-in-depth layer for direct API access).
-- -----------------------------------------------------------------------------
-- Existing policies already cover admin full access and client read-own.
-- No new policies required for the booking flow (service client bypasses RLS).
