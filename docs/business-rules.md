# Reglas de Negocio — VM Integral Massage Inc.

> **Este archivo es la fuente de verdad para toda la lógica de negocio.**
> Ante cualquier duda sobre cómo debe comportarse el sistema, consultar aquí primero.

---

## Datos del negocio

| Atributo | Valor |
|---|---|
| Nombre legal | VM Integral Massage Inc. |
| Ubicación | Estados Unidos (Florida) |
| Teléfono | 407-388-4928 |
| Instagram | @vm.integralmassage |
| Idiomas operativos | Inglés y Español (ver `/docs/i18n.md`) |

---

## Planes de membresía

### Plan 1 — Healthcare Relief Basic (Básico)

| Atributo | Valor |
|---|---|
| Precio | USD 80 / mes |
| Target | Trabajadores de la salud |
| Masaje incluido | 1 masaje de 60 minutos por mes |
| Masajes adicionales | USD 80 c/u |
| Enfoque | Estrés, tensión y dolor muscular |
| Oferta bienvenida | Primer masaje a USD 70 (con membresía activa, cupos limitados) |

### Plan 2 — Healthcare 95

| Atributo | Valor |
|---|---|
| Precio | USD 95 / mes |
| Target | Trabajadores de la salud |
| Masaje incluido | 1 masaje de 60 minutos por mes |
| Extras incluidos | Aromaterapia + Hot Stones + Tecnología de recuperación muscular |
| Oferta bienvenida | Primer masaje a USD 70 (con membresía activa, cupos limitados) |

> **Nota:** El sistema debe soportar múltiples planes sin cambios de código
> (solo nuevos registros en la tabla `membership_plans`).

---

## ¿Quién califica para planes Healthcare?

- Enfermeras / Nurses
- Doctores / Doctors
- Técnicos médicos / Medical Technicians
- Terapeutas / Therapists
- Personal de hospital o clínica / Hospital or clinic staff

> Se puede solicitar ID o badge de trabajo como verificación.
> El sistema debe permitir marcar si el cliente presentó verificación.

---

## Reglas generales de membresía

- **Pago mensual automático** (a futuro — en v1 es registro manual)
- **Membresía mínima de 3 meses** — el cliente se compromete al inscribirse
- **1 sesión incluida por mes** — no acumulable; rollover máximo de 1 mes
- **Cancelaciones** requieren mínimo 24 horas de aviso
- **No reembolsable**

---

## Rollover de sesiones (regla importante)

- Si el cliente no usa su sesión mensual, puede trasladarla al mes siguiente (solo 1 mes)
- Máximo 2 sesiones acumuladas en cualquier momento
- Las sesiones no usadas más allá del rollover se pierden
- El sistema debe rastrear si hay sesión pendiente de rollover

---

## Estados de una membresía

```
ACTIVE      → expires_at >= today  y  status = 'active'
EXPIRED     → expires_at < today
CANCELLED   → cancelada por el cliente o el admin
NO_PLAN     → el cliente existe pero nunca tuvo membresía
```

---

## Reglas de vencimiento

- La membresía dura exactamente 1 mes calendario desde la fecha de inicio
- Si el cliente renueva con membresía vencida, el nuevo período empieza desde el día del pago
- Si renueva antes de que venza, el nuevo período empieza desde la fecha de vencimiento actual

---

## Precio sin membresía

- Masaje regular sin membresía: USD 100
- En otros spas: USD 130–150

---

## Flujo de check-in (escaneo QR)

Al escanear el QR de un cliente, mostrar en la tablet:

### Membresía activa
- Nombre completo del cliente
- Plan activo y precio
- Estado: ACTIVE con fecha de vencimiento
- Sesiones usadas este mes (ej: 1 / 1)
- Sesión de rollover disponible si aplica
- Historial de visitas del mes
- Botón "Register Visit" / "Renovar membresía"

### Membresía vencida
- Nombre completo
- Estado: EXPIRED con fecha en que venció
- Botón "Renew Membership"

---

## Roles de acceso

| Rol | Acceso |
|---|---|
| Admin (dueña del spa) | Todo el sistema |
| Staff | Pantalla de check-in + registro de pagos |
| Cliente | Solo su QR (sin login en v1) |

> En v1 solo existe el rol Admin.
