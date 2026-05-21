# display-cocina Specification

## ADDED Requirements

### Requirement: Canal de Eventos en Tiempo Real (SSE Stream)
El sistema MUST proveer un canal de comunicación unidireccional en tiempo real basado en Server-Sent Events (SSE) a través del endpoint `/api/v1/cocina/events`. Este canal MUST estar restringido a usuarios autenticados con los roles de `ADMIN`, `PEDIDOS` o `COCINA`. El canal MUST emitir eventos cuando ocurran cambios de estado relevantes del pedido (`PEDIDO_CONFIRMADO`, `PEDIDO_EN_PREPARACION`, `PEDIDO_EN_CAMINO`, `PEDIDO_CANCELADO`).

#### Scenario: Suscripción exitosa a eventos en tiempo real
- **WHEN** un usuario autenticado con rol `COCINA` realiza una petición GET `/api/v1/cocina/events` con un token JWT válido
- **THEN** el sistema establece una conexión persistente SSE con formato `text/event-stream` y retorna HTTP 200.

#### Scenario: Rechazo de conexión por falta de autorización
- **WHEN** un usuario con rol `CLIENTE` o un usuario anónimo intenta conectarse a `/api/v1/cocina/events`
- **THEN** el sistema rechaza la conexión y retorna HTTP 403 o 401 según corresponda.

### Requirement: Listado y Endpoint REST de Respaldo KDS
El sistema MUST proveer un endpoint `/api/v1/cocina/pedidos` para consultar activamente los pedidos pendientes de cocina (aquellos en estado `CONFIRMADO` y `EN_PREP`). Este endpoint MUST estar restringido a los roles `ADMIN`, `PEDIDOS` y `COCINA`, y servirá de respaldo si ocurre una desconexión del canal en tiempo real. Los ítems de los pedidos retornados MUST incluir su cantidad, nombre, y las `notas` de personalización asociadas al pedido.

#### Scenario: Consulta exitosa de pedidos KDS
- **WHEN** un usuario con rol `COCINA` consulta `GET /api/v1/cocina/pedidos`
- **THEN** el sistema retorna una lista con todos los pedidos activos en cocina en estado `CONFIRMADO` o `EN_PREP` ordenados cronológicamente por su fecha de creación, devolviendo HTTP 200.

### Requirement: Alertas Visuales y Sonoras en el Cliente
La aplicación frontend del KDS en `/cocina` MUST reproducir una alerta sonora breve (usando Web Audio API) e implementar un efecto visual distintivo (destello o bounce) en la interfaz cada vez que se reciba un evento de nuevo pedido (`PEDIDO_CONFIRMADO`) por el canal SSE. Esta alerta MUST poder ser desactivada temporalmente por el operario mediante un control de silencio en pantalla.

#### Scenario: Alerta visual y sonora ante nuevo pedido confirmado
- **WHEN** el cliente del KDS recibe el evento `PEDIDO_CONFIRMADO` vía SSE y el sonido no está silenciado
- **THEN** la aplicación reproduce el sonido de notificación, añade la tarjeta del pedido a la columna "Por preparar" en tiempo real con una animación visual, y actualiza el contador global.

### Requirement: Semáforo Visual del Timer de Urgencia
La interfaz del KDS MUST mostrar un contador de tiempo de espera dinámico para cada pedido. Este contador se calcula de manera reactiva en el cliente como la diferencia entre la hora actual y la hora en que el pedido ingresó al estado `CONFIRMADO`. El color y estilo visual de la tarjeta de pedido MUST actualizarse de forma automática según los siguientes umbrales:
- Menos de 10 minutos transcurridos: Verde (Tranquilo).
- Entre 10 y 20 minutos transcurridos: Naranja (Advertencia).
- Más de 20 minutos transcurridos: Rojo con parpadeo sutil (Urgente).

#### Scenario: Actualización de color de la tarjeta según el tiempo transcurrido
- **WHEN** transcurren 10 minutos desde que el pedido entró a la cola del KDS en estado `CONFIRMADO`
- **THEN** la tarjeta del pedido en pantalla cambia automáticamente su borde y fondo a tono naranja de advertencia sin recargar la página.
