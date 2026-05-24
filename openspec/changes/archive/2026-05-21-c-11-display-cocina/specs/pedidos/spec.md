# pedidos Specification

## ADDED Requirements

### Requirement: Persistencia de Notas de Cliente en Base de Datos
El sistema MUST persistir de forma obligatoria el campo `notas` (personalizaciones u observaciones de cocina ingresadas por el cliente) en la tabla `pedido` de la base de datos PostgreSQL. Esta columna MUST ser de tipo texto plano, de longitud variable, nullable y MUST mapearse en el modelo SQLModel `Pedido` y en los esquemas de respuesta del pedido (`PedidoDetail`, `PedidoListItem`, `PedidoDetailResponse`) de manera que las notas viajen al frontend y se visualicen de forma íntegra en el KDS.

#### Scenario: Creación de pedido guardando notas de cocina
- **WHEN** un cliente crea un pedido enviando una nota en la petición
- **THEN** el sistema graba de forma persistente la nota en la columna `notas` de la tabla `pedido` y la retorna en la respuesta HTTP 201.

## MODIFIED Requirements

### Requirement: Trazabilidad de Pedidos por Máquina de Estados (FSM)
El sistema MUST validar y gobernar la progresión del ciclo de vida del pedido a través de una Máquina de Estados Finita (FSM) de 6 niveles (`PENDIENTE` -> `CONFIRMADO` -> `EN_PREP` -> `EN_CAMINO` -> `ENTREGADO` / `CANCELADO`). El sistema MUST rechazar cualquier transición de estado que no esté explícitamente habilitada en el mapa de transiciones válidas. Los estados terminales (`ENTREGADO` y `CANCELADO`) no admiten transiciones salientes (`RN-01`). El rol operativo `COCINA` MUST estar autorizado a realizar exclusivamente las transiciones `CONFIRMADO → EN_PREP` (iniciar preparación) y `EN_PREP → EN_CAMINO` (terminar preparación). Intentos del rol `COCINA` de realizar cualquier otra transición (incluyendo cancelaciones o marcas de entregado) MUST retornar un error de autorización HTTP 403.

#### Scenario: Transición válida realizada por el operador
- **WHEN** un gestor con rol `PEDIDOS` avanza un pedido de `CONFIRMADO` a `EN_PREP`
- **THEN** el sistema registra el cambio y retorna HTTP 200.

#### Scenario: Transición válida realizada por el cocinero
- **WHEN** un usuario con rol `COCINA` avanza un pedido de `CONFIRMADO` a `EN_PREP` o de `EN_PREP` a `EN_CAMINO`
- **THEN** el sistema valida su rol, procesa la transición y retorna HTTP 200.

#### Scenario: Transición inválida por rol insuficiente (Cocinero intentando entregar)
- **WHEN** un usuario con rol `COCINA` intenta avanzar un pedido de `EN_CAMINO` a `ENTREGADO`
- **THEN** el sistema deniega el avance por políticas de RBAC y retorna HTTP 403.

#### Scenario: Transición inválida rechazada por la FSM
- **WHEN** un gestor intenta saltar un pedido directamente de `PENDIENTE` a `EN_CAMINO` sin pasar por `CONFIRMADO` ni `EN_PREP`
- **THEN** el sistema bloquea el cambio, lanza una excepción de negocio y retorna HTTP 400.

### Requirement: Historial de Estados Append-Only
El sistema MUST almacenar un log completo e inmutable de cambios de estado en la tabla `HistorialEstadoPedido`. La tabla MUST ser estrictamente de solo adición (append-only), bloqueando cualquier operación de modificación (`UPDATE`) o eliminación (`DELETE`) (`RN-03`). El primer registro de historial para un pedido MUST configurarse con `estado_desde = NULL` (`RN-02`). Cada registro del historial MUST guardar el ID del usuario operador (`operador_id`) responsable del cambio, lo cual incluye el ID del cocinero para las transiciones realizadas por el rol `COCINA`.

#### Scenario: Auditoría de transición exitosa
- **WHEN** se avanza un pedido de estado y se inserta un registro en el historial
- **THEN** el sistema registra el timestamp exacto, usuario operador, estado de origen y de destino, y prohíbe modificaciones posteriores.
