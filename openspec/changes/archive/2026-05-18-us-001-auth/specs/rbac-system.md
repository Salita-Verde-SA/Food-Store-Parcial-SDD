# Capability: rbac-system (Delta Spec)

## Requirements
- El sistema debe permitir restringir el acceso a endpoints específicos basándose en los roles del usuario.
- Los roles permitidos son: `ADMIN`, `STOCK`, `PEDIDOS`, `CLIENTE`.
- Si un usuario no tiene el rol requerido, el backend debe responder con un error 403 Forbidden.

## Technical Details
- Middleware: Dependencia de FastAPI `require_role(allowed_roles: List[str])`.
- Los roles se extraen del JWT decodificado.
