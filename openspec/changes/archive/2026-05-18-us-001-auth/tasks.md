## 1. Backend: Lógica de Autenticación y Tokens

- [x] 1.1 Definir modelo `RefreshToken` en `app/modules/auth/model.py` y generar migración con Alembic.
- [x] 1.2 Implementar utilidades de seguridad en `app/core/security.py`: hashing de passwords y generación/validación de JWT.
- [x] 1.3 Implementar `AuthRepository` para la gestión de Refresh Tokens en BD.
- [x] 1.4 Desarrollar `AuthService` con métodos `authenticate_user`, `create_session` y `refresh_session`.
- [x] 1.5 Crear `app/modules/auth/router.py` con los endpoints: `POST /login`, `POST /refresh`, `POST /logout`.

## 2. Backend: Autorización (RBAC) y Seguridad

- [x] 2.1 Implementar dependencia `get_current_user` en `app/modules/auth/dependencies.py` para validar el Access Token.
- [x] 2.2 Crear clase `RoleChecker` para validación de roles en endpoints.
- [x] 2.3 Agregar Rate Limiting al endpoint de `/login` usando SlowAPI.
- [x] 2.4 Implementar endpoint `GET /auth/me` para verificar la sesión actual.

## 3. Frontend: Integración y UI

- [x] 3.1 Actualizar `src/shared/stores/authStore.ts` con acciones de login, logout y persistencia de tokens.
- [x] 3.2 Implementar interceptor de Axios en `src/shared/api/axios.ts` para adjuntar el JWT y manejar el refresco automático (Error 401).
- [x] 3.3 Crear componente `ProtectedRoute` en `src/app/providers/ProtectedRoute.tsx`.
- [x] 3.4 Desarrollar la página de Login en `src/pages/auth/LoginPage.tsx` utilizando `TanStack Form` para validación.
- [x] 3.5 Configurar el router en `src/app/router.tsx` con las rutas protegidas y públicas.
