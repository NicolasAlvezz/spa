# Feature: Escaneo QR

## Descripción

La pantalla de escaneo es la funcionalidad principal del sistema.
Se usa desde una tablet en recepción cada vez que un cliente llega al spa.

---

## Ruta

```
/scan
```

Esta ruta es pública (no requiere login) para facilitar el uso desde la tablet
sin tener que autenticarse cada vez. En el futuro puede protegerse con PIN.

---

## Flujo técnico

```
1. Tablet abre /scan
2. Se activa la cámara del dispositivo
3. Staff apunta la cámara al QR del cliente
4. @zxing/library detecta y decodifica el QR → obtiene UUID del cliente
5. Se hace fetch a /api/clients/[uuid]/checkin
6. La API devuelve los datos del cliente + estado de membresía
7. Se muestra la UI de check-in con la información
8. Staff confirma → se registra la visita en la DB
```

---

## API endpoint: `GET /api/clients/[uuid]/checkin`

### Response exitosa (membresía activa)

```json
{
  "client": {
    "id": "uuid",
    "full_name": "Nicolás Alves Malacre",
    "phone": "+598 99 123 456"
  },
  "membership": {
    "plan_name": "Básica",
    "price_usd": 80,
    "started_at": "2026-04-01",
    "expires_at": "2026-05-01",
    "status": "active"
  },
  "visits_this_month": 1,
  "recent_visits": [
    "2026-04-01T10:30:00Z"
  ],
  "last_payment": {
    "amount_usd": 80,
    "method": "cash",
    "paid_at": "2026-04-01"
  }
}
```

### Response con membresía vencida

```json
{
  "client": { ... },
  "membership": {
    "status": "expired",
    "expires_at": "2026-03-01"
  },
  "visits_this_month": 0,
  "recent_visits": []
}
```

### Response cliente sin membresía

```json
{
  "client": { ... },
  "membership": null,
  "visits_this_month": 0,
  "recent_visits": []
}
```

### Response cliente no encontrado

```json
{ "error": "Cliente no encontrado" }
```
HTTP 404

---

## API endpoint: `POST /api/visits`

Registra una visita luego de confirmar el check-in.

### Body

```json
{
  "client_id": "uuid",
  "membership_id": "uuid"
}
```

### Response

```json
{
  "visit_id": "uuid",
  "visited_at": "2026-04-07T15:45:00Z"
}
```

---

## Componente: `<QrScanner />`

```tsx
// src/components/spa/QrScanner.tsx
// Usa @zxing/library para acceder a la cámara
// Props:
//   onScan: (uuid: string) => void
//   onError: (error: Error) => void
```

**Consideraciones:**
- Solo funciona en HTTPS (requerimiento del browser para acceder a la cámara)
- En localhost funciona igual (excepción del browser)
- Mostrar mensaje claro si el browser no permite acceso a la cámara
- La tablet debe tener cámara trasera disponible

---

## UI States de la pantalla `/scan`

```
IDLE          → Cámara activa, esperando QR
SCANNING      → Procesando QR detectado (spinner breve)
LOADING       → Fetch a la API (spinner)
FOUND_ACTIVE  → Cliente con membresía activa → botón "Registrar visita"
FOUND_EXPIRED → Cliente con membresía vencida → botón "Registrar pago"
NOT_FOUND     → QR inválido o cliente no existe → mensaje de error
ERROR         → Error de red u otro → mensaje + botón reintentar
SUCCESS       → Visita registrada → confirmación → vuelve a IDLE en 3s
```

---

## Notas de diseño para tablet

- Fuente grande (mínimo 18px para texto normal, 28px+ para nombre del cliente)
- Botones grandes con área de toque generosa (mínimo 48px de alto)
- Contraste alto: el ambiente del spa puede tener poca luz
- Sin scroll si es posible — toda la info visible en una pantalla
- El estado de membresía debe ser inmediatamente visible (verde / rojo)

---

## Distinción importante: QR del local vs. QR del cliente

| | QR del local (actual) | QR del cliente (nuevo sistema) |
|---|---|---|
| **Apunta a** | Perfil de Booksy del spa | UUID único del cliente en nuestra DB |
| **Uso** | Clientes escanean para reservar turno | Staff escanea para identificar al cliente |
| **Quién escanea** | El cliente con su celular | El staff con la tablet del spa |
| **Generado por** | Booksy | Nuestro sistema |

> No confundir ni mezclar estos dos QRs. El QR físico que está hoy en el local
> es de Booksy. Los QRs del nuevo sistema son por cliente e internos al sistema.
