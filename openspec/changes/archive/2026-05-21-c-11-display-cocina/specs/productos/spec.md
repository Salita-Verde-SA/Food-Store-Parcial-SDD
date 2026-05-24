# productos Specification

## MODIFIED Requirements

### Requirement: Gestión del Catálogo de Productos
El sistema MUST permitir a los usuarios autenticados con los roles de ADMIN o STOCK realizar las operaciones CRUD (Creación, Lectura, Actualización, Soft Delete) de productos en el catálogo. El sistema MUST validar que el precio sea de precisión fija (DECIMAL(10,2) o similar), mayor a 0, y que el stock sea un número entero mayor o igual a 0. Adicionalmente, el sistema MUST permitir a los usuarios con el rol `COCINA` modificar únicamente la disponibilidad del producto (el flag booleano `disponible`) a través de un endpoint PATCH específico, denegando a este rol la modificación de cualquier otro atributo del producto (como precio, descripción, nombre o stock).

#### Scenario: Creación exitosa de producto activo
- **WHEN** un usuario con rol ADMIN o STOCK envía una solicitud POST `/api/v1/productos` con nombre, descripción, precio válido (`> 0`), stock válido (`>= 0`) y `disponible = true`
- **THEN** el sistema crea el producto en el catálogo y retorna HTTP 201

#### Scenario: Creación fallida de producto por datos de precio o stock inválidos
- **WHEN** un usuario con rol ADMIN o STOCK envía una solicitud de creación con precio negativo o igual a cero, o con una cantidad de stock negativa
- **THEN** el sistema aborta la transacción, rechaza la solicitud y retorna HTTP 400

#### Scenario: Soft delete de producto del catálogo
- **WHEN** un usuario con rol ADMIN o STOCK envía una solicitud DELETE `/api/v1/productos/{id}`
- **THEN** el sistema asigna el timestamp actual en el campo `deleted_at` del producto (baja lógica), garantizando que no se elimine físicamente para preservar la integridad de pedidos y snapshots históricos, y retorna HTTP 204

#### Scenario: Cocinero cambia la disponibilidad de un producto
- **WHEN** un usuario con el rol `COCINA` envía un PATCH a `/api/v1/productos/{id}/disponibilidad` con un body `{ "disponible": false }`
- **THEN** el sistema actualiza el estado de disponibilidad del producto a inactivo (ocultándose temporalmente de la consulta pública del cliente) y retorna HTTP 200.

#### Scenario: Cocinero intenta modificar otros datos del producto sin autorización
- **WHEN** un usuario con el rol `COCINA` intenta modificar el precio de un producto en `/api/v1/productos/{id}`
- **THEN** el sistema bloquea la edición por falta de privilegios y retorna HTTP 403.
