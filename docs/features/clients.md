# Feature: Gestión de Clientes

## Descripción

Panel de administración para crear, ver y editar clientes del spa.
Solo accesible para el admin (dueña del spa).

---

## Rutas

```
/admin/clients          → listado de todos los clientes
/admin/clients/new      → formulario para crear cliente
/admin/clients/[id]     → detalle del cliente + historial
/admin/clients/[id]/qr  → página para imprimir/descargar el QR del cliente
```

---

## Datos del cliente

### Campos obligatorios

| Campo | Tipo | Validación | Notas |
|---|---|---|---|
| First name / Nombre | text | min 2 caracteres | |
| Last name / Apellido | text | min 2 caracteres | |
| Phone / Celular | text | formato US: (xxx) xxx-xxxx | Principal medio de contacto |
| Address / Dirección | text | min 5 caracteres | |

### Campos informativos (obligatorios al registrar)

| Campo | Tipo | Notas |
|---|---|---|
| How did you hear about us? / ¿Cómo supo de nosotros? | select | Ver opciones abajo |
| First massage date / Fecha del primer masaje o inscripción | date | Fecha real del primer contacto |

### Opciones "¿Cómo supo de nosotros?"

```typescript
const HOW_DID_YOU_HEAR = [
  { value: 'instagram',   en: 'Instagram',            es: 'Instagram' },
  { value: 'referral',    en: 'Referred by a friend', es: 'Recomendación de amigo/a' },
  { value: 'google',      en: 'Google',               es: 'Google' },
  { value: 'facebook',    en: 'Facebook',              es: 'Facebook' },
  { value: 'flyer',       en: 'Flyer / Poster',        es: 'Volante / Cartel' },
  { value: 'walk_in',     en: 'Walked in',             es: 'Pasé por el lugar' },
  { value: 'other',       en: 'Other',                 es: 'Otro' },
]
```

### Campos opcionales

| Campo | Tipo | Notas |
|---|---|---|
| Email | email | Para comunicaciones futuras |
| Healthcare worker | boolean | ¿Es trabajador de la salud? |
| Work ID verified | boolean | ¿Presentó badge o ID de trabajo? |
| Membership plan | select | Plan al momento del registro |
| Internal notes / Notas internas | textarea | Solo visible para el admin |

---

## Flujo al crear un cliente

1. Staff completa el formulario (campos obligatorios + informativos)
2. Se inserta en la tabla `clients`
3. Se registra la fecha del primer masaje / inscripción
4. El `qr_code` se genera automáticamente (= `id` del cliente)
5. Si seleccionó un plan → se crea la membresía y se registra el pago del primer mes
6. El sistema muestra el QR generado con opciones de descarga e impresión

---

## Listado de clientes

### Columnas

- Full name / Nombre completo
- Phone / Teléfono
- Plan (badge con nombre del plan)
- Membership status / Estado (Activa / Vencida / Sin plan)
- Expires / Vence
- Visits this month / Visitas este mes
- Member since / Miembro desde
- Actions / Acciones

### Filtros

- Por estado de membresía
- Por plan
- Por trabajador de salud
- Búsqueda por nombre o teléfono

---

## Detalle del cliente

### Secciones

1. **Personal info / Datos personales** — nombre, celular, dirección, email, cómo nos conoció, fecha primer masaje
2. **QR code** — con botones de descarga e impresión
3. **Current membership / Membresía actual** — plan, estado, vencimiento, sesiones disponibles
4. **Visit history / Historial de visitas** — tabla con fecha, hora, sesión usada
5. **Payment history / Historial de pagos** — tabla con monto, método, concepto, fecha
6. **Actions** — Registrar pago / Renovar membresía / Registrar visita

---

## Página del QR (`/admin/clients/[id]/qr`)

Página optimizada para imprimir (sin elementos de navegación):
- Logo de VM Integral Massage
- QR grande centrado
- Nombre completo del cliente
- Teléfono del spa: 407-388-4928

```tsx
import QRCode from 'react-qr-code'

<QRCode
  value={client.id}  // UUID del cliente — nunca datos sensibles
  size={256}
/>
```
