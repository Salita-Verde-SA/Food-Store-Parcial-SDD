## Context

La pasarela de pagos representa el cierre del ciclo transaccional. Actualmente, el backend cuenta con soporte estructural para crear preferencias de pago con Mercado Pago (`PagoService.crear_preferencia_pago`) e impactar el estado del pedido a través de un Webhook IPN público y no autenticado (`POST /api/v1/pagos/webhook`). El frontend (`CheckoutPage.tsx`) tiene una interfaz integrada con un simulador de tarjetas seguro que dispara la creación de preferencias y simula la recepción asíncrona del webhook. Este diseño formaliza el flujo de integración de punta a punta, la seguridad de firmas y las estrategias de idempotencia.

## Goals / Non-Goals

**Goals:**
*   **Idempotencia Absoluta**: Garantizar que bajo ninguna circunstancia (latencia, reintentos de red del webhook, clics múltiples) se procese dos veces el mismo cobro aprobado ni se descuente doble stock.
*   **Seguridad de Backchannel**: Validar digitalmente cada notificación IPN realizando una llamada de verificación externa directa contra la API de Mercado Pago antes de procesar el pago.
*   **Trazabilidad Transaccional**: Persistir cada intento y reintento en la base de datos vinculando `Pago` a `Pedido`.
*   **Estabilidad Offline**: Soportar testing local 100% desconectado del entorno real de producción mediante simulaciones sandbox ágiles.

**Non-Goals:**
*   Reescribir los esquemas, routers o servicios del backend de pagos ya implementados y validados estructuralmente.
*   Modificar la base de datos física mediante nuevas tablas o migraciones, dado que el modelo de datos de `Pago` ya cubre todos los campos requeridos (`idempotency_key`, `payment_id`, `status`).

## Decisions

### 1. Relación 1:N de Reintentos de Pago Simulada via Update
*   **Decisión**: La base de datos define una relación uno a uno física en `Pago` (`pedido_id: unique=True`). Para soportar el requerimiento de negocio de "reintentar pagos rechazados generando un nuevo idempotency_key" sin contaminar la BD con registros huérfanos, el servicio (`PagoService.crear_preferencia_pago`) detecta si ya existe un registro previo en estado `pending` o `rejected`. En tal caso, genera un nuevo UUID para `idempotency_key`, revierte el estado a `pending`, actualiza `updated_at` y sobrescribe el registro del pago actual para iniciar la nueva preferencia con Mercado Pago.
*   **Alternativa Considerada**: Eliminar la restricción de unicidad (`unique=True`) y permitir filas ilimitadas por pedido. Se descartó para evitar el crecimiento innecesario de la tabla de pagos en intentos fallidos continuos y simplificar las consultas de UI.

### 2. Procesamiento Asíncrono de Webhook IPN con FastAPI `BackgroundTasks`
*   **Decisión**: Mercado Pago exige que el webhook responda inmediatamente (en menos de 2 segundos) para evitar acumulación de reintentos de red automáticos. El endpoint `/pagos/webhook` responde `HTTP 200 {"status": "ok"}` de forma instantánea y delega el procesamiento pesado (la validación HTTPS externa de la transacción y la actualización atómica del pedido con reducción de stock) a `BackgroundTasks` en un hilo secundario del backend.
*   **Alternativa Considerada**: Procesar el pago de forma síncrona en el request HTTP principal. Se descartó por el altísimo riesgo de generar time-outs y bloqueos ante latencia de la API de Mercado Pago.

### 3. Validación por Consulta Directa de Backchannel
*   **Decisión**: Los payloads enviados en los webhooks pueden ser interceptados o falsificados. Para garantizar seguridad PCI SAQ-A, el servicio del backend ignora el estado enviado en el payload raw de la notificación, extrae únicamente el `payment_id`, y realiza un request HTTP GET seguro directo ("backchannel") a `https://api.mercadopago.com/v1/payments/{payment_id}` usando el `MP_ACCESS_TOKEN` del backend. Únicamente si la API oficial reporta `approved` se procede a avanzar el pedido.
*   **Alternativa Considerada**: Confiar en el estado (`status: approved`) recibido directamente en el cuerpo del webhook. Se descartó categóricamente por constituir una vulnerabilidad severa de seguridad (spoofing).

### 4. Bloqueo Transaccional `.with_for_update()` para Idempotencia
*   **Decisión**: Al recibir el webhook, se ejecuta un select con bloqueo exclusivo sobre la fila del `Pago` correspondiente (`select(Pago)...with_for_update()`). Si se detecta que el estado local en la base de datos ya es `approved`, el servicio retorna inmediatamente sin realizar ninguna acción, previniendo condiciones de carrera si dos webhooks concurrentes impactan sobre la misma transacción.

## Risks / Trade-offs

*   **[Riesgo: Timeouts / Latencia en la pasarela externa]** → *Mitigación*: Se implementa el simulador local robusto. Si `MP_ACCESS_TOKEN` está configurado como `"TEST-MP-TOKEN"`, la llamada externa se puentea automáticamente, retornando un `preference_id` y `payment_id` simulados en microsegundos, asegurando fluidez total en testing local.
*   **[Riesgo: Múltiples clics de compra rápidos en Frontend]** → *Mitigación*: El botón "Confirmar y Comprar" del Checkout bloquea su interacción mediante un spinner animado e inyecta un overlay oscuro (`isProcessing=true`), impidiendo nuevas solicitudes concurrentes del cliente.
