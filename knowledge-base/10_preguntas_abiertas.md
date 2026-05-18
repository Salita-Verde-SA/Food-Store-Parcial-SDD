# Preguntas Abiertas

## Inconsistencias detectadas

### IN-01 — Modo async del driver de PostgreSQL
**Integrador.txt dice**: Usa SQLModel con FastAPI (implica async).
**Descripcion.txt dice**: No especifica si usar `psycopg2` (sync) o `asyncpg` (async nativo).
**Impacto**: Si se elige mal, el UoW necesitaría refactorización completa. `asyncpg` tiene mejor performance pero setup más complejo con SQLModel.
**Resolución propuesta**: Usar `psycopg2` con `async def` en routers para versión académica. SQLModel async native aún no es estable al 100%.

---

### IN-02 — Almacenamiento del refresh token: hash SHA-256 vs UUID directo
**Historias_de_usuario.txt dice**: "El refresh token es un UUID v4 opaco almacenado en BD" (RN-AU03).
**Integrador.txt dice**: Implica almacenamiento seguro pero no especifica hashing.
**Impacto**: Si se almacena en plaintext y la BD es expuesta, todos los tokens son válidos.
**Resolución propuesta**: Almacenar `SHA256(token)` en BD. El token UUID real solo va al cliente. Seguro y consistente con las mejores prácticas.

---

### IN-03 — Estructura del snapshot de dirección en Pedido
**Historias_de_usuario.txt dice**: Dos alternativas: campos individuales (`direccion_calle`, `direccion_numero`, etc.) o un JSON serializado (`direccion_snapshot`).
**Impacto**: Si se elige JSON, la consulta del historial es más flexible pero menos consultable via SQL. Si se eligen campos individuales, hay más columnas en la tabla Pedido.
**Resolución propuesta**: Campos individuales en la tabla Pedido. Más limpio para queries y reportes en el dashboard de métricas.

---

### IN-04 — `es_terminal` en EstadoPedido: campo vs. hardcoded
**Contexto**: La FSM necesita saber qué estados son terminales para rechazar transiciones.
**Opción A**: Campo `es_terminal BOOLEAN` en tabla EstadoPedido (en seed: ENTREGADO=true, CANCELADO=true).
**Opción B**: Lista hardcoded en el Service: `ESTADOS_TERMINALES = {"ENTREGADO", "CANCELADO"}`.
**Impacto**: Opción A es más flexible y auto-documentada desde la BD. Opción B es más simple y sin consulta extra.
**Resolución propuesta**: Opción A — campo en BD, cargado una vez al arrancar (o consultado en cada transición). Consistente con el principio de "datos como verdad".

---

### IN-05 — Forma de pago en el pedido: ¿al crear o al pagar?
**Contexto**: El pedido se crea ANTES del pago. La forma de pago (tarjeta, Rapipago) se selecciona en el checkout de MP.
**Pregunta**: ¿El campo `forma_pago_codigo` en Pedido se setea al crear el pedido o al confirmar el pago?
**Impacto**: Si se setea al crear, el cliente debe elegir antes de pagar. Si se setea al pagar (via webhook), el campo puede ser NULL inicialmente.
**Resolución propuesta**: `forma_pago_codigo` es NULLABLE al crear; se actualiza al procesar el webhook de MP con el método de pago confirmado.

---

## Preguntas abiertas (priorizadas)

| Prioridad | Pregunta | Bloquea | Decisor |
|-----------|----------|---------|---------|
| **Alta** | ¿Driver sync (`psycopg2`) o async (`asyncpg`) para PostgreSQL? | `us-000-setup` | Tech Lead |
| **Alta** | ¿El campo `forma_pago_codigo` en Pedido es nullable al crear? | `us-005-pedidos` | Tech Lead |
| **Alta** | ¿Snapshot de dirección: campos individuales o JSON serializado? | `us-005-pedidos` | Tech Lead |
| **Alta** | ¿Cómo se genera la URL de webhook en desarrollo local? ¿Requiere ngrok? | `us-006-pagos-mercadopago` | Tech Lead |
| **Media** | ¿El endpoint `POST /pagos/crear` crea preferencia MP o el pago directo? | `us-006-pagos-mercadopago` | Tech Lead |
| **Media** | ¿Qué formas de pago de MP están habilitadas (tarjeta + Rapipago + Pago Fácil)? | `us-006-pagos-mercadopago` | PO |
| **Media** | ¿El dashboard de métricas incluye exportar a CSV/Excel? | `us-007-admin` | PO |
| **Media** | ¿Los ingredientes son globales o por producto? (Global según spec — confirmar) | `us-003-productos` | PO |
| **Baja** | ¿Se necesita modo offline para el carrito? | `us-004-carrito` | PO |
| **Baja** | ¿El carrito debe sincronizarse entre dispositivos en alguna versión futura? | No bloquea | PO |
| **Baja** | ¿`Rapipago`/`Pago Fácil` necesitan flujo especial en frontend o es transparente via MP? | `us-006-pagos-mercadopago` | Tech Lead |

---

## Gotchas y edge cases identificados

### GE-01 — Detección de replay attack en refresh tokens
Si el `revoked_at` de un token es NOT NULL y alguien lo usa → revocar TODOS los tokens del usuario (RN-AU05). Este es el caso más crítico de seguridad y fácil de olvidar.

### GE-02 — `SELECT FOR UPDATE` en creación de pedido
Sin este lock, dos pedidos simultáneos podrían consumir el mismo stock. FastAPI async + psycopg2 sync necesitan cuidado especial para que el lock funcione correctamente dentro del UoW.

### GE-03 — Idempotencia del webhook
El webhook de MP puede llegar múltiples veces con el mismo `payment_id`. SIEMPRE verificar si ya existe un registro de pago con ese `mp_payment_id` antes de procesar. Ignorar si ya fue procesado.

### GE-04 — Restauración de stock al cancelar
Solo restaurar stock si el pedido cancelado estaba en CONFIRMADO (stock ya descontado). Si venía de PENDIENTE (pago nunca aprobado), el stock nunca fue descontado → no restaurar.

### GE-05 — Estado predeterminada único en DireccionEntrega
Al marcar una dirección como predeterminada, hacer `UPDATE DireccionEntrega SET es_principal=false WHERE usuario_id=? AND es_principal=true` ANTES del `UPDATE` en la nueva. Hacerlo en una sola transacción.

### GE-06 — Zustand fuera de componentes React
El interceptor de Axios se registra en `shared/api/axios.ts` (fuera del árbol de React). Para leer el token del store, usar `useAuthStore.getState().accessToken` (getter directo, no hook).

### GE-07 — `deleted_at` en el BaseRepository
El `list_all()` y `get_by_id()` del BaseRepository deben filtrar `WHERE deleted_at IS NULL` por defecto. Los endpoints de admin pueden pasarle `incluir_eliminados=True` para bypasear este filtro.

### GE-08 — Primer registro de HistorialEstadoPedido
El primer INSERT siempre tiene `estado_desde=NULL` (RN-FS09). Esto no es un error — es la semántica correcta para el registro inicial del pedido en PENDIENTE.
