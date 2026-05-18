# Reglas de Negocio

Cada regla tiene un código único `RN-{DOMINIO}-{NN}` para trazabilidad con las historias de usuario.

---

## Dominio: Autenticación (RN-AU)

| ID | Regla | US relacionadas |
|----|-------|-----------------|
| **RN-AU01** | La contraseña NUNCA se almacena en texto plano; se hashea con bcrypt (cost factor ≥ 10) con salt automático | US-001, US-063 |
| **RN-AU02** | El access token JWT tiene duración de 30 minutos, contiene userId, email y roles, firmado con HS256 | US-002, US-003 |
| **RN-AU03** | El refresh token tiene duración de 7 días, es un UUID v4 opaco almacenado hasheado (SHA-256) en BD | US-002, US-003 |
| **RN-AU04** | Al usar un refresh token se aplica rotación: el anterior se revoca y se emite uno nuevo | US-003 |
| **RN-AU05** | Si se detecta reuso de un refresh token ya utilizado (replay attack), se revocan TODOS los tokens del usuario | US-003 |
| **RN-AU06** | Rate limiting en login: máximo 5 intentos por IP en ventana de 15 minutos; excedido → HTTP 429 | US-002, US-073 |
| **RN-AU07** | Al registrarse se asigna automáticamente el rol CLIENT en la capa Service; NO viene del request | US-001 |
| **RN-AU08** | La respuesta de login NO distingue "email no existe" de "contraseña incorrecta" (seguridad anti-enumeration) | US-002 |
| **RN-AU09** | Los datos sensibles de tarjetas NUNCA pasan por el servidor de Food Store (PCI DSS SAQ-A) | US-045 |
| **RN-AU10** | El archivo `.env` con secrets NUNCA se commitea al repositorio | US-000 |

---

## Dominio: Autorización y Roles (RN-RB)

| ID | Regla | US relacionadas |
|----|-------|-----------------|
| **RN-RB01** | Existen 4 roles fijos con IDs estables: ADMIN(1), STOCK(2), PEDIDOS(3), CLIENT(4) | US-000b, US-005 |
| **RN-RB02** | Un usuario puede tener múltiples roles simultáneamente (M2M con UNIQUE compuesta) | US-005 |
| **RN-RB03** | Solo ADMIN puede asignar/modificar roles de otros usuarios | US-005, US-054 |
| **RN-RB04** | Un ADMIN no puede quitarse el rol ADMIN si es el último admin del sistema | US-005, US-054 |
| **RN-RB05** | Un CLIENT solo puede ver y operar sobre sus propios datos, nunca los de otros | US-049, US-050, US-025 |
| **RN-RB06** | STOCK NO tiene acceso a pedidos, usuarios ni métricas | US-006, US-075 |
| **RN-RB07** | PEDIDOS NO tiene acceso a catálogo ni gestión de usuarios | US-006, US-075 |
| **RN-RB08** | Solo ADMIN puede cancelar pedidos en estado EN_PREPARACIÓN | US-043 |
| **RN-RB09** | Rol insuficiente → HTTP 403 Forbidden | US-006, US-076 |
| **RN-RB10** | Sin token válido → HTTP 401; rutas públicas (catálogo, login, registro) no requieren auth | US-006, US-076 |

---

## Dominio: Catálogo de Productos (RN-CA)

| ID | Regla | US relacionadas |
|----|-------|-----------------|
| **RN-CA01** | Las categorías soportan jerarquía de profundidad arbitraria via FK autoreferencial (`parent_id`) + CTE recursiva | US-007, US-008 |
| **RN-CA02** | No se permite asignar una categoría como padre de sí misma ni generar ciclos en la jerarquía | US-009 |
| **RN-CA03** | No se puede eliminar una categoría que tenga productos activos asociados | US-010 |
| **RN-CA04** | El precio del producto se almacena como `DECIMAL(10,2)` (NUNCA float) | US-015, US-020 |
| **RN-CA05** | El stock es un entero ≥ 0; nunca puede ser negativo | US-015, US-021 |
| **RN-CA06** | Un producto puede pertenecer a múltiples categorías (M2M via ProductoCategoria) | US-016 |
| **RN-CA07** | Un producto puede tener múltiples ingredientes (M2M via ProductoIngrediente); cada ingrediente tiene `es_alergeno` | US-017 |
| **RN-CA08** | El catálogo público solo muestra productos con `disponible=true` y `deleted_at IS NULL` | US-018 |
| **RN-CA09** | El soft delete marca `deleted_at` con timestamp; NUNCA se borra físicamente | US-010, US-014, US-022 |
| **RN-CA10** | Los endpoints de admin pueden incluir `incluir_eliminados` para ver registros borrados lógicamente | US-064 |

