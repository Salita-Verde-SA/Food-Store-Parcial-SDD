# productos Specification

## Purpose
TBD - created by archiving change us-003-productos. Update Purpose after archive.
## Requirements
### Requirement: Gestión de Ingredientes y Alérgenos Globales
El sistema MUST permitir a los usuarios autenticados con los roles de ADMIN o STOCK realizar las operaciones CRUD (Creación, Lectura, Actualización, Soft Delete) de ingredientes globales del sistema. El sistema MUST validar la unicidad del nombre del ingrediente y el flag booleano obligatorio `es_alergeno` que determine si representa un factor alergénico a destacar.

#### Scenario: Creación exitosa de ingrediente
- **WHEN** un usuario con rol ADMIN o STOCK envía una solicitud POST `/api/v1/ingredientes` con un nombre único y `es_alergeno = true`
- **THEN** el sistema crea el ingrediente global, lo almacena y retorna HTTP 201

#### Scenario: Creación fallida de ingrediente por duplicado
- **WHEN** un usuario con rol ADMIN o STOCK intenta crear un ingrediente con un nombre que ya existe en la base de datos (activo o eliminado)
- **THEN** el sistema rechaza la creación y retorna HTTP 400 con los detalles de validación correspondientes

#### Scenario: Soft delete de ingrediente global
- **WHEN** un usuario con rol ADMIN o STOCK envía una solicitud DELETE `/api/v1/ingredientes/{id}` para un ingrediente existente
- **THEN** el sistema le estampa el timestamp actual en la columna `deleted_at`, manteniéndolo en la base de datos para no alterar las asociaciones históricas de productos, y retorna HTTP 204

### Requirement: Gestión del Catálogo de Productos
El sistema MUST permitir a los usuarios autenticados con los roles de ADMIN o STOCK realizar las operaciones CRUD (Creación, Lectura, Actualización, Soft Delete) de productos en el catálogo. El sistema MUST validar que el precio sea de precisión fija (DECIMAL(10,2) o similar), mayor a 0, y que el stock sea un número entero mayor o igual a 0.

#### Scenario: Creación exitosa de producto activo
- **WHEN** un usuario con rol ADMIN o STOCK envía una solicitud POST `/api/v1/productos` con nombre, descripción, precio válido (`> 0`), stock válido (`>= 0`) y `disponible = true`
- **THEN** el sistema crea el producto en el catálogo y retorna HTTP 201

#### Scenario: Creación fallida de producto por datos de precio o stock inválidos
- **WHEN** un usuario con rol ADMIN o STOCK envía una solicitud de creación con precio negativo o igual a cero, o con una cantidad de stock negativa
- **THEN** el sistema aborta la transacción, rechaza la solicitud y retorna HTTP 400

#### Scenario: Soft delete de producto del catálogo
- **WHEN** un usuario con rol ADMIN o STOCK envía una solicitud DELETE `/api/v1/productos/{id}`
- **THEN** el sistema asigna el timestamp actual en el campo `deleted_at` del producto (baja lógica), garantizando que no se elimine físicamente para preservar la integridad de pedidos y snapshots históricos, y retorna HTTP 204

### Requirement: Clasificación y Composición Multidimensional del Producto
El sistema MUST permitir asociar un producto a múltiples categorías (relación muchos a muchos vía tabla pivote `producto_categoria`) y asociarle múltiples ingredientes globales (relación muchos a muchos vía tabla pivote `producto_ingrediente`) que definan su composición y alérgenos de manera inequívoca.

#### Scenario: Asociación exitosa de categorías e ingredientes a un producto
- **WHEN** un usuario ADMIN o STOCK envía una solicitud para actualizar las asociaciones de un producto especificando una lista de IDs de categorías activas e IDs de ingredientes activos
- **THEN** el sistema actualiza de manera atómica las tablas pivote y retorna HTTP 200 con la información del producto unificada

### Requirement: Operaciones Atómicas de Control de Stock
El sistema MUST permitir la actualización del stock disponible de un producto a través de una petición de tipo PATCH `/api/v1/productos/{id}/stock`. El sistema MUST garantizar que todas las modificaciones (incrementos o decrementos de stock) se realicen de manera atómica en la base de datos y MUST impedir que el stock final resultante sea menor a 0.

#### Scenario: Incremento o seteo exitoso de stock
- **WHEN** un usuario con rol ADMIN o STOCK envía un PATCH con un número que incrementa el stock o define una cantidad absoluta válida
- **THEN** el sistema actualiza atómicamente el stock del producto en la base de datos y retorna HTTP 200

#### Scenario: Rechazo de decremento que resulte en stock negativo
- **WHEN** un usuario intenta decrementar el stock de un producto con una cantidad que superaría las existencias reales en stock
- **THEN** el sistema aborta el cambio atómicamente, rechaza la solicitud y retorna HTTP 400 impidiendo stock negativo

### Requirement: Consulta Pública del Catálogo y Detalle del Producto
El sistema MUST permitir a cualquier cliente navegar el catálogo de productos activo (donde `disponible = true` y `deleted_at IS NULL`) sin requerir autenticación. El listado MUST soportar paginación (parámetros `page` y `limit`), filtrado opcional por categoría y búsqueda parcial por nombre (no sensible a mayúsculas, ILIKE). La vista de detalle MUST incluir la descripción, categorías y composición de ingredientes, destacando visualmente los alérgenos, e indicar disponibilidad de stock sin mostrar la cantidad exacta disponible al cliente.

#### Scenario: Consulta pública del listado con paginación y filtros
- **WHEN** un cliente anónimo envía una solicitud GET `/api/v1/productos` con parámetros `categoria`, `busqueda`, `page = 1` y `limit = 12`
- **THEN** el sistema ejecuta la consulta y retorna una lista paginada de productos activos junto con el total de registros encontrados para que el frontend arme los controles correspondientes, devolviendo HTTP 200

### Requirement: Filtrado Excluyente de Alérgenos
El sistema MUST permitir a los clientes filtrar el listado de productos de forma que se excluyan automáticamente todos aquellos productos que contengan determinados ingredientes alérgenos especificados. La consulta del backend MUST emplear una subconsulta SQL de exclusión eficiente (como `NOT EXISTS` o similar) para garantizar la velocidad de respuesta.

#### Scenario: Búsqueda excluyendo alérgenos específicos
- **WHEN** un cliente anónimo envía una solicitud GET `/api/v1/productos` con el parámetro de consulta `excluirAlergenos` conteniendo una lista de IDs de ingredientes
- **THEN** el sistema filtra y retorna exclusivamente los productos que no contienen ninguno de los ingredientes alérgenos indicados en la petición, devolviendo HTTP 200

