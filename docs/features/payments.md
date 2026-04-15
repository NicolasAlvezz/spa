# Feature: Registro de Pagos

## Descripción

Toda transacción económica queda registrada en el sistema.
No hay integración de cobro online en v1 — es solo registro manual.

---

## Tipos de pago (concepto)

| Concepto | Monto habitual | Descripción |
|---|---|---|
| `monthly_membership` | USD 80 | Cuota mensual — incluye 1 masaje |
| `additional_visit` | USD 80 | Visita extra dentro del mes de membresía |

> El masaje sin membresía cuesta USD 100, pero ese caso no se registra en el sistema
> (el cliente no estaría en el sistema si no tiene membresía).

---

## Métodos de pago aceptados

```typescript
type PaymentMethod = 'cash' | 'debit' | 'credit'
```

| Valor | Label en UI |
|---|---|
| `cash` | Efectivo |
| `debit` | Débito |
| `credit` | Crédito |

---

## Flujos de registro de pago

### Flujo 1: Renovación desde check-in (más común)

1. Staff escanea QR → membresía vencida
2. Toca "Registrar pago y renovar"
3. Completa formulario (monto, método, fecha)
4. Sistema crea: membresía nueva + pago + visita del día
5. Muestra confirmación con nueva fecha de vencimiento

### Flujo 2: Visita adicional desde check-in

1. Staff escanea QR → membresía activa
2. Toca "Registrar visita"
3. Si es la 2da+ visita del mes, el sistema pregunta si cobrar visita adicional
4. Staff confirma → se registra visita + pago opcional

### Flujo 3: Registro manual desde panel admin

1. Admin va a `/admin/clients/[id]`
2. Toca "Registrar pago"
3. Selecciona concepto (membresía o visita adicional)
4. Completa monto, método y fecha
5. Sistema registra el pago

---

## API endpoint: `POST /api/payments`

```json
{
  "client_id": "uuid",
  "membership_id": "uuid",        // opcional
  "amount_usd": 80,
  "method": "cash",
  "concept": "monthly_membership",
  "paid_at": "2026-04-07",        // opcional, default: hoy
  "notes": "Pagó con un billete de 100"  // opcional
}
```

---

## Historial de pagos

En el detalle del cliente se muestra una tabla con todos los pagos:

| Fecha | Concepto | Método | Monto |
|---|---|---|---|
| 07/04/2026 | Membresía mensual | Efectivo | USD 80 |
| 07/03/2026 | Membresía mensual | Débito | USD 80 |
| 01/03/2026 | Visita adicional | Efectivo | USD 80 |

---

## Notas importantes

- **No hay reembolsos en v1** — si hay un error, el admin puede agregar una nota al pago
- **No hay integración con procesadores de pago** (Stripe, MercadoPago, etc.) en v1
- Los pagos registrados **no se pueden eliminar** (solo el admin puede agregar notas)
- El sistema no valida que el monto sea correcto — confía en el staff
