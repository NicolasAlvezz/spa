# Stack Tecnológico

## Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 14 (App Router) | Framework principal |
| React | 18 | UI |
| TypeScript | 5 | Tipado estricto |
| Tailwind CSS | 3 | Estilos |
| shadcn/ui | latest | Componentes base |
| react-qr-code | latest | Generación de QR |
| @zxing/library | latest | Escaneo QR desde cámara |

## Backend / Servicios

| Servicio | Uso | Costo aprox. |
|---|---|---|
| Supabase | Base de datos (PostgreSQL) + Auth + Storage | USD 25–30/mes |
| Vercel | Hosting + deploy automático | USD 0–20/mes |

**Total infraestructura estimada: USD 25–50/mes**

> Nota: estos son valores de referencia. Pueden variar según el plan contratado
> y el volumen de uso. Son los servicios estándar usados en este tipo de proyecto.

## Variables de entorno requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

## Comandos útiles

```bash
# Desarrollo local
npm run dev

# Build producción
npm run build

# Supabase local
npx supabase start
npx supabase db reset

# Generar tipos desde Supabase
npx supabase gen types typescript --local > src/types/database.ts
```

## Convenciones de archivos

```
src/
├── app/
│   ├── (admin)/           ← rutas del panel de administración
│   │   ├── clients/
│   │   ├── memberships/
│   │   └── payments/
│   ├── scan/              ← pantalla de escaneo QR (tablet)
│   └── api/               ← API routes de Next.js
├── components/
│   ├── ui/                ← componentes shadcn (no modificar)
│   └── spa/               ← componentes propios del proyecto
├── lib/
│   ├── supabase/
│   │   ├── client.ts      ← cliente browser
│   │   ├── server.ts      ← cliente server-side
│   │   └── queries/       ← queries organizadas por entidad
│   └── utils/
│       ├── dates.ts       ← helpers de fechas
│       └── membership.ts  ← lógica de estado de membresía
└── types/
    ├── database.ts        ← generado por Supabase CLI
    └── index.ts           ← tipos propios del dominio
```
