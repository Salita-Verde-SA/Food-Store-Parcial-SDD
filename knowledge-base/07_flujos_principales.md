# Flujos Principales

---

## Flujo 1: Registro y Login de Cliente

**Disparador**: Usuario no autenticado accede a la plataforma.
**Actor**: Cliente.

**Registro**:
1. Cliente completa formulario (nombre, apellido, email, contraseña)
2. Frontend valida localmente (min 8 chars, formato email)
3. `POST /api/v1/auth/register` → Service verifica unicidad de email → hashea contraseña (bcrypt cost≥12) → crea usuario → asigna rol CLIENT automáticamente → genera access + refresh tokens
4. Frontend: `authStore.login(tokens, user)` → persiste en localStorage → redirige a catálogo

**Login**:
1. `POST /api/v1/auth/login` (rate limited: 5/15min por IP)
2. Service busca usuario por email → compara hash → si válido, genera access token (30min) + refresh token (7días, UUID hasheado en BD)
3. Frontend: `authStore.login(tokens, user)` → Axios interceptor adjunta `Authorization: Bearer <token>` en cada request

**Casos de error**:
- Email ya registrado → 409 Conflict
- Contraseña inválida → 401 (sin revelar si el email existe — RN-AU08)
- >5 intentos en 15min → 429 con `Retry-After`

---

## Flujo 2: Renovación Automática de Token (Transparent Refresh)

**Disparador**: Axios recibe HTTP 401 (token expirado).

```
Request → 401 Unauthorized
    ↓ interceptor detecta 401
    ↓ ¿Hay refresh token en authStore?
    │  SÍ → POST /auth/refresh (rotate: revoca anterior, emite nuevo par)
    │       → authStore.updateTokens(nuevos tokens)
    │       → reintenta request original con nuevo access token
    │
    │  NO / refresh también expirado → authStore.logout() → redirect /login
    │
    └─ Cola: si hay múltiples requests concurrentes y el token expira,
             se encolan y se resuelven todas tras el único refresh
```

**Reglas clave**: RN-AU04 (rotación), RN-AU05 (replay attack → revocar todos los tokens del usuario).

---

## Flujo 3: Ciclo Completo de Compra (Happy Path)

**Disparador**: Cliente autenticado quiere realizar una compra.

```
1. CATÁLOGO
   GET /api/v1/productos → TanStack Query cachea resultados
   Cliente filtra por categoría/búsqueda/alérgenos
   Cliente ve detalle de producto (ingredientes, precio, stock)

2. CARRITO (100% client-side, Zustand + localStorage)
   cartStore.addItem(producto, cantidad, exclusiones[])
   Si producto ya existe → incrementa cantidad (RN-CR03)
   Exclusiones = array de ingredienteIds (RN-CR05)

3. CHECKOUT — Validación
   POST /api/v1/pedidos/validar (o validación inline)
   Backend verifica: disponible=true, stock suficiente, precios actuales
   Si precio cambió → notifica al cliente (US-070)

4. CREACIÓN DE PEDIDO (Unit of Work)
   POST /api/v1/pedidos
   ─── UoW abre transacción ───────────────────────────────
   │  Router → Service.crear_pedido(uow, body, usuario_id)
   │  Service: SELECT FOR UPDATE en cada producto (stock)
   │  Service: calcula total = Σ(cantidad × precio_snapshot) + costo_envio
   │  Service: INSERT Pedido (estado=PENDIENTE)
   │  Service: INSERT DetallePedido × N (con snapshots)
   │  Service: INSERT HistorialEstadoPedido (estado_desde=NULL, estado_hasta=PENDIENTE)
   │  UoW: COMMIT
   ─── Fin transacción ─────────────────────────────────────
   Frontend: cartStore.clearCart() → redirige a pantalla de confirmación

5. PAGO — MercadoPago
   POST /api/v1/pagos/crear (body: { pedidoId })
   Backend: genera idempotency_key UUID → llama MP Orders API
   Frontend: SDK MP renderiza CardPayment component
   Cliente ingresa tarjeta → SDK tokeniza → card_token nunca toca nuestro servidor (PCI SAQ-A)
   POST /api/v1/pagos/crear → Backend llama MP API con card_token

6. WEBHOOK IPN (asíncrono)
   MercadoPago → POST /api/v1/pagos/webhook
   Backend responde 200 inmediatamente
   Backend verifica firma MP
   Backend consulta estado real en API MP (RN-PA04)
   Si approved:
     UoW: UPDATE Pedido estado=CONFIRMADO
         + INSERT HistorialEstadoPedido (actor=SISTEMA)
         + UPDATE Producto stock -= cantidad × N (atómico)
   Backend: idempotency check → ignora duplicados (RN-PA02)

7. SEGUIMIENTO DEL PEDIDO
   Frontend polling cada 30s → GET /api/v1/pedidos/{id}
   TanStack Query invalida caché → UI actualiza estado del pedido
```

---

## Flujo 4: Avance de Estado por Gestor de Pedidos (FSM)

**Disparador**: Gestor de Pedidos avanza un pedido.

