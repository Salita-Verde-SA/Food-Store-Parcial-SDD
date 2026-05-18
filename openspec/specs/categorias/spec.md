## ADDED Requirements

### Requirement: CRUD de Categorías Jerárquicas por Usuarios Autorizados
El sistema MUST permitir a los usuarios autenticados con los roles de ADMIN o STOCK realizar las operaciones CRUD (Creación, Lectura, Actualización, Soft Delete) de categorías. El sistema MUST validar la unicidad del nombre de la categoría dentro de un mismo nivel jerárquico.

#### Scenario: Creación exitosa de categoría raíz
- **WHEN** un usuario con rol ADMIN o STOCK envía una solicitud POST `/api/v1/categorias` con un nombre único y `parent_id = NULL`
- **THEN** el sistema crea la categoría raíz y retorna HTTP 201

#### Scenario: Creación exitosa de categoría hija
- **WHEN** un usuario con rol ADMIN o STOCK envía una solicitud POST `/api/v1/categorias` con un nombre único y un `parent_id` de una categoría existente no eliminada
- **THEN** el sistema crea la categoría hija vinculada a su padre y retorna HTTP 201

#### Scenario: Creación fallida por nombre duplicado en el mismo nivel
- **WHEN** un usuario con rol ADMIN o STOCK intenta crear una categoría con un nombre que ya existe en el mismo nivel jerárquico (mismo `parent_id`)
- **THEN** el sistema rechaza la solicitud retornando HTTP 400 con un detalle de error RFC 7807

### Requirement: Prevención de Ciclos en la Jerarquía
El sistema MUST validar en la capa de servicio que no se generen ciclos circulares de herencia al crear o actualizar el `parent_id` de cualquier categoría. Una categoría NUNCA SHALL ser configurada como su propio padre ni como hija de ninguna de sus subcategorías descendientes.

#### Scenario: Intento de autoreferencia directa
- **WHEN** un usuario con rol ADMIN o STOCK intenta actualizar una categoría asignándole a sí misma como `parent_id`
- **THEN** el sistema rechaza la transacción en la capa de servicio retornando HTTP 400 y aborta el guardado

#### Scenario: Intento de ciclo indirecto
- **WHEN** la Categoría A es padre de la Categoría B, y el usuario intenta actualizar la Categoría A asignándole como `parent_id` el ID de la Categoría B
- **THEN** el sistema detecta la presencia del ciclo en la jerarquía, rechaza la transacción y retorna HTTP 400

### Requirement: Soft Delete Condicionado a la Integridad del Catálogo
El sistema MUST aplicar Soft Delete (`deleted_at` con timestamp) al eliminar categorías, de modo que nunca se borren físicamente de la base de datos. El sistema MUST impedir el borrado lógico de una categoría si esta posee algún producto activo no eliminado asociado directamente en el catálogo.

#### Scenario: Borrado lógico exitoso de categoría sin productos asociados
- **WHEN** un usuario con rol ADMIN envía una solicitud DELETE `/api/v1/categorias/{id}` para una categoría que no tiene productos activos asociados
- **THEN** el sistema asigna el timestamp actual en el campo `deleted_at`, desasocia la categoría de sus categorías hijas (configurando el `parent_id` de las hijas como NULL) y retorna HTTP 204

#### Scenario: Intento de borrado de categoría con productos activos
- **WHEN** un usuario con rol ADMIN intenta eliminar una categoría que tiene productos activos vinculados en el catálogo
- **THEN** el sistema rechaza la eliminación retornando HTTP 400 (o HTTP 409 Conflict) impidiendo la modificación de la base de datos

### Requirement: Consulta Pública del Árbol de Categorías Completo
El sistema MUST permitir a cualquier usuario (incluidos clientes anónimos) recuperar el catálogo completo de categorías estructurado como un árbol anidado recursivo en una sola petición. El sistema MUST utilizar una consulta SQL recursiva optimizada (CTE - Common Table Expression) para recuperar la estructura y MUST excluir todas las categorías eliminadas lógicamente (`deleted_at IS NOT NULL`).

#### Scenario: Listado público del árbol jerárquico
- **WHEN** un cliente anónimo envía una solicitud GET `/api/v1/categorias`
- **THEN** el sistema ejecuta una CTE recursiva en PostgreSQL/SQLite y retorna un árbol JSON jerárquico completo con código HTTP 200
