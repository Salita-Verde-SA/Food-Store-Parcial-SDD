## Why

Implementar un sistema de seguridad robusto y escalable para Food Store. La autenticación y autorización son requisitos transversales que permiten proteger los datos sensibles del negocio, diferenciar las capacidades de los distintos tipos de usuarios (Admin, Stock, Pedidos, Cliente) y cumplir con las normas de seguridad básicas para el manejo de credenciales y sesiones.

## What Changes

- Implementación de endpoints de Login y Registro de usuarios.
- Sistema de autenticación basado en JWT (JSON Web Tokens) con HS256.
- Manejo de Refresh Tokens persistidos en base de datos para soporte de sesiones prolongadas y revocación.
- Middleware de autorización RBAC (Role-Based Access Control) para proteger endpoints por rol.
- Implementación de Rate Limiting específico para el endpoint de login (5 intentos / 15 min).
- Hashing de contraseñas con BCrypt (cost factor >= 12).
- Pantalla de Login en el frontend y protección de rutas según el estado de autenticación.
- Interceptores de Axios en el frontend para adjuntar tokens y manejar el refresco automático ante errores 401.

## Capabilities

### New Capabilities
- `user-auth`: Capacidad de autenticar usuarios, validar credenciales y emitir tokens de acceso.
- `rbac-system`: Sistema de control de acceso basado en roles para restringir operaciones sensibles.
- `token-management`: Gestión del ciclo de vida de tokens, incluyendo refresco y logout (invalidación).
- `security-shield`: Capas de protección extra como rate limiting y hashing seguro.
- `auth-ui`: Componentes y lógica de frontend para la gestión de la sesión del usuario.

### Modified Capabilities
- `backend-setup`: Se integran los middlewares de seguridad en la aplicación principal.
- `frontend-setup`: Se activan los interceptores de Axios y se configura el Router para rutas protegidas.

## Impact

- **Seguridad**: Se establece la base de confianza del sistema.
- **Backend**: Nuevos routers en `auth/` y `usuarios/`. Modificación de `main.py` para incluir routers de auth.
- **Frontend**: Nueva página de Login, modificación de `App.tsx` para incluir `ProtectedRoute`.
- **Base de Datos**: Uso de las tablas `usuario`, `rol` y `usuariorol` definidas en el setup. Adición de tabla `refreshtoken`.
