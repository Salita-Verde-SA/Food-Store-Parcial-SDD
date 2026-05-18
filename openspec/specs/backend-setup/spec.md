## ADDED Requirements

### Requirement: database-connection
El backend debe conectarse a una base de datos PostgreSQL usando SQLModel.

#### Scenario: migration-execution
- **WHEN** se ejecuta `alembic upgrade head`
- **THEN** se deben crear las tablas definidas en los modelos iniciales sin errores.

### Requirement: api-health
El servidor debe exponer un endpoint de salud o documentación.

#### Scenario: swagger-docs
- **WHEN** el servidor está corriendo y se accede a `/docs`
- **THEN** se debe ver la interfaz de Swagger con los esquemas iniciales.
