# Lineamientos de UI/UX y Lenguaje

## Idioma de la interfaz

**Español rioplatense** en toda la UI visible al usuario.

### Ejemplos de lenguaje correcto

```
✅ "Registrá el pago"
✅ "¿Querés renovar la membresía?"
✅ "El cliente no tiene plan activo"
✅ "Ingresá el monto"
✅ "Guardá los cambios"

❌ "Registra el pago"
❌ "¿Quieres renovar?"
❌ "Ingresar el monto"
```

### Fechas y números

- Fechas: `7 de abril de 2026` (sin cero inicial, mes en español)
- Moneda: `USD 80` (siempre USD, sin símbolo $)
- Horas: formato 24h → `14:30`

---

## Paleta de colores (Tailwind)

```
Fondo principal:    bg-white / bg-gray-50
Sidebar/nav:        bg-slate-900
Acento principal:   text-amber-600 / bg-amber-500  (dorado, tono marca del spa)
Éxito / activo:     text-green-600 / bg-green-100
Error / vencido:    text-red-600 / bg-red-100
Advertencia:        text-yellow-600 / bg-yellow-100
Texto principal:    text-gray-900
Texto secundario:   text-gray-500
```

---

## Tipografía

```
Font: Inter (Google Fonts, ya incluida en Next.js)
Jerarquía:
  - Nombre del cliente en check-in: text-3xl font-bold
  - Títulos de sección:             text-xl font-semibold
  - Texto normal:                   text-base
  - Labels y metadata:              text-sm text-gray-500
```

---

## Badges de estado de membresía

```tsx
// Activa
<span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
  Activa ✓
</span>

// Vencida
<span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
  Vencida ✗
</span>

// Sin plan
<span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-sm font-medium">
  Sin plan
</span>
```

---

## Pantalla de check-in (optimizada para tablet)

- **Resolución objetivo**: 1024×768px o similar (tablet estándar)
- Fuente mínima: 18px para texto de contenido
- Nombre del cliente: 32px o más
- Botones de acción: mínimo 52px de alto, full-width en mobile
- Sin scroll en el flujo principal de check-in
- Feedback visual inmediato (verde/rojo) al escanear

---

## Componentes reutilizables a crear

```
src/components/spa/
├── MembershipBadge.tsx     → badge de estado activa/vencida/sin plan
├── ClientCard.tsx          → tarjeta de cliente para el listado
├── QrScanner.tsx           → escáner de cámara
├── QrDisplay.tsx           → muestra el QR del cliente
├── PaymentForm.tsx         → formulario de registro de pago
├── VisitHistory.tsx        → tabla de historial de visitas
└── CheckinResult.tsx       → pantalla resultado del escaneo
```

---

## Mensajes de error comunes

```typescript
const ERROR_MESSAGES = {
  client_not_found: "No se encontró ningún cliente con ese código QR",
  camera_denied: "No se pudo acceder a la cámara. Verificá los permisos del navegador",
  network_error: "Error de conexión. Verificá el internet e intentá de nuevo",
  membership_expired: "La membresía de este cliente está vencida",
  payment_failed: "No se pudo registrar el pago. Intentá de nuevo",
} as const
```

---

## Responsive / dispositivos

| Vista | Dispositivo | Uso |
|---|---|---|
| `/scan` | Tablet (landscape) | Recepción del spa |
| `/admin/*` | Desktop o tablet | Gestión del sistema |
| QR del cliente | Celular del cliente | Solo muestra su QR |
