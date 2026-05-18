## ADDED Requirements

### Requirement: Dashboard de Métricas Comerciales
El sistema MUST proveer a los usuarios con rol `ADMIN` y `PEDIDOS` acceso a un panel de métricas agregadas en tiempo real. Las métricas MUST incluir: ingresos totales facturados, recuento de pedidos agrupados por estado, top 5 productos más vendidos y la evolución temporal de ventas agrupada mediante funciones de base de datos (`DATE_TRUNC`).

#### Scenario: Consulta exitosa de métricas del dashboard por parte de un administrador
- **WHEN** un usuario autenticado con rol `ADMIN` solicita las métricas comerciales al endpoint `/api/v1/admin/dashboard`
- **THEN** el sistema realiza las agregaciones en la base de datos y retorna los datos estructurados en formato JSON para gráficos interactivos.

### Requirement: Gestión y Filtros de Usuarios (RBAC)
El sistema MUST permitir exclusivamente a los usuarios con rol `ADMIN` listar todos los usuarios registrados en el sistema de forma paginada. El listado MUST soportar búsquedas por nombre/email y filtrado por rol y estado (activo/inactivo). El sistema MUST permitir al administrador editar el rol (RBAC) y alternar el estado de cualquier cuenta.

#### Scenario: Listado paginado de usuarios con búsqueda y filtros por rol
- **WHEN** el administrador solicita la lista de usuarios filtrando por el rol `CLIENTE` y buscando `"juan"`
- **THEN** el sistema retorna la lista paginada filtrada y retorna HTTP 200.

#### Scenario: Modificación exitosa de rol y estado de un usuario por el Administrador
- **WHEN** el administrador envía una solicitud PUT a `/api/v1/usuarios/{id}/estado` para desactivar una cuenta
- **THEN** el sistema actualiza el estado en la base de datos y retorna HTTP 200 con el registro modificado.

### Requirement: Invalidación Forzada de Sesiones y Token Revocation
Al desactivarse o bloquearse una cuenta de usuario, el sistema MUST invalidar de forma inmediata cualquier sesión activa. El sistema MUST eliminar de forma atómica todos los Refresh Tokens asociados al usuario en la base de datos y MUST rechazar de inmediato la validación de cualquier JWT activo correspondiente a dicho usuario en subsiguientes peticiones.

#### Scenario: Desactivación de usuario suspende su sesión activa de inmediato
- **WHEN** el administrador inactiva la cuenta de un usuario cliente
- **THEN** el sistema elimina sus refresh tokens de la BD, y cualquier intento subsiguiente del cliente de usar su token JWT o refrescar sesión es rechazado retornando HTTP 401.

### Requirement: Configuración Dinámica del Sistema (Key-Value)
El sistema MUST persistir parámetros operativos globales en una tabla dinámica key-value (`Configuracion`) en la base de datos. La modificación de esta configuración global MUST estar estrictamente restringida a usuarios con rol `ADMIN`. Los cambios aplicados (como el costo de envío o el estado del local abierto/cerrado) MUST impactar de forma inmediata en las validaciones de los pedidos y cotizaciones del sistema.

#### Scenario: Modificación exitosa de costo de envío global por el Administrador
- **WHEN** el administrador actualiza el valor de la clave `costo_envio` a `75.00`
- **THEN** el sistema actualiza el valor en la base de datos de forma inmediata y todos los nuevos pedidos cotizan con el nuevo costo de envío de forma automática.
