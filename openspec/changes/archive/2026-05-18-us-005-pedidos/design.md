## Context

Actualmente, el sistema Food Store cuenta con autenticación y catálogo de productos. El carrito de compras reside en el cliente de forma persistente (`cartStore`), pero no hay forma de procesar pedidos. Esta propuesta introduce el soporte completo para transaccionalidad de pedidos de comida, pasarela de pago (MercadoPago), máquina de estados (FSM) de cocina y logística, y la gestión de direcciones físicas de entrega.

---

## Goals / Non-Goals

### Goals:
- **CRUD de Direcciones**: Permitir alta, baja, modificación y asignación de dirección principal (predeterminada) única por cliente.
- **Creación Transaccional Atómica**: Implementar `POST /api/v1/pedidos` utilizando el patrón **Unit of Work (UoW)** para encapsular toda la lógica de reserva de stock, snapshots de precio y dirección.
- **Snapshot Pattern (Inmutabilidad)**: Preservar `precio_snapshot` e `ingredientes` en las líneas de detalle, y `direccion_snapshot` en la orden para asegurar inmutabilidad comercial.
- **Máquina de Estados Pedido (FSM)**: Restringir las transiciones de pedido a 6 estados válidos (`PENDIENTE`, `CONFIRMADO`, `EN_PREP`, `EN_CAMINO`, `ENTREGADO`, `CANCELADO`).
- **Auditoría Append-Only**: Asegurar que cada cambio de estado se loguee en una tabla inmutable (nunca `UPDATE` ni `DELETE` en historial).
- **Integración de Webhook de Pagos**: Procesar la notificación IPN de MercadoPago con soporte de idempotencia (`idempotency_key`) para avanzar el pedido automáticamente a `CONFIRMADO`.
- **Restauración de Stock**: Reintegrar el stock de ingredientes al catálogo de forma atómica cuando un pedido confirmado sea cancelado.

### Non-Goals:
- **Facturación Impositiva AFIP**: Fuera de alcance para este sprint.
- **Seguimiento por GPS del Repartidor**: La geolocalización dinámica es un non-goal; solo se maneja el estado logístico del pedido.
- **Multi-vendedor**: El sistema asume una única tienda centralizada de comida.

---

## Decisions

### 1. Modelo de Datos (SQLModel)
Añadiremos 5 tablas al esquema relacional mediante migraciones de Alembic:

- **`DireccionEntrega`**:
  - `id`: `BIGINT` (PK)
  - `usuario_id`: `BIGINT` (FK -> `Usuario`, NN)
  - `alias`: `VARCHAR(50)` (NULL, Ej: "Trabajo", "Casa")
  - `calle`: `VARCHAR(200)` (NN)
  - `numero`: `VARCHAR(20)` (NN)
  - `piso_depto`: `VARCHAR(50)` (NULL)
  - `ciudad`: `VARCHAR(100)` (NN)
  - `codigo_postal`: `VARCHAR(20)` (NN)
  - `es_principal`: `BOOLEAN` (NN, default `false`)
  - `deleted_at`: `TIMESTAMPTZ` (NULL, Soft Delete)
  
- **`Pedido`**:
  - `id`: `BIGINT` (PK)
  - `usuario_id`: `BIGINT` (FK -> `Usuario`, NN)
  - `estado_codigo`: `VARCHAR(20)` (FK -> `EstadoPedido`, NN)
  - `total`: `DECIMAL(10,2)` (NN, CHECK >= 0)
  - `costo_envio`: `DECIMAL(10,2)` (NN, default 50.00)
  - `forma_pago_codigo`: `VARCHAR(20)` (FK -> `FormaPago`, NN)
  - `direccion_id`: `BIGINT` (FK -> `DireccionEntrega`, NULL)
  - `direccion_snapshot`: `TEXT` (NN)  # Datos literales de la dirección en el instante de compra
  
- **`DetallePedido`**:
  - `id`: `BIGINT` (PK)
  - `pedido_id`: `BIGINT` (FK -> `Pedido`, NN)
  - `producto_id`: `BIGINT` (FK -> `Producto`, NN)
  - `cantidad`: `INTEGER` (NN, CHECK > 0)
  - `nombre_snapshot`: `VARCHAR(200)` (NN)
  - `precio_snapshot`: `DECIMAL(10,2)` (NN)
  - `personalizacion`: `INTEGER[]` (NULL)  # Array de IDs de ingredientes excluidos de la receta

- **`HistorialEstadoPedido`**:
  - `id`: `BIGINT` (PK)
  - `pedido_id`: `BIGINT` (FK -> `Pedido`, NN)
  - `estado_desde`: `VARCHAR(20)` (FK -> `EstadoPedido`, NULL)  # NULL para la transición inicial de creación
  - `estado_hasta`: `VARCHAR(20)` (FK -> `EstadoPedido`, NN)
  - `usuario_id`: `BIGINT` (FK -> `Usuario`, NN)              # Quién ejecutó el cambio (o ID Sistema)
  - `motivo`: `TEXT` (NULL)                                    # Obligatorio para CANCELADO (RN-05)
  - `created_at`: `TIMESTAMPTZ` (NN, append-only)

