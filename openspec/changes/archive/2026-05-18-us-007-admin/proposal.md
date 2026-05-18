## Why

El sistema de Food Store carece actualmente de una interfaz centralizada y endpoints seguros de control para los administradores y gestores. Para garantizar el control operativo del negocio, es imperativo proveer un Panel de Administración robusto que permita monitorear el rendimiento comercial (Dashboard de métricas), gestionar los accesos y roles de usuarios (RBAC), e invalidar de forma forzada sesiones activas de usuarios suspendidos para prevenir accesos no autorizados.

## What Changes

*   **Panel Administrativo Centralizado**: Interfaz premium FSD en React con navegación colapsable y diseño optimizado para administradores.
*   **Dashboard de Métricas Comerciales**: Gráficos interactivos de ventas históricas, estado de pedidos y top 5 productos más vendidos implementados con `recharts`.
*   **Gestión y Filtros de Usuarios**: Listado administrativo con búsqueda, filtros por rol y estado, y cambio dinámico de roles (RBAC).
*   **Invalidación Forzada de Sesiones**: Endpoint para desactivar usuarios que elimina atómicamente sus Refresh Tokens de la BD y bloquea la validación JWT de forma inmediata.
*   **CRUD de Catálogo Centralizado**: Formularios de administración para el CRUD de productos, alérgenos y categorías con validación de roles en backend.
*   **Configuración del Sistema Key-Value**: Tabla de persistencia dinámica en base de datos para variables operativas globales (costo de envío, estado abierto/cerrado del restaurante) modificables online.

## Capabilities

### New Capabilities
- `admin`: Panel administrativo, agregación de métricas comerciales con SQL, control de usuarios con invalidación de sesiones y configuración dinámica del sistema.

### Modified Capabilities
<!-- No requirement changes in existing capabilities, catalog and orders are simply locked down using the new admin role restrictions. -->

## Impact

*   **APIs**: Nuevos endpoints bajo `/api/v1/admin/dashboard` y `/api/v1/admin/configuracion`. Nuevas rutas de gestión en `/api/v1/usuarios`.
*   **Base de Datos**: Nueva tabla `Configuracion` (parámetros key-value) y trigger/indexación para búsquedas rápidas.
*   **Seguridad**: Invalidation de tokens JWT de forma instantánea al inhabilitar una cuenta.
*   **Frontend**: Carpeta `frontend/src/pages/admin/` (DashboardPage, UsuariosPage, CatálogoPage, ConfigPage) y enrutamiento protegido para roles `ADMIN`, `PEDIDOS` y `STOCK`.
