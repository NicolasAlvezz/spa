# Informe de Entrega Final
## Sistema de Gestión — VM Integral Massage Inc.

---

## Introducción

Este documento describe el sistema de gestión digital desarrollado especialmente para **VM Integral Massage Inc.**. El objetivo principal fue reemplazar el registro manual en papel por una plataforma digital moderna que permita al personal del spa atender a los clientes de forma más rápida, ordenada y profesional.

El sistema funciona desde cualquier dispositivo con internet (computadora, tablet o celular) y está disponible en **inglés y español**.

---

## ¿Qué problema resuelve?

Antes del sistema, el spa manejaba los clientes, membresías y pagos de forma manual. Esto generaba:

- Dificultad para saber rápidamente si un cliente tenía membresía activa o vencida
- Pérdida de tiempo buscando información del cliente en el momento de la visita
- Falta de registro ordenado de pagos y sesiones utilizadas
- Sin acceso a estadísticas reales del negocio

Con este sistema, **toda esa información está disponible en segundos**, con solo escanear un código QR.

---

## ¿Cómo funciona? — El flujo principal

### 1. Registro del cliente
Cuando llega un cliente nuevo, el personal ingresa sus datos en el sistema:
- Nombre y apellido
- Número de celular
- Dirección
- Cómo se enteró del spa
- Si es trabajador de la salud
- Plan de membresía elegido

El sistema genera automáticamente un **código QR único** para ese cliente. Este código puede imprimirse para que el cliente lo lleve en su billetera o cartera.

---

### 2. Llegada del cliente — Escaneo del QR

Cuando el cliente llega al spa, el personal usa la **tablet de recepción** para escanear el código QR del cliente. En menos de un segundo, aparece en pantalla toda la información relevante:

- Nombre completo del cliente
- Estado de la membresía: **activa** o **vencida**
- Cuántas sesiones le quedan en el mes
- Historial de visitas recientes

Dependiendo del estado, el sistema ofrece distintas opciones:

| Situación | Lo que hace el sistema |
|---|---|
| Membresía activa con sesiones disponibles | Registra la visita con un solo clic |
| Membresía activa sin sesiones | Permite cobrar una sesión adicional |
| Membresía vencida | Permite renovar y cobrar en el momento |
| Cliente sin membresía | Permite asignar un plan o registrar un servicio individual |

---

### 3. Registro de la visita

Al confirmar la entrada del cliente, el personal selecciona:
- El tipo de masaje o servicio recibido (relajante, descontracturante, post-operatorio, etc.)
- El método de pago: **efectivo, débito o crédito**

Todo queda registrado automáticamente con fecha y hora.

---

### 4. Portal del cliente (acceso personal)

Cada cliente puede acceder a su propio espacio digital desde su celular. Allí puede ver:
- Su código QR personal
- Su plan de membresía actual y sesiones restantes
- Su historial de visitas
- El próximo turno agendado
- Un botón directo para agendar un nuevo turno

El acceso se realiza ingresando nombre y número de celular — **sin necesidad de contraseña ni correo electrónico**.

---

## Panel de administración — Lo que ve el personal

### Dashboard principal
Al abrir el sistema, el personal ve un resumen del día:
- Cuántos clientes activos hay en total
- Cuántas visitas se registraron este mes
- Cuántos ingresos se generaron este mes
- Cuántos clientes están próximos a vencer la membresía

También aparece el **calendario del día** con los turnos programados.

---

### Gestión de clientes
El personal puede:
- Ver la lista completa de todos los clientes
- Buscar un cliente por nombre o teléfono
- Ver el perfil completo de cada cliente (datos, membresía, visitas, pagos)
- Editar información del cliente si algo cambia
- Imprimir el código QR del cliente
- Enviar una invitación al cliente para que acceda a su portal personal
- Desactivar un cliente si ya no frecuenta el spa

---

### Gestión de membresías
El sistema maneja dos tipos de planes:

