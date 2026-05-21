## Why

Actualmente, Food Store no cuenta con una pantalla de cocina dedicada ni con un rol operativo de cocina (`COCINA`). La gestión de preparación y despacho de pedidos está centralizada en el Gestor de Pedidos, lo que limita la operatividad de negocios reales de e-commerce y delivery, donde la cocina necesita una interfaz ágil en tiempo real para visualizar, tomar y despachar los platos a preparar sin interferir con la logística general del restaurante.

## What Changes

- **Nuevo Rol Operativo (COCINA)**: Se introduce el rol humano `COCINA` en el RBAC del sistema para cocineros. Es de solo lectura para el catálogo y solo escritura para las transiciones del ciclo de preparación.
- **Display de Cocina (KDS) en Tiempo Real**: Creación de una pantalla dedicada en `/cocina` que recibe de forma reactiva (vía Server-Sent Events - SSE) los pedidos confirmados por pago, permitiendo al cocinero avanzar su preparación sin recargar la pantalla.
- **Modificación de Autorizaciones FSM**: El rol `COCINA` queda facultado en el backend para ejecutar las transiciones `CONFIRMADO → EN_PREP` (iniciar preparación) y `EN_PREP → EN_CAMINO` (marcar como terminado), bloqueando cualquier otra transición.
- **Auditoría y Trazabilidad**: Todo avance de estado realizado por cocina se registra automáticamente en `HistorialEstadoPedido` guardando el ID del cocinero que lo procesó.
- **Persistencia de Notas de Cliente (Parche de Base de Datos)**: **BREAKING** - Se agrega el campo `notas` a la tabla `pedido` en la base de datos (con su respectiva migración de Alembic) para persistir las especificaciones de cocina del cliente que actualmente se pierden.
- **Control de Disponibilidad Rápido**: El cocinero podrá marcar temporalmente un producto como no disponible (`disponible = false`) en el catálogo desde la interfaz, sin alterar el stock.

## Capabilities

### New Capabilities
- `display-cocina`: Implementación del display de cocina en tiempo real (KDS) con Server-Sent Events (SSE), resiliencia de desconexión por polling, alertas visuales/sonoras de nuevos pedidos y cálculo reactivo en el cliente del timer de urgencia según el tiempo transcurrido desde la entrada a cocina.

### Modified Capabilities
- `pedidos`: Actualización del FSM y de la capa de servicios/rutas para autorizar el avance de transiciones a `COCINA` y registrar la auditoría correspondiente.
- `productos`: Habilitar al rol `COCINA` para modificar la disponibilidad de productos en el catálogo.
- `seed-system`: Incorporar el nuevo rol `COCINA` y un usuario de prueba de cocina (`cocina@foodstore.com`) en las semillas del sistema.

## Impact

- **Base de Datos**: Nueva columna `notas` (TEXT, nullable) en la tabla `pedido`, y nueva fila `COCINA` en la tabla `rol`.
- **Backend (FastAPI)**:
  - Nueva ruta SSE `/api/v1/cocina/events` y servicio pub/sub en proceso para notificar cambios de estado en tiempo real.
  - Nuevo endpoint `/api/v1/cocina/pedidos` (REST de respaldo) y endpoints de control de disponibilidad.
  - Modificación del servicio del FSM (`PedidoService.avanzar_estado`) para autorizar a `COCINA` y propagar eventos en tiempo real post-commit.
- **Frontend (React)**:
  - Nueva ruta protegida `/cocina` (para `ADMIN`, `PEDIDOS`, `COCINA`).
  - Nuevo menú y enlace rápido en el encabezado `ClientHeader` para acceso rápido al KDS.
  - Componente KDS con dos columnas reactivas ("Por preparar" / "En preparación"), lógica de alerta sonora (Web Audio API) y semáforo visual de urgencia (verde/naranja/rojo) según RN-CO07.
