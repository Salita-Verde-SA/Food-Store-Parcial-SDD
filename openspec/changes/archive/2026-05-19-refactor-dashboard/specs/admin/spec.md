## MODIFIED Requirements

### Requirement: Dashboard de Métricas Comerciales
El sistema MUST proveer a los usuarios con rol `ADMIN` y `PEDIDOS` acceso a un panel de métricas agregadas en tiempo real. Las métricas MUST incluir: ingresos totales facturados, recuento de pedidos agrupados por estado, top 5 productos más vendidos y la evolución temporal de ventas agrupada mediante funciones de base de datos (`DATE_TRUNC`).

#### Scenario: Consulta exitosa de métricas del dashboard por parte de un administrador
- **WHEN** un usuario autenticado con rol `ADMIN` solicita las métricas comerciales al endpoint `/api/v1/admin/dashboard`
- **THEN** el sistema realiza las agregaciones en la base de datos y retorna los datos estructurados en formato JSON para gráficos interactivos.
