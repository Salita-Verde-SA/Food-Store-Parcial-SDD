## ADDED Requirements

### Requirement: transaction-management
El sistema debe usar el patrón Unit of Work para gestionar transacciones de base de datos.

#### Scenario: rollback-on-error
- **WHEN** ocurre una excepción dentro de un bloque `async with UnitOfWork()`
- **THEN** la sesión de base de datos debe ejecutar un rollback automático.

### Requirement: error-standard
Los errores de la API deben seguir el estándar RFC 7807 (Problem Details).

#### Scenario: error-format
- **WHEN** se lanza una `HTTPException`
- **THEN** la respuesta JSON debe contener `type`, `title`, `status` y `detail`.
