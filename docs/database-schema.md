# Esquema de Base de Datos

> Base de datos: PostgreSQL via Supabase
> Todas las tablas tienen `created_at` y `updated_at` automáticos.

---

## Diagrama de relaciones

```
membership_plans
  └──< memberships

clients
  └──< memberships          (1 cliente → muchas membresías históricas)
  └──< visits               (1 cliente → muchos registros de visita)
  └──< payments             (1 cliente → muchos pagos)
```

---

## Tablas

### `clients`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` PK | Identificador único (el que va en el QR) |
| `first_name` | `text` NOT NULL | Nombre |
| `last_name` | `text` NOT NULL | Apellido |
| `phone` | `text` NOT NULL | Celular (formato US: (xxx) xxx-xxxx) |
| `address` | `text` NOT NULL | Dirección completa |
| `email` | `text` | Email (opcional) |
| `how_did_you_hear` | `text` | instagram / referral / google / facebook / flyer / walk_in / other |
| `first_visit_date` | `date` | Fecha del primer masaje o inscripción |
| `is_healthcare_worker` | `boolean` | ¿Es trabajador de la salud? Default: false |
| `work_id_verified` | `boolean` | ¿Presentó badge o ID? Default: false |
| `preferred_language` | `text` | `en` / `es` — idioma preferido del cliente |
| `notes` | `text` | Notas internas del admin |
| `qr_code` | `text` | Generado = id del cliente |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

---

### `membership_plans`

Tabla de catálogo — define los planes disponibles.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` PK | |
| `slug` | `text` UNIQUE | `healthcare_basic` / `healthcare_95` |
| `name_en` | `text` | Nombre en inglés |
| `name_es` | `text` | Nombre en español |
| `price_usd` | `numeric(10,2)` | Precio mensual |
| `sessions_per_month` | `int` | Sesiones incluidas por mes |
| `rollover_max` | `int` | Máximo de sesiones acumulables (default: 1) |
| `min_months` | `int` | Meses mínimos de compromiso (default: 3) |
| `extras_en` | `text[]` | Lista de extras en inglés (ej: Aromatherapy, Hot Stones) |
| `extras_es` | `text[]` | Lista de extras en español |
| `requires_healthcare` | `boolean` | Requiere ser trabajador de salud |
| `is_active` | `boolean` | Si el plan está disponible para nuevas inscripciones |
| `created_at` | `timestamptz` | |

**Registros iniciales:**

```sql
INSERT INTO membership_plans (slug, name_en, name_es, price_usd, sessions_per_month,
  rollover_max, min_months, extras_en, extras_es, requires_healthcare, is_active)
VALUES
  ('healthcare_basic',
   'Healthcare Relief – Basic', 'Healthcare Relief – Básico',
   80.00, 1, 1, 3,
   ARRAY[]::text[], ARRAY[]::text[],
   true, true),

  ('healthcare_95',
   'Healthcare 95', 'Healthcare 95',
   95.00, 1, 1, 3,
   ARRAY['Aromatherapy', 'Hot Stones', 'Muscle Recovery Technology'],
   ARRAY['Aromaterapia', 'Hot Stones', 'Tecnología de recuperación muscular'],
   true, true);
```

---

### `memberships`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` PK | |
| `client_id` | `uuid` FK → clients | |
| `plan_id` | `uuid` FK → membership_plans | |
| `started_at` | `date` NOT NULL | Fecha de inicio del período |
| `expires_at` | `date` NOT NULL | Fecha de vencimiento (started_at + 1 mes) |
| `status` | `text` | `active` / `expired` / `cancelled` |
| `sessions_used_this_month` | `int` | Sesiones usadas en el mes actual |
| `rollover_sessions` | `int` | Sesiones pendientes de rollover (máx 1) |
| `months_committed` | `int` | Meses de compromiso (default: 3) |
| `months_completed` | `int` | Meses ya completados |
| `welcome_offer_used` | `boolean` | Si ya usó el primer masaje a USD 70 |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

---

### `payments`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` PK | |
| `client_id` | `uuid` FK → clients | |
| `membership_id` | `uuid` FK → memberships | NULL si es visita adicional sin membresía |
| `amount_usd` | `numeric(10,2)` NOT NULL | Monto cobrado |
| `method` | `text` | `cash` / `debit` / `credit` |
| `concept` | `text` | `monthly_membership` / `additional_visit` / `welcome_offer` |
| `paid_at` | `date` NOT NULL | Fecha del pago (default: hoy) |
| `notes` | `text` | Observaciones opcionales |
| `created_at` | `timestamptz` | |

---

