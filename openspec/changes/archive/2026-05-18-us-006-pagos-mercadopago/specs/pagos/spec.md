## ADDED Requirements

### Requirement: Creación de Preferencias de Pago (Mercado Pago)
El sistema MUST permitir a los clientes generar una orden o preferencia de pago en Mercado Pago para pedidos que se encuentren en estado `PENDIENTE`. El sistema MUST generar un `idempotency_key` (UUID v4) único y asociar la preferencia persistiendo el registro de `Pago` en estado `PENDIENTE`. El sistema MUST tokenizar las tarjetas 100% en el cliente mediante el SDK seguro de Mercado Pago ( PCI SAQ-A ).

#### Scenario: Creación exitosa de preferencia de pago para pedido pendiente
- **WHEN** un cliente autenticado solicita generar una preferencia de pago para un pedido propio en estado `PENDIENTE`
- **THEN** el sistema se comunica con Mercado Pago, genera el `preference_id`, registra el pago como `PENDIENTE` junto a su `idempotency_key` y retorna la información de pago.

### Requirement: Procesamiento de Webhook IPN Asíncrono y Firma Segura
El sistema MUST exponer un endpoint público `POST /api/v1/pagos/webhook` para recibir notificaciones asíncronas de Mercado Pago. El sistema MUST responder inmediatamente `HTTP 200 OK` al recibir la notificación para evitar time-outs. El sistema MUST validar la autenticidad del webhook verificando la firma digital utilizando la clave compartida (`MP_WEBHOOK_SECRET`). El sistema MUST realizar una consulta asíncrona ("backchannel") directamente a la API oficial de Mercado Pago utilizando el `payment_id` del evento para constatar el estado real y verídico de la transacción.

#### Scenario: Recepción exitosa y validación de firma de Webhook
- **WHEN** Mercado Pago envía una notificación IPN con firma válida al endpoint público de webhook
- **THEN** el sistema responde de inmediato con `HTTP 200 OK`, valida la firma de seguridad, consulta asíncronamente a la API de Mercado Pago el estado real de la transacción y actualiza el estado en base de datos.

### Requirement: Garantía de Idempotencia en Aprobación de Pagos
El sistema MUST asegurar el procesamiento idempotente del webhook. Si se recibe una notificación para un `payment_id` de Mercado Pago que ya fue procesado como aprobado (`approved`), el sistema MUST ignorar el evento de forma segura sin disparar re-decrementos de stock, transiciones repetidas de la FSM de pedidos, ni nuevos registros de auditoría en la base de datos.

#### Scenario: Notificación de pago duplicada es ignorada de forma segura
- **WHEN** el webhook recibe una notificación de pago `approved` cuyo `payment_id` ya está registrado en la base de datos como aprobado
- **THEN** el sistema confirma la recepción devolviendo `HTTP 200 OK` pero no altera el estado del pedido, no reduce stock ni inserta nuevos historiales.

### Requirement: Reintento de Pago Fallido/Rechazado
El sistema MUST permitir generar una nueva preferencia de pago para un pedido cuyo pago anterior haya sido rechazado o haya fallado. El sistema MUST permitir la creación de una nueva transacción de pago para el mismo pedido `PENDIENTE` generando un nuevo y único `idempotency_key` para evitar conflictos con la transacción fallida previa.

#### Scenario: Regeneración exitosa de preferencia tras rechazo de tarjeta
- **WHEN** un cliente intenta pagar un pedido previo cuyo primer pago fue rechazado por fondos insuficientes
- **THEN** el sistema permite crear una nueva orden de pago con Mercado Pago para el mismo pedido, asignando un nuevo `idempotency_key` UUID único y retornando el nuevo token de pago.