- **`Pago`**:
  - `id`: `BIGINT` (PK)
  - `pedido_id`: `BIGINT` (FK -> `Pedido`, NN, Unique)
  - `external_reference`: `VARCHAR(100)` (NN, Unique)         # UUID del Pedido enviado a MercadoPago
  - `payment_id`: `VARCHAR(100)` (NULL)                       # ID transaccional provisto por MercadoPago
  - `status`: `VARCHAR(50)` (NN)                              # approved, pending, rejected
  - `monto`: `DECIMAL(10,2)` (NN)
  - `idempotency_key`: `VARCHAR(100)` (NN, Unique)            # Para procesado idempotente del Webhook

---

### 2. Flujo de Control Concurrente de Stock (SELECT FOR UPDATE)
Para evitar que dos clientes compren simultáneamente ingredientes o productos que se encuentren agotados, implementaremos control de stock concurrente a nivel de base de datos durante la transacción de creación del pedido.
- **Implementación**:
  Al abrir la transacción en el Unit of Work, el Service ejecutará una consulta `SELECT FOR UPDATE` sobre los registros de `Producto` implicados en la compra. Esto bloquea las filas en PostgreSQL hasta que se realice el `COMMIT` o `ROLLBACK` del pedido.
- **Lógica de negocio**:
  Si el stock actual es insuficiente para cubrir la cantidad solicitada, se lanza una excepción de negocio (`HTTPException 400`), provocando que el UoW ejecute un `ROLLBACK` total, liberando los candados sin guardar un solo registro parcial en la base de datos (Garantía Todo o Nada).

---

### 3. Máquina de Estados Finita (FSM) en Capa de Servicio
La lógica de transiciones de estado del pedido no se delegará a los routers HTTP ni a los repositorios. Se encapsulará estrictamente en `PedidoService.cambiar_estado(uow, pedido_id, nuevo_estado, operador_id, motivo=None)` para asegurar cohesión y control centralizado.

El mapa de transiciones permitidas es el siguiente:
```
PENDIENTE  →  CONFIRMADO  →  EN_PREP  →  EN_CAMINO  →  ENTREGADO (Terminal)
    ↓             ↓             ↓
CANCELADO     CANCELADO     CANCELADO (Terminal)
```
- **Transición PENDIENTE → CONFIRMADO**: Exclusivamente automatizada a través del webhook de pago MercadoPago. Ningún operador manual podrá forzar este paso (`RN-FS02`).
- **Transiciones a CANCELADO**: Al transicionar a `CANCELADO` desde `CONFIRMADO` o `EN_PREP`, el servicio debe reintegrar automáticamente la cantidad al stock físico de los productos de forma transaccional. El motivo de cancelación es obligatorio (`RN-05`).
- **Estados Terminales**: `ENTREGADO` y `CANCELADO` son inmutables; cualquier intento de transición saliente será rechazado (`RN-FS06`).

---

### 4. Idempotencia en el Webhook de Pagos
MercadoPago puede reintentar el envío de un webhook si la red experimenta latencia. Para mitigar duplicaciones de registros e incrementos erróneos de stock:
- **Estrategia**:
  El router de pagos (`POST /api/v1/pagos/webhook`) extraerá el identificador del evento de MercadoPago y lo utilizará como `idempotency_key`. 
- **Flujo**:
  Se realiza un lookup en la tabla `Pago` antes de procesar el pago. Si la clave ya existe, el endpoint detiene la ejecución inmediatamente y retorna `HTTP 200 { "status": "already_processed" }` para notificar al webhook que el evento ya fue registrado satisfactoriamente, previniendo duplicados de transacciones y estados.

---

## Risks / Trade-offs

| [Risk] | Mitigation |
| :--- | :--- |
| **Condiciones de carrera al pagar (Insuficiencia de stock en webhook MP)** | Si al procesar el pago (`PENDIENTE -> CONFIRMADO`) otro cliente ya consumió el stock físico restante, la base de datos abortará la transacción. El pago se mantendrá como registrado pero el estado del pedido pasará a `CANCELADO` con motivo "Falta de Stock Concurrente", y se deberá iniciar una devolución/crédito al cliente de forma manual o automática. |
| **Inconsistencias por cambio físico en dirección** | Si un cliente edita o elimina una dirección de entrega que utilizó en pedidos históricos, se podrían corromper los registros de envíos pasados. Almacenaremos una copia de texto plano literal (`direccion_snapshot`) en la tabla `Pedido` al momento de la creación de la orden. |
| **Spam de Webhooks falsos** | El endpoint de MercadoPago es público y podría ser atacado. Validaremos la firma transaccional provista por MercadoPago (`X-Signature`) y aplicaremos slowapi rate limiting (100 peticiones / 1 min por IP) para mitigar vectores de denegación de servicio. |