---

## Dominio: Direcciones de Entrega (RN-DI)

| ID | Regla | US relacionadas |
|----|-------|-----------------|
| **RN-DI01** | Un cliente puede tener múltiples direcciones; la primera se marca como predeterminada automáticamente | US-024 |
| **RN-DI02** | Solo una dirección puede ser predeterminada a la vez por usuario (operación transaccional) | US-028 |
| **RN-DI03** | Un cliente solo puede ver/editar/eliminar sus propias direcciones (ownership por userId del JWT) | US-025, US-026, US-027 |

---

## Dominio: Carrito de Compras (RN-CR)

| ID | Regla | US relacionadas |
|----|-------|-----------------|
| **RN-CR01** | El carrito es client-side only (Zustand + localStorage); **NO existe en el backend** | US-029–034 |
| **RN-CR02** | El carrito persiste al cerrar navegador, refresh de página, y logout/login | US-029 |
| **RN-CR03** | Si un producto ya está en el carrito y se agrega de nuevo, se incrementa la cantidad (no se duplica) | US-029 |
| **RN-CR04** | Solo se pueden excluir ingredientes que el producto efectivamente tiene asociados | US-030 |
| **RN-CR05** | La personalización (exclusión de ingredientes) se almacena como array de IDs de ingredientes | US-030, US-035 |

---

## Dominio: Pedidos — Creación (RN-PE)

| ID | Regla | US relacionadas |
|----|-------|-----------------|
| **RN-PE01** | La creación de un pedido es ATÓMICA (Unit of Work): si falla cualquier parte, no se persiste nada | US-035, US-036 |
| **RN-PE02** | Al crear un pedido se genera snapshot del precio de cada producto (`precio_snapshot` en DetallePedido) | US-035, US-037 |
| **RN-PE03** | Al crear un pedido se genera snapshot de la dirección de entrega | US-035, US-038 |
| **RN-PE04** | Se debe validar stock suficiente DENTRO de la transacción (`SELECT FOR UPDATE`) antes de crear el pedido | US-036 |
| **RN-PE05** | Si algún producto no tiene stock suficiente, no se crea NINGÚN ítem del pedido (todo o nada) | US-036 |
| **RN-PE06** | Todo pedido nace en estado PENDIENTE con registro inicial en HistorialEstadoPedido | US-035 |
| **RN-PE07** | La personalización se almacena como `INTEGER[]` (array de PostgreSQL) en DetallePedido | US-035 |
| **RN-PE08** | El total = suma de subtotales (cantidad × precio_snapshot) + costo_envio (fijo $50.00 en v1) | US-035 |

---

## Dominio: Pedidos — Máquina de Estados (RN-FS)

| ID | Regla | US relacionadas |
|----|-------|-----------------|
| **RN-FS01** | Un pedido solo puede avanzar al siguiente estado en la secuencia; sin saltos ni retrocesos | US-039–042 |
| **RN-FS02** | La transición PENDIENTE → CONFIRMADO es EXCLUSIVAMENTE automática (pago aprobado MP); nadie la ejecuta manual | US-039, US-046 |
| **RN-FS03** | Al confirmar (PENDIENTE→CONFIRMADO), se decrementa atómicamente el stock de cada producto del pedido | US-039 |
| **RN-FS04** | Si el decremento de stock falla para cualquier producto, toda la operación se revierte (rollback) | US-039 |
| **RN-FS05** | Al cancelar un pedido CONFIRMADO, se debe restaurar el stock de forma atómica (operación inversa a RN-FS03) | US-043 |
| **RN-FS06** | ENTREGADO y CANCELADO son estados terminales; no se permite ninguna transición adicional | US-042, US-043 |
| **RN-FS07** | Todo cambio de estado se registra en HistorialEstadoPedido (append-only: solo INSERT, NUNCA UPDATE ni DELETE) | US-039–044 |
| **RN-FS08** | Cancelación posible desde: PENDIENTE (Cliente/Gestor/Admin), CONFIRMADO (Gestor/Admin), EN_PREP (solo Admin) | US-043 |
| **RN-FS09** | Cada registro del historial incluye: estado_desde (NULL si es inicial), estado_hasta, timestamp, usuario_id o NULL (SISTEMA), motivo | US-044 |

