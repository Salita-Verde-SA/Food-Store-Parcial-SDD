## ADDED Requirements

### Requirement: idempotent-seed
El script de seed debe poder ejecutarse múltiples veces sin duplicar datos.

#### Scenario: second-execution
- **WHEN** se ejecuta `python -m app.db.seed` por segunda vez
- **THEN** no deben ocurrir errores de clave duplicada y la cantidad de registros debe ser la misma.

### Requirement: initial-admin
El seed debe crear un usuario administrador inicial.

#### Scenario: admin-creation
- **WHEN** termina la ejecución del seed
- **THEN** debe existir un usuario con el email definido en `ADMIN_EMAIL` y rol `ADMIN`.
