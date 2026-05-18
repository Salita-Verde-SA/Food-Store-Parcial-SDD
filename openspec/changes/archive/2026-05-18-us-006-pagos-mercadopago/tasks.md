## 1. Modelado de Datos y Backend (Pagos)

- [x] 1.1 Crear el modelo de datos SQLModel `Pago` en el módulo de pagos con clave de idempotencia y vinculación transaccional con el pedido.
- [x] 1.2 Desarrollar esquemas Pydantic `CrearPagoRequest` y `PagoResponse` para estructurar y validar peticiones HTTP.
- [x] 1.3 Implementar `PagoService.crear_preferencia_pago` con soporte de reintentos actualizando el idempotency_key sobre el mismo pedido y comunicándose de forma segura con la API de preferencias de Mercado Pago.

## 2. Webhook IPN, Seguridad y Auditoría (Backend)

- [x] 2.1 Desarrollar el enrutador HTTP de pagos en `router.py` incluyendo el endpoint público `/webhook` gestionado con tareas en segundo plano.
- [x] 2.2 Implementar en `PagoService.procesar_webhook_ipn` la lógica de consulta backchannel asíncrona a la API oficial de Mercado Pago para verificar la autenticidad y estado verídico del cobro.
- [x] 2.3 Garantizar idempotencia absoluta mediante bloqueo de fila `.with_for_update()` en base de datos para impedir re-decrementos de stock o reprocesamientos concurrentes.
- [x] 2.4 Integrar la acreditación de pagos con la máquina de estados (FSM) de pedidos avanzando el estado del pedido automáticamente a `CONFIRMADO` con decremento transaccional de stock.

## 3. Integración del Cliente en Pasarela (Frontend FSD)

- [x] 3.1 Implementar en el frontend las llamadas seguras a los endpoints de pagos (`crearPago`, `consultarPago`, `simularWebhook`) en `pagos.ts`.
- [x] 3.2 Diseñar la página de Checkout (`CheckoutPage.tsx`) con un Brick seguro simulado de tarjeta de crédito/débito para tokenización en cliente.
- [x] 3.3 Enlazar el flujo de compra para que al pagar con Mercado Pago genere la preferencia, simule el webhook asíncrono y redirija al usuario con feedback visual animado de éxito.
