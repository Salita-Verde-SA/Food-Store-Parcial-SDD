# Capability: token-management (Delta Spec)

## Requirements
- El Refresh Token debe permitir obtener un nuevo Access Token sin volver a pedir credenciales.
- Los Refresh Tokens deben ser revocables (Logout).
- Se debe implementar rotación de Refresh Tokens (opcional, pero recomendado).

## Technical Details
- Endpoint: `POST /api/v1/auth/refresh`.
- Endpoint: `POST /api/v1/auth/logout`.
- Persistencia: Tabla `refreshtoken` con `id`, `usuario_id`, `token_hash`, `expires_at`, `revoked`.
