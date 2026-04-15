# Guía de Inicio Rápido

## Para Claude Code: cómo arrancar el proyecto desde cero

---

## Paso 1 — Leer el contexto (siempre primero)

```
CLAUDE.md                        ← resumen general y reglas
docs/business-rules.md           ← lógica de negocio (fuente de verdad)
docs/stack.md                    ← tecnologías a usar
docs/database-schema.md          ← estructura de la DB
```

---

## Paso 2 — Inicializar el proyecto

```bash
# Crear proyecto Next.js
npx create-next-app@14 spa-membership-system \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd spa-membership-system

# Instalar dependencias
npm install @supabase/supabase-js @supabase/ssr
npm install react-qr-code @zxing/library
npm install date-fns

# shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button input label badge table dialog form
```

---

## Paso 3 — Configurar Supabase

```bash
# Instalar CLI de Supabase
npm install -D supabase

# Inicializar
npx supabase init

# Correr localmente
npx supabase start
```

Luego copiar la migración inicial de `docs/database-schema.md`
a `supabase/migrations/001_initial_schema.sql` y correr:

```bash
npx supabase db reset
```

---

## Paso 4 — Variables de entorno

Crear `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clave del supabase start>
SUPABASE_SERVICE_ROLE_KEY=<clave del supabase start>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Paso 5 — Orden de implementación recomendado

```
1. [ ] Configuración base (Supabase client, tipos TS)
2. [ ] Migración DB inicial
3. [ ] Auth básico (login para el admin)
4. [ ] CRUD de clientes (crear, listar, ver detalle)
5. [ ] Generación y display del QR
6. [ ] Pantalla de escaneo (/scan)
7. [ ] API de check-in (/api/clients/[uuid]/checkin)
8. [ ] Registro de visitas
9. [ ] Registro de pagos y renovación de membresía
10. [ ] Historial de visitas y pagos en detalle del cliente
11. [ ] Impresión/descarga del QR
```

---

## Archivos a crear primero

```
src/lib/supabase/client.ts       ← cliente para componentes (browser)
src/lib/supabase/server.ts       ← cliente para Server Components y API routes
src/types/index.ts               ← tipos del dominio (Client, Membership, etc.)
src/lib/utils/membership.ts      ← getMembershipStatus()
src/lib/utils/dates.ts           ← formatDate(), addOneMonth()
```

---

## Tipos del dominio a definir

```typescript
// src/types/index.ts

export type MembershipStatus = 'active' | 'expired' | 'no_membership'
export type PaymentMethod = 'cash' | 'debit' | 'credit'
export type PaymentConcept = 'monthly_membership' | 'additional_visit'

export interface Client {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  notes: string | null
  qr_code: string
  created_at: string
}

export interface Membership {
  id: string
  client_id: string
  plan_name: string
  price_usd: number
  started_at: string
  expires_at: string
  status: 'active' | 'expired' | 'cancelled'
}

export interface Visit {
  id: string
  client_id: string
  membership_id: string | null
  visited_at: string
  notes: string | null
}

export interface Payment {
  id: string
  client_id: string
  membership_id: string | null
  amount_usd: number
  method: PaymentMethod
  concept: PaymentConcept
  paid_at: string
  notes: string | null
}

// Resultado del check-in (respuesta de la API)
export interface CheckinResult {
  client: Client
  membership: Membership | null
  membership_status: MembershipStatus
  visits_this_month: number
  recent_visits: string[]
  last_payment: Payment | null
}
```
