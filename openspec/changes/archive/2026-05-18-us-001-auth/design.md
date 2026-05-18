## Context

El proyecto cuenta con la infraestructura base (FastAPI + SQLModel + React FSD) y las tablas de Usuarios y Roles ya migradas. Actualmente, los endpoints son públicos y no existe mecanismo de autenticación.

## Goals / Non-Goals

**Goals:**
- Implementar flujo de Login (Email/Password) devolviendo Access Token (JWT) y Refresh Token.
- Persistir Refresh Tokens en BD para control de sesiones y revocación.
- Crear middlewares de autorización (RBAC) para proteger endpoints del backend.
- Implementar interceptores en el frontend para manejo automático de tokens y refresco.
- Proteger rutas en el frontend según el rol del usuario.

**Non-Goals:**
- Registro de usuarios por parte de clientes (se hará en otro change o se asume admin-only por ahora).
- Recuperación de contraseña por email (fuera del scope de auth base).
- Login con redes sociales (OAuth2).

## Decisions

- **Algoritmo JWT**: HS256 con clave secreta definida en variables de entorno.
- **Hashing**: BCrypt con salt dinámico para almacenamiento seguro de passwords.
- **Refresh Token Rotation**: El Refresh Token es de un solo uso por defecto o tiene un tiempo de expiración largo (7 días). Se almacena el hash del refresh token en la base de datos vinculado al `usuario_id`.
- **RBAC**: Se utilizará el patrón de "Dependency Injection" de FastAPI para la protección de rutas. Ejemplo: `Depends(require_role(["ADMIN"]))`.
- **Frontend State**: Zustand `authStore` manejará el estado de la sesión, persistido en `localStorage`.

## Risks / Trade-offs

- **Complejidad de Refresh Tokens**: Requiere manejo cuidadoso de la sincronización en el frontend para evitar múltiples llamadas de refresco simultáneas (race conditions).
- **JWT Stateless vs Revocación**: Al usar JWT, la revocación inmediata del Access Token es difícil sin consultar una blacklist. El Refresh Token en BD mitiga esto permitiendo invalidar la sesión completa al cerrar sesión.
