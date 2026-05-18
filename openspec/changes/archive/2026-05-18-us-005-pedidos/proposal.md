## Why

Actualmente, los clientes de Food Store pueden armar su carrito de compras de forma interactiva y persistente, pero no cuentan con mecanismos para registrar sus direcciones de entrega ni para consolidar su carrito en un pedido real con trazabilidad transaccional. La falta de un flujo de pedidos impide la monetización a través de MercadoPago, la validación de stock concurrente y la gestión operativa en cocina y logística, limitando la aplicación a un catálogo estático.

## What Changes

- **Gestión de Direcciones de Entrega (CRUD)**: 
  - Creación de un módulo de direcciones con endpoints `GET`, `POST`, `PUT`, `DELETE` y `PATCH /principal` para configurar alias, calle, número, depto, ciudad y código postal.
  - Regla de negocio `RN-DI01`: La primera dirección agregada por el cliente se marca automáticamente como predeterminada (`es_principal = true`). Al marcar una nueva dirección como principal, el sistema desmarca de forma atómica la anterior.
- **Creación Atómica de Pedidos (UoW & Snapshot Pattern)**:
  - Implementación del endpoint `POST /api/v1/pedidos` para consolidar el pedido del cliente a partir de su carrito de compras en una única transacción de base de datos.
  - Uso de **Unit of Work (UoW)** para garantizar que la creación sea 100% atómica.
  - Bloqueo transaccional (`SELECT FOR UPDATE`) para validación y reserva de stock concurrente.
  - Snapshot de inmutabilidad `RN-DA06`: Copia del precio base (`precio_snapshot`), nombre (`nombre_snapshot`) y detalles del plato en la tabla `DetallePedido`, previniendo que futuras modificaciones en el catálogo alteren los registros históricos de facturación del cliente.
  - Snapshot de dirección de entrega (`direccion_snapshot`) guardado directamente en el registro del `Pedido` para congelar los datos geográficos de envío.
- **Máquina de Estados de Pedidos (FSM de 6 estados)**:
  - Implementación del flujo FSM de 6 estados: `PENDIENTE` -> `CONFIRMADO` -> `EN_PREP` -> `EN_CAMINO` -> `ENTREGADO` / `CANCELADO`.
  - Validación estricta del mapa de transiciones en la capa de `Service`. Los estados terminales (`ENTREGADO` y `CANCELADO`) no admiten transiciones salientes (`RN-01`).
  - La cancelación del pedido requiere de forma obligatoria registrar un motivo (`RN-05`) y restaura el stock reservado de ingredientes en la base de datos de manera atómica.
- **Historial de Trazabilidad Append-Only**:
  - Registro de cambios de estado en `HistorialEstadoPedido`. Cumplimiento estricto de la regla `RN-03`: La tabla es de solo adición (append-only), prohibiendo operaciones de `UPDATE` o `DELETE`.
  - El primer registro de historial tiene `estado_desde = NULL` (`RN-02`).
- **Integración de Webhook de Pagos (MercadoPago)**:
  - Endpoint `POST /api/v1/pagos/webhook` público para recibir notificaciones IPN, procesar el pago, generar el registro de `Pago` con `idempotency_key` y avanzar el pedido automáticamente de `PENDIENTE` a `CONFIRMADO` de forma atómica.
- **Paneles Reactivos (Frontend)**:
  - Interfaz de "Mis Direcciones" para clientes con marcación predeterminada.
  - Interfaz de Checkout integrada para confirmación del pedido y pasarela de pago.
  - Historial de pedidos interactivo y línea de tiempo (timeline) reactiva para que el cliente rastree su pedido en tiempo real.
  - Panel operativo de "Gestión de Pedidos" para administradores y gestores (roles `ADMIN`/`PEDIDOS`) para avanzar los estados de cocina y logística.

## Capabilities

### New Capabilities
- `direcciones`: CRUD completo de direcciones de entrega del cliente en el backend y frontend, con soporte para alias y dirección predeterminada única.
- `pedidos`: Creación transaccional de pedidos (UoW, snapshots de precio y dirección), máquina de estados FSM de 6 niveles, auditoría append-only, rollback de stock en cancelación y panels interactivos de usuario y operador.

### Modified Capabilities
- `productos`: El stock se descontará transaccionalmente al crearse el pedido y se reintegrará al catálogo de forma atómica si el pedido es cancelado.

## Impact

- **Backend**:
  - Creación de las carpetas de módulos `backend/app/modules/direcciones/` y expansión de `backend/app/modules/pedidos/`.
  - Adición de las tablas `DireccionEntrega`, `Pedido`, `DetallePedido`, `HistorialEstadoPedido` y `Pago` al esquema físico de la base de datos mediante una migración de Alembic.
  - Modificación del Unit of Work (`backend/app/core/uow.py`) para registrar e instanciar los nuevos repositorios de direcciones y pedidos.
  - Integración de SlowAPI en el webhook de pagos para evitar spam de MercadoPago.
- **Frontend**:
  - Adición de páginas: `AddressesPage.tsx` (Mis Direcciones), `CheckoutPage.tsx` (Confirmación e inicio de pago), `OrdersHistoryPage.tsx` (Mis Pedidos con línea de tiempo) y `OrdersManager.tsx` (Panel de operador/gestor).
  - Configuración de nuevas rutas protegidas y RBAC en el Router de React según los roles de `AGENTS.md`.
