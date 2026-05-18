# pedidos Specification

## Purpose
TBD - created by archiving change us-005-pedidos. Update Purpose after archive.
## Requirements
### Requirement: Creación Transaccional de Pedidos (Snapshot e Integridad)
El sistema MUST permitir a los clientes crear pedidos de forma atómica a partir de su carrito de compras en una única transacción de base de datos gestionada por el Unit of Work (UoW). El sistema MUST capturar un snapshot inmutable de los datos de facturación al momento de la creación: `precio_snapshot` y `nombre_snapshot` para los ítems en `DetallePedido`, y `direccion_snapshot` para el envío en `Pedido`. El sistema MUST validar la existencia y disponibilidad de stock antes de consolidar el pedido, aplicando bloqueos transaccionales `SELECT FOR UPDATE` para evitar condiciones de carrera (concurrency race conditions).

#### Scenario: Creación exitosa de pedido desde carrito
- **WHEN** un cliente autenticado envía una solicitud POST `/api/v1/pedidos` con ítems y stock disponible
- **THEN** el sistema crea el pedido en estado `PENDIENTE`, realiza los snapshots inmutables correspondientes, descuenta el stock y retorna HTTP 201.

#### Scenario: Rechazo de creación por stock insuficiente concurrente
- **WHEN** dos clientes intentan comprar simultáneamente el último producto en stock, y el primer cliente bloquea el stock primero en base de datos
- **THEN** el sistema del segundo cliente detecta el stock insuficiente durante la transacción, realiza un rollback completo y retorna HTTP 400.

### Requirement: Trazabilidad de Pedidos por Máquina de Estados (FSM)
El sistema MUST validar y gobernar la progresión del ciclo de vida del pedido a través de una Máquina de Estados Finita (FSM) de 6 niveles (`PENDIENTE` -> `CONFIRMADO` -> `EN_PREP` -> `EN_CAMINO` -> `ENTREGADO` / `CANCELADO`). El sistema MUST rechazar cualquier transición de estado que no esté explícitamente habilitada en el mapa de transiciones válidas. Los estados terminales (`ENTREGADO` y `CANCELADO`) no admiten transiciones salientes (`RN-01`).

#### Scenario: Transición válida realizada por el operador
- **WHEN** un gestor con rol `PEDIDOS` avanza un pedido de `CONFIRMADO` a `EN_PREP`
- **THEN** el sistema registra el cambio y retorna HTTP 200.

#### Scenario: Transición inválida rechazada por la FSM
- **WHEN** un gestor intenta saltar un pedido directamente de `PENDIENTE` a `EN_CAMINO` sin pasar por `CONFIRMADO` ni `EN_PREP`
- **THEN** el sistema bloquea el cambio, lanza una excepción de negocio y retorna HTTP 400.

### Requirement: Historial de Estados Append-Only
El sistema MUST almacenar un log completo e inmutable de cambios de estado en la tabla `HistorialEstadoPedido`. La tabla MUST ser estrictamente de solo adición (append-only), bloqueando cualquier operación de modificación (`UPDATE`) o eliminación (`DELETE`) (`RN-03`). El primer registro de historial para un pedido MUST configurarse con `estado_desde = NULL` (`RN-02`).

#### Scenario: Auditoría de transición exitosa
- **WHEN** se avanza un pedido de estado y se inserta un registro en el historial
- **THEN** el sistema registra el timestamp exacto, usuario operador, estado de origen y de destino, y prohíbe modificaciones posteriores.

### Requirement: Cancelación de Pedidos con Motivo Obligatorio
El sistema MUST permitir la cancelación de pedidos que se encuentren en estados no terminales (`PENDIENTE`, `CONFIRMADO`, `EN_PREP`). La cancelación MUST exigir de forma obligatoria registrar un motivo descriptivo (`RN-05`) y MUST restaurar de forma atómica el stock comprometido a los productos/ingredientes en la misma transacción.

#### Scenario: Cancelación exitosa por parte del cliente
- **WHEN** un cliente cancela su propio pedido en estado `PENDIENTE` especificando un motivo
- **THEN** el sistema cancela el pedido, restaura el stock y retorna HTTP 200.

### Requirement: Integración de Webhooks de Pago con Idempotencia
El sistema MUST proveer un endpoint público `POST /api/v1/pagos/webhook` para procesar notificaciones IPN de MercadoPago de manera segura y robusta. El sistema MUST utilizar `idempotency_key` para prevenir cobros o confirmaciones duplicadas. Al confirmarse el pago de MercadoPago, el sistema MUST registrar el objeto `Pago` y avanzar automáticamente el estado del pedido de `PENDIENTE` a `CONFIRMADO` de manera atómica.

#### Scenario: Confirmación automática de pago vía Webhook
- **WHEN** MercadoPago notifica un pago exitoso asociado a un pedido
- **THEN** el sistema registra el cobro de forma atómica y avanza el estado del pedido a `CONFIRMADO`.

