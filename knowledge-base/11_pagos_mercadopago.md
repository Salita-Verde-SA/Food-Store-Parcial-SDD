# Integración MercadoPago

## Contexto de la integración

Food Store integra MercadoPago Checkout API para procesar pagos. El objetivo es cumplir con el nivel PCI DSS SAQ-A: los datos de tarjeta **nunca tocan nuestro servidor**.

## Flujo técnico completo

```
FRONTEND                          BACKEND                      MERCADOPAGO
    │                                 │                              │
    │ 1. POST /pagos/crear            │                              │
    │   { pedidoId }                  │                              │
    ├────────────────────────────────►│                              │
    │                                 │ 2. Generar idempotency_key   │
    │                                 │    (UUID, almacenar en BD)   │
    │                                 │                              │
    │                                 │ 3. POST /v1/orders           │
    │                                 │   { items, payer,             │
    │                                 │     external_reference,      │
    │                                 │     notification_url }        │
    │                                 ├─────────────────────────────►│
    │                                 │◄─────────────────────────────┤
    │                                 │   { preference_id }          │
    │◄────────────────────────────────┤                              │
    │  { preference_id,               │                              │
    │    idempotency_key }            │                              │
    │                                 │                              │
    │ 4. SDK MP renderiza             │                              │
    │    CardPayment component        │                              │
    │                                 │                              │
    │ 5. Cliente ingresa tarjeta      │                              │
    │    SDK tokeniza (PCI SAQ-A)     │                              │
    │                                 │                              │
    │ 6. MP procesa pago              │                              │
    │                                 │                              │
    │           7. Webhook IPN ────────────────────────────────────►│
    │                                 │◄─────────────────────────────┤
    │                                 │  POST /pagos/webhook          │
    │                                 │  { topic: "payment", id: X } │
    │                                 │                              │
    │                                 │ 8. Responder 200 OK inmediato│
    │                                 │                              │
    │                                 │ 9. GET /v1/payments/{X}      │
    │                                 ├─────────────────────────────►│
    │                                 │◄─────────────────────────────┤
    │                                 │  { status: "approved", ... } │
    │                                 │                              │
    │                                 │ 10. UoW: PENDIENTE→CONFIRMADO│
    │                                 │     + decremento stock       │
    │                                 │     + INSERT historial       │
    │                                 │                              │
    │  11. Frontend polling           │                              │
    │  GET /pedidos/{id}              │                              │
    │  estado: CONFIRMADO ✅          │                              │
```

## Endpoints involucrados

### Backend → MercadoPago

| Acción | Endpoint MP | Cuándo |
|--------|-------------|--------|
| Crear orden/preferencia | `POST /v1/orders` | Al iniciar checkout |
| Verificar pago | `GET /v1/payments/{id}` | Al recibir webhook |
| Consultar orden | `GET /v1/orders/{id}` | Opcional — polling |

### MercadoPago → Backend (Webhook IPN)

| Evento | Acción backend |
|--------|---------------|
| `payment.approved` | PENDIENTE→CONFIRMADO + decremento stock |
| `payment.rejected` | Solo actualiza tabla Pago — Pedido sigue PENDIENTE |
| `payment.pending` | Solo actualiza tabla Pago — Pedido sigue PENDIENTE |
| `payment.cancelled` | Solo actualiza tabla Pago |

## Modelo de datos de Pago

```python
class Pago(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    pedido_id: int = Field(foreign_key="pedido.id", index=True)
    mp_payment_id: Optional[int] = Field(unique=True, nullable=True)
    mp_status: str  # "pending" | "approved" | "rejected" | "in_process" | "cancelled"
    monto: Decimal = Field(decimal_places=2, max_digits=10)
    external_reference: str = Field(unique=True)  # UUID del pedido
    idempotency_key: str = Field(unique=True)      # UUID generado por backend
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
```

## Variables de entorno necesarias

| Variable | Descripción | Sandbox |
|---------|-------------|---------|
| `MP_ACCESS_TOKEN` | Token de acceso backend (privado) | `TEST-xxx-xxx` |
| `VITE_MP_PUBLIC_KEY` | Clave pública para SDK frontend | `TEST-xxx-xxx` |
| `MP_NOTIFICATION_URL` | URL del webhook IPN | `https://xxx.ngrok.io/api/v1/pagos/webhook` |

> **Nota en desarrollo local**: MercadoPago necesita una URL pública para enviar webhooks.
> Usar `ngrok http 8000` para exponer el servidor local.
> La URL del ngrok debe actualizarse en `.env` cada vez que se reinicia ngrok (a menos de pagar una cuenta fija).

## Tarjetas de prueba (sandbox)

| Resultado | Número de tarjeta | CVV | Vencimiento |
|-----------|------------------|-----|-------------|
| Aprobado | 5031 7557 3453 0604 | 123 | 11/25 |
| Rechazado | 4000 0000 0000 0002 | 123 | 11/25 |
| Pendiente | 4000 0000 0000 0044 | 123 | 11/25 |

> Referencia oficial: https://www.mercadopago.com.ar/developers/es/docs/checkout-api/integration-test/test-cards

## Reglas críticas (resumen)

| Código | Regla |
|--------|-------|
| RN-PA01 | Tokenización 100% en browser via SDK — nunca raw card data en servidor |
| RN-PA02 | `idempotency_key` UUID único por intento de pago — webhooks duplicados se ignoran |
| RN-PA03 | Webhook responde 200 OK inmediatamente — procesar de forma asíncrona o en background |
| RN-PA04 | Siempre verificar estado real via API MP — no confiar en datos del webhook |
| RN-PA09 | `external_reference` = UUID del pedido — vincula orden MP con pedido Food Store |
