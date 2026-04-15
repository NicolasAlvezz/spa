# VM Integral Massage Inc. — Contexto del Proyecto

## Resumen ejecutivo

Sistema de gestión de membresías, clientes, pagos y asistencia para
**VM Integral Massage Inc.**, spa terapéutico ubicado en Kissimmee, Florida, EE.UU.
Fundado en 2021 por **Maria Victoria Malacre**, con más de 17 años de experiencia.

El sistema permite al staff escanear el QR de cada cliente desde una tablet y ver
instantáneamente su estado de membresía, historial de visitas y pagos.
La interfaz es **bilingüe: inglés y español**.

---

## Reglas generales para Claude Code

- **Idioma del código**: inglés (variables, funciones, comentarios)
- **Idioma de la UI**: inglés por defecto, soporte completo español (`next-intl`)
- **Stack**: Next.js 14 App Router + Supabase + Vercel
- **Estilos**: Tailwind CSS — sin CSS custom salvo excepciones
- **No inventar**: si algo no está en `/docs/`, preguntar antes de asumir
- **Siempre tipar**: TypeScript estricto, sin `any`
- **Nunca hardcodear strings de UI** — usar siempre `next-intl`

---

## Mapa de documentación

```
CLAUDE.md                        ← este archivo (leer siempre primero)
docs/
├── business-info.md             ← datos reales del negocio: dueña, dirección, horarios, servicios
├── business-rules.md            ← reglas de negocio y planes de membresía (fuente de verdad)
├── stack.md                     ← tecnologías, versiones, servicios externos
├── database-schema.md           ← esquema completo con migración SQL lista
├── i18n.md                      ← sistema bilingüe EN/ES con todas las traducciones
├── ui-ux.md                     ← lineamientos de diseño, colores, tipografía
├── quickstart.md                ← cómo arrancar el proyecto desde cero
└── features/
    ├── qr-scan.md               ← flujo de escaneo QR (feature principal)
    ├── clients.md               ← gestión de clientes y campos del formulario
    ├── memberships.md           ← lógica de membresías y renovación
    └── payments.md              ← registro de pagos
```

---

## Datos del negocio (resumen rápido)

| | |
|---|---|
| Nombre | VM Integral Massage Inc. |
| Dueña | Maria Victoria Malacre |
| Ciudad | Kissimmee, Florida, EE.UU. |
| Teléfono | +1 407-388-4928 | ✅ Confirmado |
| Email | info@vmintegralmassage.com |
| Web | https://vmintegralmassage.com |
| Instagram | @vm.integralmassage |
| TikTok | @vm.integralmassage |
| Horario | Lun–Vie 8am–7pm · Sáb 8am–2pm · Dom cerrado |

> Ver todos los datos en `docs/business-info.md`

---

## Planes de membresía activos

| Plan | Precio | Incluye |
|---|---|---|
| Healthcare Relief – Basic | USD 80/mes | 1 masaje 60min · adicionales a $80 |
| Healthcare 95 | USD 95/mes | 1 masaje 60min + Aromaterapia + Hot Stones + Recuperación muscular |

Ambos planes son exclusivos para trabajadores de la salud (mínimo 3 meses de compromiso).

---

## Servicios del spa

| Slug | Español | English |
|---|---|---|
| `relaxing` | Masaje Relajante / Anti-Estrés | Relaxing / Anti-Stress Massage |
| `deep_tissue` | Masaje Descontracturante | Deep Tissue Massage |
| `post_op` | Masaje Post Operatorio | Post-Operative Massage |
| `lymphatic` | Drenaje Linfático | Lymphatic Drainage |
| `sports` | Masaje Deportivo | Sports Massage |
| `muscle_recovery` | Recuperación Muscular | Muscle Recovery |

---

## Datos requeridos al registrar un cliente

**Obligatorios:** nombre, apellido, celular, dirección
**Informativos:** cómo supo del spa, fecha del primer masaje o inscripción
**Opcionales:** email, si es trabajador de salud, ID verificado, notas internas

---

## Flujo principal

1. Staff registra cliente con datos + plan elegido
2. Sistema genera QR único (UUID del cliente)
3. Cliente llega → staff escanea QR desde tablet en recepción
4. Sistema muestra: nombre, plan, estado (activa/vencida), sesiones del mes, visitas
5. Si activa → registra visita | Si vencida → permite renovar y cobrar en el momento

---

## Decisiones ya tomadas

| Decisión | Motivo |
|---|---|
| Web app (no app nativa) | Evita App Store, más fácil para el cliente |
| QR en perfil del cliente | Staff escanea desde tablet |
| Supabase | Auth + DB + RLS integrados |
| Vercel | Deploy automático, integración Next.js |
| `next-intl` | i18n estándar en ecosistema Next.js |
| Inglés por defecto | Negocio en EE.UU. |
| Tabla `service_types` | Cada visita registra qué tipo de masaje recibió el cliente |

---

## Pendiente para versiones futuras (no implementar en v1)

- [ ] Cobro automático / débito automático mensual
- [ ] Notificaciones (WhatsApp / email / SMS) de vencimiento
- [ ] Dashboard analítico con reportes de ingresos
- [ ] Seguimiento de series de tratamiento (ej: 15 sesiones post-op)
- [ ] Rol Staff separado del Admin
- [ ] Sistema de descuentos o promociones
- [ ] Integración con agenda / calendario de citas
