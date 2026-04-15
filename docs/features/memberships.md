# Feature: Membresías

## Descripción

Gestión de los planes de membresía de cada cliente.
En v1 existe un único plan: **Membresía Básica a USD 80/mes**.

---

## Lógica de estado

```typescript
// src/lib/utils/membership.ts

type MembershipStatus = 'active' | 'expired' | 'no_membership'

function getMembershipStatus(expiresAt: string | null): MembershipStatus {
  if (!expiresAt) return 'no_membership'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(expiresAt) >= today ? 'active' : 'expired'
}
```

**Importante:** la fuente de verdad es siempre `expires_at` comparada con `now()`.
No confiar solo en el campo `status` de la DB (puede estar desactualizado).

---

## Asignar membresía a un cliente

### Cuándo se hace

- Al recibir el primer pago del cliente
- Al renovar una membresía vencida

### Qué hace el sistema

1. Crea un registro en `memberships`:
   - `started_at` = fecha del pago
   - `expires_at` = fecha del pago + 1 mes
   - `status` = `active`
2. Crea un registro en `payments`
3. Opcionalmente registra la primera visita del día

---

## API endpoints

### `POST /api/memberships`

Crea una nueva membresía para un cliente.

**Body:**
```json
{
  "client_id": "uuid",
  "started_at": "2026-04-07",
  "payment": {
    "amount_usd": 80,
    "method": "cash",
    "concept": "monthly_membership"
  }
}
```

**Lógica:**
- Cancela la membresía anterior si existe (status = 'cancelled')
- Crea nueva membresía con expires_at = started_at + 1 mes
- Crea el pago asociado
- Responde con la membresía creada

---

## Pantalla de renovación (desde check-in)

Cuando el staff toca "Registrar pago y renovar" en la pantalla de escaneo:

```
┌─────────────────────────────────────┐
│ Renovar membresía                   │
│ Cliente: Nicolás Alves Malacre      │
│                                     │
│ Monto:   [$ 80 USD        ▼]        │
│ Método:  [Efectivo        ▼]        │
│ Fecha:   [07/04/2026      ]         │
│                                     │
│ Nueva vigencia:                     │
│ 07 abr → 07 may 2026                │
│                                     │
│      [Cancelar]  [Confirmar pago]   │
└─────────────────────────────────────┘
```

- El monto se pre-completa con USD 80 pero es editable
- La fecha de nueva vigencia se recalcula en tiempo real
- Al confirmar: se crea membresía + pago + se registra la visita del día

---

## Planes futuros (no implementar en v1)

- Membresía Premium (más de 1 masaje incluido)
- Membresía familiar
- Débito automático mensual
- Descuentos por referidos
