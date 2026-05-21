# seed-system Specification

## ADDED Requirements

### Requirement: idempotent-seed
El script de seed debe poder ejecutarse múltiples veces sin duplicar datos.

#### Scenario: second-execution
- **WHEN** se ejecuta `python -m app.db.seed` por segunda vez
- **THEN** no deben ocurrir errores de clave duplicada y la cantidad de registros debe ser la misma.

### Requirement: initial-admin
El seed debe crear un usuario administrador inicial, los roles del sistema requeridos y los usuarios del personal por defecto. El script de seed MUST crear las filas correspondientes en la tabla `rol` para todos los roles válidos: `ADMIN`, `STOCK`, `PEDIDOS` y el nuevo rol `COCINA`. Adicionalmente, el seed MUST crear un usuario inicial de cocina con el email `cocina@foodstore.com` y asignarle el rol `COCINA`.

#### Scenario: admin-creation
- **WHEN** termina la ejecución del seed
- **THEN** debe existir un usuario con el email definido en `ADMIN_EMAIL` y rol `ADMIN`.

#### Scenario: seed-de-roles-y-cocinero-inicial
- **WHEN** termina la ejecución del seed
- **THEN** debe existir en la base de datos el rol `COCINA` y un usuario activo con el email `cocina@foodstore.com` que posea dicho rol.