```
Gestor accede al panel → GET /api/v1/pedidos?estado=CONFIRMADO
Selecciona un pedido → PATCH /api/v1/pedidos/{id}/estado
  body: { nuevo_estado: "EN_PREP" }

Backend:
  Service.avanzar_estado(uow, pedido_id, nuevo_estado, motivo, usuario_id)
  │
  ├── Verifica que pedido existe y no es terminal (es_terminal=false)
  ├── Consulta mapa de transiciones válidas:
  │   { CONFIRMADO: ["EN_PREP", "CANCELADO"], EN_PREP: ["EN_CAMINO", "CANCELADO"], ... }
  ├── Valida que nuevo_estado es alcanzable desde estado_actual (RN-FS01)
  ├── Si nuevo_estado = CANCELADO → valida motivo obligatorio (RN-FS05)
  ├── Si nuevo_estado = CANCELADO y estado_actual = CONFIRMADO:
  │   → restaura stock de cada DetallePedido (RN-FS05)
  ├── UPDATE Pedido.estado_codigo = nuevo_estado
  └── INSERT HistorialEstadoPedido (append-only — RN-FS07)

Response: 200 PedidoRead con nuevo estado
```

**Casos de error**:
- Transición inválida (ej: ENTREGADO → cualquier cosa) → 422 con mensaje
- Cancelar EN_PREP sin ser ADMIN → 403

---

## Flujo 5: Creación de Pedido — Detalle de Atomicidad (UoW)

**Paso a paso con el patrón Unit of Work:**

| Paso | Capa | Operación | ¿Toca BD? |
|------|------|-----------|-----------|
| 1 | Router | Recibe POST /pedidos. Valida body con CrearPedidoRequest. | No |
| 2 | Router | `async with UnitOfWork() as uow:` → llama `service.crear_pedido(uow, ...)` | No |
| 3 | Service | `uow.productos.get_by_id()` × N. Verifica `disponible=true`. | SELECT |
| 4 | Service | `SELECT FOR UPDATE` stock de cada producto | SELECT |
| 5 | Service | Calcula total = Σ(precio_snapshot × cantidad) + costo_envio | No |
| 6 | Service | `uow.pedidos.create(pedido)` → flush → obtiene pedido.id | INSERT + flush |
| 7 | Service | `uow.detalles.create(detalle)` × N con snapshots | INSERT × N |
| 8 | Service | `uow.historial.create(historial)` — estado_desde=None (RN-FS07) | INSERT |
| 9 | UoW | `__aexit__` sin excepción → `session.commit()` | COMMIT |
| ERR | UoW | Si cualquier paso lanza excepción → `session.rollback()` | ROLLBACK |
| 10 | Router | Serializa respuesta con `PedidoRead.model_validate(pedido)` → HTTP 201 | No |

**Invariante**: o todo persiste, o nada persiste. Nunca estado inconsistente.

---

## Flujo 6: Webhook IPN — Detalle del Procesamiento

**Disparador**: MercadoPago envía POST al webhook con notificación de pago.

```
POST /api/v1/pagos/webhook
  → 1. Responder 200 OK inmediatamente (RN-PA03)
  → 2. Extraer { topic, id } de la notificación
  → 3. Verificar firma/header de MercadoPago
  → 4. Consultar API MP: GET /v1/payments/{id} (RN-PA04 — nunca confiar solo en webhook)
  → 5. Buscar Pago por external_reference (= UUID del pedido)
  → 6. Check idempotencia: ¿ya existe registro con este mp_payment_id? → ignorar si sí
  → 7. UPDATE Pago.mp_status = status_de_mp
  → 8. Según status:
       approved  → UoW: PENDIENTE→CONFIRMADO + decremento stock (RN-FS02, RN-FS03)
       rejected  → Pedido sigue PENDIENTE; cliente puede reintentar (RN-PA06)
       pending   → Solo actualiza Pago, Pedido sigue PENDIENTE (RN-PA07)
       cancelled → Registra, Pedido puede cancelarse
  → 9. INSERT HistorialEstadoPedido si hubo cambio de estado (actor=SISTEMA)
```

---

## Flujo 7: Gestión de Carrito con Zustand

**Sin backend**. Todo en el browser.

```javascript
// Agregar producto al carrito
cartStore.addItem({
  productoId: 42,
  nombre: "Hamburguesa Clásica",
  precio: 1500.00,
  cantidad: 2,
  imagen_url: "...",
  exclusiones: [3, 7]  // IDs de ingredientes excluidos
})

// Si ya existe → incrementa cantidad
// Si cantidad === 0 → elimina automáticamente

// Selectores para evitar re-renders innecesarios:
const total = useCartStore(s => s.totalPrice())
const itemCount = useCartStore(s => s.totalItems())

// Acceso fuera de React (ej: interceptor Axios):
const token = useAuthStore.getState().accessToken
```

**Persistencia**: middleware `persist` de Zustand → `food-store-cart` en localStorage.
El carrito sobrevive a: cerrar tab, refresh, logout/login.
