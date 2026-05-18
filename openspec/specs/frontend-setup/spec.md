## ADDED Requirements

### Requirement: state-management
El frontend debe usar Zustand para el estado global y TanStack Query para el estado del servidor.

#### Scenario: store-initialization
- **WHEN** la aplicación arranca
- **THEN** los stores `auth`, `cart`, `payment` y `ui` deben estar inicializados con sus valores por defecto.

### Requirement: api-client
El frontend debe usar Axios configurado con interceptores para manejar tokens JWT.

#### Scenario: request-interception
- **WHEN** se realiza una petición HTTP via Axios
- **THEN** se debe intentar adjuntar el token de acceso si existe en el `authStore`.
