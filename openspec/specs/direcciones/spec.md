# direcciones Specification

## Purpose
TBD - created by archiving change us-005-pedidos. Update Purpose after archive.
## Requirements
### Requirement: CRUD de Direcciones de Entrega con Control de Ownership
El sistema MUST permitir a los clientes autenticados gestionar (Crear, Leer, Actualizar, Eliminar) sus propias direcciones de entrega. El sistema MUST validar estrictamente que un cliente solo pueda operar sobre direcciones asociadas a su `userId` extraído del token JWT.

#### Scenario: Creación exitosa de dirección
- **WHEN** un cliente autenticado envía una solicitud POST `/api/v1/direcciones` con datos de dirección válidos (calle, número, ciudad, código postal, alias opcional)
- **THEN** el sistema crea la dirección, la asocia a su cuenta y retorna HTTP 201.

#### Scenario: Edición de dirección ajena rechazada
- **WHEN** un cliente intenta modificar (PUT `/api/v1/direcciones/{id}`) una dirección que pertenece a otro usuario
- **THEN** el sistema rechaza la solicitud y retorna HTTP 403.

### Requirement: Dirección Predeterminada Única (Principal)
El sistema MUST configurar automáticamente la primera dirección de entrega de un cliente como principal (`es_principal = true`). El sistema MUST garantizar que solo pueda existir **una única dirección principal** activa por usuario. Al marcar una nueva dirección como principal, el sistema MUST desmarcar de forma automática y atómica cualquier dirección principal anterior asociada a ese mismo usuario en la base de datos.

#### Scenario: Asignación automática de primera dirección
- **WHEN** un cliente sin direcciones previas guarda su primera dirección de entrega
- **THEN** el sistema la guarda marcando automáticamente `es_principal = true`.

#### Scenario: Rotación atómica de dirección principal
- **WHEN** un cliente con una dirección principal previa establece una nueva dirección como principal
- **THEN** el sistema guarda la nueva dirección con `es_principal = true` y cambia la anterior a `es_principal = false` en la misma transacción.

