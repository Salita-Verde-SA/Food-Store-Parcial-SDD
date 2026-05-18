## 1. Modelado y APIs de Control (Backend)

- [x] 1.1 Crear la tabla SQLModel `Configuracion` (key, value, description) y registrar su repositorio dinámico en la clase `UnitOfWork`.
- [x] 1.2 Desarrollar en `AuthRepository` y `UsuarioService` la lógica atómica de token revocation que marca como `revoked = True` todos los refresh tokens de un usuario inhabilitado.
- [x] 1.3 Implementar el enrutador `/api/v1/admin/configuracion` con endpoints GET y PUT para persistir y recuperar configuraciones operativas globales.
- [x] 1.4 Desarrollar en `router.py` de usuarios las rutas administrativas `/api/v1/usuarios` para listar de forma paginada con filtros de búsqueda y editar rol/estado de cuentas.

## 2. Dashboard de Métricas Analíticas (Backend SQL)

- [x] 2.1 Implementar en `AdminService.obtener_metricas_dashboard` consultas SQL de agregación Postgres de alto rendimiento utilizando `func.sum`, `func.count` y `func.date_trunc`.
- [x] 2.2 Crear el enrutador `/api/v1/admin/dashboard` protegiendo los datos comerciales sensibles para accesos exclusivos de `ADMIN` y `PEDIDOS`.

## 3. Panel Administrativo y Visualizaciones (Frontend FSD)

- [x] 3.1 Diseñar el Layout Administrativo colapsable con controlves de seguridad basados en roles (RBAC) para denegar accesos directos por URL en el router de React.
- [x] 3.2 Desarrollar la página de Dashboard (`DashboardPage.tsx`) con tarjetas métricas animadas y gráficos fluidos de ventas históricas utilizando `recharts`.
- [x] 3.3 Implementar la página de Usuarios (`UsuariosPage.tsx`) con soporte de paginación, filtros por rol/estado y trigger inmediato de deslogueo ante inhabilitaciones.
- [x] 3.4 Crear la página de Configuración Global del Local (`ConfiguracionPage.tsx`) enlazando el Zustand store para actualizar de forma interactiva los valores dinámicos.
