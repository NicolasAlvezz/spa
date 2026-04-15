-- =============================================================================
-- VM Integral Massage Inc. — Initial Schema
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- membership_plans  (catalog — no FK dependencies)
-- -----------------------------------------------------------------------------
CREATE TABLE membership_plans (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                TEXT UNIQUE NOT NULL,
  name_en             TEXT NOT NULL,
  name_es             TEXT NOT NULL,
  price_usd           NUMERIC(10,2) NOT NULL,
  sessions_per_month  INT NOT NULL DEFAULT 1,
  rollover_max        INT NOT NULL DEFAULT 1,
  min_months          INT NOT NULL DEFAULT 3,
  extras_en           TEXT[] NOT NULL DEFAULT '{}',
  extras_es           TEXT[] NOT NULL DEFAULT '{}',
  requires_healthcare BOOLEAN NOT NULL DEFAULT false,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- clients
-- user_id links a client row to their Supabase Auth account.
-- NULL means the client has not yet been given app access.
-- -----------------------------------------------------------------------------
CREATE TABLE clients (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  address               TEXT NOT NULL,
  email                 TEXT,
  how_did_you_hear      TEXT CHECK (
                          how_did_you_hear IN (
                            'instagram','referral','google',
                            'facebook','flyer','walk_in','other'
                          )
                        ),
  first_visit_date      DATE,
  is_healthcare_worker  BOOLEAN NOT NULL DEFAULT false,
  work_id_verified      BOOLEAN NOT NULL DEFAULT false,
  preferred_language    TEXT NOT NULL DEFAULT 'en'
                          CHECK (preferred_language IN ('en','es')),
  notes                 TEXT,
  -- qr_code is derived from id so it's always in sync
  qr_code               TEXT GENERATED ALWAYS AS (id::text) STORED,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One auth user can only be linked to one client row
CREATE UNIQUE INDEX clients_user_id_unique
  ON clients (user_id)
  WHERE user_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- memberships
-- -----------------------------------------------------------------------------
CREATE TABLE memberships (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id                UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_id                  UUID NOT NULL REFERENCES membership_plans(id),
  started_at               DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at               DATE NOT NULL,
  status                   TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','expired','cancelled')),
  sessions_used_this_month INT NOT NULL DEFAULT 0,
  rollover_sessions        INT NOT NULL DEFAULT 0
                             CHECK (rollover_sessions BETWEEN 0 AND 1),
  months_committed         INT NOT NULL DEFAULT 3,
  months_completed         INT NOT NULL DEFAULT 0,
  welcome_offer_used       BOOLEAN NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- payments
-- -----------------------------------------------------------------------------
CREATE TABLE payments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES memberships(id),
  amount_usd    NUMERIC(10,2) NOT NULL,
  method        TEXT NOT NULL
                  CHECK (method IN ('cash','debit','credit')),
  concept       TEXT NOT NULL
                  CHECK (concept IN ('monthly_membership','additional_visit','welcome_offer')),
  paid_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- service_types  (catalog)
-- -----------------------------------------------------------------------------
CREATE TABLE service_types (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug       TEXT UNIQUE NOT NULL,
  name_en    TEXT NOT NULL,
  name_es    TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- visits
-- -----------------------------------------------------------------------------
CREATE TABLE visits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  membership_id   UUID REFERENCES memberships(id),
  service_type_id UUID REFERENCES service_types(id),
  visited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_type    TEXT NOT NULL DEFAULT 'included'
                    CHECK (session_type IN ('included','rollover','additional','welcome_offer')),
  registered_by   TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX idx_clients_user_id          ON clients(user_id);
CREATE INDEX idx_clients_phone            ON clients(phone);
CREATE INDEX idx_memberships_client_id    ON memberships(client_id);
CREATE INDEX idx_memberships_expires_at   ON memberships(expires_at);
CREATE INDEX idx_memberships_status       ON memberships(status);
CREATE INDEX idx_visits_client_id         ON visits(client_id);
CREATE INDEX idx_visits_visited_at        ON visits(visited_at);
CREATE INDEX idx_payments_client_id       ON payments(client_id);
CREATE INDEX idx_payments_paid_at         ON payments(paid_at);

-- -----------------------------------------------------------------------------
-- updated_at trigger (shared function)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- Seed: membership plans
-- -----------------------------------------------------------------------------
INSERT INTO membership_plans
  (slug, name_en, name_es, price_usd, sessions_per_month,
   rollover_max, min_months, extras_en, extras_es, requires_healthcare, is_active)
VALUES
  ('healthcare_basic',
   'Healthcare Relief – Basic',
   'Healthcare Relief – Básico',
   80.00, 1, 1, 3,
   '{}', '{}',
   true, true),

  ('healthcare_95',
   'Healthcare 95',
   'Healthcare 95',
   95.00, 1, 1, 3,
   ARRAY['Aromatherapy', 'Hot Stones', 'Muscle Recovery Technology'],
   ARRAY['Aromaterapia', 'Hot Stones', 'Tecnología de recuperación muscular'],
   true, true);

-- Seed: service types
INSERT INTO service_types (slug, name_en, name_es) VALUES
  ('relaxing',        'Relaxing / Anti-Stress Massage', 'Masaje Relajante / Anti-Estrés'),
  ('deep_tissue',     'Deep Tissue Massage',            'Masaje Descontracturante'),
  ('post_op',         'Post-Operative Massage',         'Masaje Post Operatorio'),
  ('lymphatic',       'Lymphatic Drainage',             'Drenaje Linfático'),
  ('sports',          'Sports Massage',                 'Masaje Deportivo'),
  ('muscle_recovery', 'Muscle Recovery',                'Recuperación Muscular');
