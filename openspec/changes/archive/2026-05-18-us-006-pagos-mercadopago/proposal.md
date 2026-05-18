## Why

Actualmente, los pedidos creados en la plataforma permanecen indefinidamente en estado `PENDIENTE` sin posibilidad de cobro automatizado ni verificación. Para completar el ciclo de negocio, se requiere integrar una pasarela de pagos robusta e industrial. La integración de Mercado Pago (Checkout API) habilita el pago inmediato con tarjetas de crédito/débito y efectivo (Rapipago/Pago Fácil), automatizando la confirmación de pedidos mediante webhooks asíncronos y garantizando que el stock de la cocina se reserve de forma definitiva únicamente cuando el cobro esté confirmado.

## What Changes

*   **Integración del SDK de Mercado Pago (Frontend)**: Carga del SDK oficial y uso de componentes seguros de tokenización de tarjetas (Card Form) en el navegador del cliente para cumplir con los estándares de seguridad PCI-DSS SAQ-A (nunca manipular datos de tarjetas en bruto en nuestro frontend).
*   **Gestión de Órdenes y Transacciones (Backend)**: Nueva entidad y tabla de base de datos `Pago` para registrar la trazabilidad de los cobros, su clave de idempotencia (`idempotency_key` UUID) y su estado provisto por Mercado Pago.
*   **Webhook IPN para Eventos Asíncronos (Backend)**: Endpoint público y no autenticado `/api/v1/pagos/webhook` para procesar notificaciones de cobro asíncronas.
*   **Garantía de Idempotencia Estricta**: Procesamiento seguro que valida que un mismo `payment_id` de Mercado Pago nunca se aplique dos veces para evitar duplicaciones y mantener la integridad del negocio.
*   **Confirmación Atómica y FSM**: Transición transaccional de pedidos de `PENDIENTE` a `CONFIRMADO` disparada por el webhook IPN al recibir la confirmación de pago aprobado (`approved`), lo que a su vez decrementa de forma definitiva el stock del catálogo en base de datos.
*   **Manejo de Rechazos**: Posibilidad de reintentar pagos fallidos para un pedido existente, regenerando dinámicamente un nuevo `idempotency_key`.

## Capabilities

### New Capabilities
- `pagos`: Sistema completo de orquestación de pagos, tokenización segura de tarjetas de crédito/débito y pasarelas de efectivo offline, persistencia de transacciones y webhook IPN asíncrono.

### Modified Capabilities
- `pedidos`: Incorporación de la confirmación automática de pedidos mediante el flujo de aprobación asíncrona de pagos, enlazando el decremento transaccional de stock únicamente tras recibir la confirmación del dinero.

## Impact

*   **APIs y Endpoints**:
    *   `POST /api/v1/pedidos/{id}/pagar`: Generación de la orden de pago o preferencia con Mercado Pago.
    *   `POST /api/v1/pagos/webhook`: Endpoint público para Mercado Pago (excluido de autenticación JWT).
*   **Base de Datos**: Nueva tabla `pago` vinculada a `pedido` con campos para `mp_payment_id`, `mp_status`, `idempotency_key`, `created_at` and `updated_at`.
*   **Dependencias**: Incorporación de `@mercadopago/sdk-react` en el frontend y del cliente HTTP de simulación/SDK en el backend.
*   **Variables de Entorno**: Adición de `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` para autenticación y firma de webhooks.