**Mapa de transiciones válidas:**
```
PENDIENTE   → CONFIRMADO (solo automático por webhook MP)
PENDIENTE   → CANCELADO  (Cliente propietario, PEDIDOS, ADMIN)
CONFIRMADO  → EN_PREP    (PEDIDOS, ADMIN)
CONFIRMADO  → CANCELADO  (PEDIDOS, ADMIN — restaura stock)
EN_PREP     → EN_CAMINO  (PEDIDOS, ADMIN)
EN_PREP     → CANCELADO  (solo ADMIN — restaura stock)
EN_CAMINO   → ENTREGADO  (PEDIDOS, ADMIN)
ENTREGADO   → [terminal] — ninguna transición posible
CANCELADO   → [terminal] — ninguna transición posible
```

---

## Dominio: Pagos — MercadoPago (RN-PA)

| ID | Regla | US relacionadas |
|----|-------|-----------------|
| **RN-PA01** | Los datos de tarjeta se tokenizan en el browser via SDK MP.js (nunca tocan el servidor de Food Store) | US-045 |
| **RN-PA02** | Cada pago tiene un `idempotency_key` UUID único; webhooks duplicados con misma key se ignoran | US-045, US-046 |
| **RN-PA03** | El webhook debe responder HTTP 200 inmediatamente para evitar reintentos de MercadoPago | US-046 |
| **RN-PA04** | Siempre se verifica el estado real consultando la API de MP; nunca se confía solo en los datos del webhook | US-046 |
| **RN-PA05** | Pago `approved` → transición automática PENDIENTE→CONFIRMADO + decremento de stock | US-046 |
| **RN-PA06** | Pago `rejected` → pedido permanece PENDIENTE; el cliente puede reintentar con otro método | US-046, US-048 |
| **RN-PA07** | Pago `pending`/`in_process` → se actualiza estado del pago pero el pedido sigue PENDIENTE | US-046 |
| **RN-PA08** | Un pedido puede tener múltiples intentos de pago (relación 1:N Pedido→Pago) | US-048 |
| **RN-PA09** | Se usa `external_reference` (UUID del pedido) para vincular la preferencia MP con el pedido en Food Store | US-045, US-046 |

---

## Dominio: Datos e Integridad (RN-DA)

| ID | Regla | US relacionadas |
|----|-------|-----------------|
| **RN-DA01** | Todas las tablas principales tienen `created_at` (default NOW) y `updated_at` (auto-update) | US-000b |
| **RN-DA02** | Los IDs de seed (Roles, EstadoPedido) son ESTABLES y explícitos; se referencian en el código | US-000b |
| **RN-DA03** | El script de seed es idempotente: ejecutarlo múltiples veces no duplica datos | US-000b |
| **RN-DA04** | El email del usuario tiene restricción UNIQUE e índice para optimizar búsquedas en login | US-001, US-002 |
| **RN-DA05** | El HistorialEstadoPedido es append-only: NUNCA se actualiza ni se elimina un registro | US-044 |
| **RN-DA06** | Los snapshots garantizan inmutabilidad: cambios futuros en productos/direcciones NO afectan pedidos existentes | US-037, US-038 |
| **RN-DA07** | La paginación usa `skip/limit` con total de registros para que el frontend construya controles | US-018, US-049 |
| **RN-DA08** | Los errores de API siguen el estándar RFC 7807 (Problem Details for HTTP APIs) | US-068 |