### `visits`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` PK | |
| `client_id` | `uuid` FK → clients | |
| `membership_id` | `uuid` FK → memberships | Membresía vigente al momento |
| `visited_at` | `timestamptz` NOT NULL | Fecha y hora de la visita |
| `session_type` | `text` | `included` / `rollover` / `additional` / `welcome_offer` |
| `registered_by` | `text` | Identificador del staff |
| `notes` | `text` | Observaciones opcionales |
| `created_at` | `timestamptz` | |

---

## Migración completa (SQL)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Membership plans catalog
CREATE TABLE membership_plans (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                TEXT UNIQUE NOT NULL,
  name_en             TEXT NOT NULL,
  name_es             TEXT NOT NULL,
  price_usd           NUMERIC(10,2) NOT NULL,
  sessions_per_month  INT NOT NULL DEFAULT 1,
  rollover_max        INT NOT NULL DEFAULT 1,
  min_months          INT NOT NULL DEFAULT 3,
  extras_en           TEXT[] DEFAULT '{}',
  extras_es           TEXT[] DEFAULT '{}',
  requires_healthcare BOOLEAN DEFAULT false,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Clients
CREATE TABLE clients (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  address               TEXT NOT NULL,
  email                 TEXT,
  how_did_you_hear      TEXT,
  first_visit_date      DATE,
  is_healthcare_worker  BOOLEAN DEFAULT false,
  work_id_verified      BOOLEAN DEFAULT false,
  preferred_language    TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'es')),
  notes                 TEXT,
  qr_code               TEXT GENERATED ALWAYS AS (id::text) STORED,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Memberships
CREATE TABLE memberships (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id                UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_id                  UUID NOT NULL REFERENCES membership_plans(id),
  started_at               DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at               DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
  status                   TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'expired', 'cancelled')),
  sessions_used_this_month INT NOT NULL DEFAULT 0,
  rollover_sessions        INT NOT NULL DEFAULT 0 CHECK (rollover_sessions <= 1),
  months_committed         INT NOT NULL DEFAULT 3,
  months_completed         INT NOT NULL DEFAULT 0,
  welcome_offer_used       BOOLEAN DEFAULT false,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES memberships(id),
  amount_usd    NUMERIC(10,2) NOT NULL,
  method        TEXT NOT NULL CHECK (method IN ('cash', 'debit', 'credit')),
  concept       TEXT NOT NULL CHECK (concept IN ('monthly_membership', 'additional_visit', 'welcome_offer')),
  paid_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Visits
CREATE TABLE visits (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES memberships(id),
  visited_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_type  TEXT NOT NULL DEFAULT 'included'
                  CHECK (session_type IN ('included', 'rollover', 'additional', 'welcome_offer')),
  registered_by TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_clients_phone          ON clients(phone);
CREATE INDEX idx_memberships_client_id  ON memberships(client_id);
CREATE INDEX idx_memberships_expires_at ON memberships(expires_at);
CREATE INDEX idx_visits_client_id       ON visits(client_id);
CREATE INDEX idx_visits_visited_at      ON visits(visited_at);
CREATE INDEX idx_payments_client_id     ON payments(client_id);

-- Datos iniciales de planes
INSERT INTO membership_plans (slug, name_en, name_es, price_usd, sessions_per_month,
  rollover_max, min_months, extras_en, extras_es, requires_healthcare, is_active)
VALUES
  ('healthcare_basic',
   'Healthcare Relief – Basic', 'Healthcare Relief – Básico',
   80.00, 1, 1, 3, '{}', '{}'::text[], true, true),
  ('healthcare_95',
   'Healthcare 95', 'Healthcare 95',
   95.00, 1, 1, 3,
   ARRAY['Aromatherapy', 'Hot Stones', 'Muscle Recovery Technology'],
   ARRAY['Aromaterapia', 'Hot Stones', 'Tecnología de recuperación muscular'],
   true, true);
```

---

## Tabla adicional: `service_types`

Catálogo de tipos de servicio disponibles en el spa.

```sql
CREATE TABLE service_types (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug       TEXT UNIQUE NOT NULL,
  name_en    TEXT NOT NULL,
  name_es    TEXT NOT NULL,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO service_types (slug, name_en, name_es) VALUES
  ('relaxing',         'Relaxing / Anti-Stress Massage',  'Masaje Relajante / Anti-Estrés'),
  ('deep_tissue',      'Deep Tissue Massage',             'Masaje Descontracturante'),
  ('post_op',          'Post-Operative Massage',          'Masaje Post Operatorio'),
  ('lymphatic',        'Lymphatic Drainage',              'Drenaje Linfático'),
  ('sports',           'Sports Massage',                  'Masaje Deportivo'),
  ('muscle_recovery',  'Muscle Recovery',                 'Recuperación Muscular');
```

### Actualizar tabla `visits` para incluir tipo de servicio

```sql
ALTER TABLE visits
  ADD COLUMN service_type_id UUID REFERENCES service_types(id);
```