**Planes mensuales:** Se renuevan cada mes. Si el cliente no usó todas las sesiones incluidas, el sistema puede trasladar las sesiones no utilizadas al mes siguiente (rollover).

**Packs de sesiones:** El cliente paga un paquete de sesiones que puede usar sin fecha límite. Las sesiones no vencen con el mes.

En ambos casos, el sistema lleva el conteo exacto de sesiones usadas y disponibles.

---

### Estadísticas del negocio
Hay una sección de estadísticas completas que permite ver el rendimiento del spa en diferentes períodos (este mes, este año, o desde siempre):

- **Ingresos totales** y cómo se distribuyeron (por tipo de servicio, por método de pago)
- **Gráfico de ingresos** de los últimos 12 meses
- **Clientes activos, vencidos y sin plan**
- **Visitas por tipo de masaje**
- **Distribución de planes** (cuántos clientes tiene cada plan)
- **Clientes nuevos** por mes durante el último año

---

## Seguridad y acceso

El sistema tiene dos tipos de usuarios con accesos completamente separados:

| Tipo | Quién | Qué puede hacer |
|---|---|---|
| **Administrador** | El personal del spa | Todo: ver y editar clientes, registrar visitas, cobros, estadísticas |
| **Cliente** | Los clientes del spa | Solo ver su propia información: QR, sesiones, visitas, turno |

Ningún cliente puede ver información de otro cliente. La base de datos está protegida con reglas de seguridad que lo impiden a nivel técnico.

---

## Idiomas

Todo el sistema está disponible en **inglés y español**. El cliente puede elegir el idioma desde su portal. El panel de administración también soporta ambos idiomas.

---

## Resumen de lo que fue desarrollado

| Componente | Descripción |
|---|---|
| Portal del cliente | Código QR, sesiones, visitas, turno próximo, reserva de turno |
| Panel de administración | Dashboard, clientes, escaneo QR, membresías, pagos, estadísticas |
| Escaneo de QR | Detección en tiempo real desde cámara de tablet o celular |
| Gestión de membresías | Planes mensuales, packs, renovación, rollover, sesiones adicionales |
| Registro de visitas | Por tipo de servicio, con método de pago |
| Historial de pagos | Registro completo por cliente |
| Estadísticas | Ingresos, clientes, visitas, membresías — filtrables por período |
| Bilingüe | Inglés y español en toda la plataforma |
| Seguridad | Accesos separados, datos protegidos por cliente |

---

## Planes de membresía configurados

| Plan | Precio | Incluye |
|---|---|---|
| Healthcare Relief – Basic | USD 80/mes | 1 masaje de 60 min · adicionales a $80 |
| Healthcare 95 | USD 95/mes | 1 masaje 60 min + Aromaterapia + Hot Stones + Recuperación muscular |

Ambos planes están pensados para trabajadores de la salud con un compromiso mínimo de 3 meses.

---

## Tecnología utilizada

Sin entrar en detalles técnicos, el sistema fue construido con tecnologías modernas y confiables utilizadas por empresas de todo el mundo. Funciona en la nube, lo que significa que:

- No requiere instalar ningún programa
- Los datos están siempre respaldados automáticamente
- Puede usarse desde cualquier dispositivo con internet
- Las actualizaciones se aplican sin interrumpir el servicio

---

## Funcionalidades planificadas para versiones futuras

Las siguientes funcionalidades fueron identificadas durante el desarrollo como mejoras valiosas para el negocio, pero quedaron fuera del alcance de esta primera versión. Pueden implementarse en etapas futuras:

- Cobro automático mensual (débito automático a tarjeta)
- Notificaciones automáticas por WhatsApp, email o SMS cuando la membresía está por vencer
- Dashboard de reportes de ingresos más detallado y exportable
- Seguimiento de series de tratamiento (ej: 15 sesiones post-operatorio)
- Rol de "Staff" separado del "Admin" con permisos reducidos
- Sistema de descuentos o promociones
- Integración con agenda / calendario de turnos propio del spa

---

*Documento elaborado como entrega final del sistema de gestión digital de VM Integral Massage Inc.*
