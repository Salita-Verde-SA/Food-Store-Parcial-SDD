# Capability: user-auth (Delta Spec)

## Requirements
- El sistema debe permitir el login de usuarios mediante email y contraseña.
- Se debe validar la existencia del usuario y que la contraseña coincida con el hash almacenado.
- Tras un login exitoso, se deben emitir un Access Token (JWT) y un Refresh Token.
- El Access Token debe contener el `sub` (usuario_id) y los roles del usuario.

## Technical Details
- Endpoint: `POST /api/v1/auth/login`.
- Payload: `{ "email": "...", "password": "..." }`.
- Response: `{ "access_token": "...", "refresh_token": "...", "token_type": "bearer", "user": { ... } }`.
