# Modelo de Datos

## Dominios

1. **Identidad y Acceso** — Usuarios, roles, autenticación, tokens, direcciones
2. **Catálogo de Productos** — Categorías jerárquicas, productos, ingredientes, formas de pago
3. **Ventas, Pagos y Trazabilidad** — Pedidos, detalles, historial de estados, pagos MP

## ERD (Entity Relationship Diagram)

```
DOMINIO 1 — IDENTIDAD Y ACCESO
═══════════════════════════════

  Usuario ─────── UsuarioRol ─────── Rol
    │                                 (ADMIN|STOCK|PEDIDOS|CLIENT)
    ├──────────── RefreshToken
    └──────────── DireccionEntrega

DOMINIO 2 — CATÁLOGO
════════════════════

  Categoria ─── self-ref (parent_id)
      │
  ProductoCategoria ──── Producto ──── ProductoIngrediente ──── Ingrediente
                           │                                    (es_alergeno)
                         FormaPago (catálogo)

DOMINIO 3 — VENTAS
══════════════════

  Pedido ──── DetallePedido (precio_snapshot, personalizacion INTEGER[])
    │
    ├──── HistorialEstadoPedido (append-only, estado_desde puede ser NULL)
    ├──── Pago (mp_payment_id, idempotency_key)
    ├──── DireccionEntrega (FK SET NULL, + campos snapshot en Pedido)
    ├──── FormaPago
    └──── EstadoPedido (catálogo: PENDIENTE|CONFIRMADO|EN_PREP|EN_CAMINO|ENTREGADO|CANCELADO)
```

## Entidades

### Usuario
- `id`: BIGSERIAL PK
- `nombre`: VARCHAR(80) NN
- `apellido`: VARCHAR(80) NN
- `email`: VARCHAR(254) UQ, NN — índice para login
- `password_hash`: CHAR(60) NN — bcrypt, NUNCA plaintext
- `activo`: BOOLEAN NN, default true
- `deleted_at`: TIMESTAMPTZ NULL — soft delete
- `created_at`, `updated_at`: TIMESTAMPTZ — auditoría
- Relaciones: N:M con Rol (via UsuarioRol), 1:N con RefreshToken, DireccionEntrega, Pedido

### Rol
- `codigo`: VARCHAR(20) PK semántica — `ADMIN | STOCK | PEDIDOS | CLIENT`
- `descripcion`: TEXT
- IDs de seed **estables**: ADMIN(1), STOCK(2), PEDIDOS(3), CLIENT(4)

### UsuarioRol
- `(usuario_id, rol_codigo)`: PK compuesta — restricción UNIQUE
- `asignado_por_id`: BIGINT FK → Usuario (quién asignó el rol)
- `created_at`: TIMESTAMPTZ

### RefreshToken ★
- `token_hash`: CHAR(64) UQ, NN — SHA-256 del token UUID
- `usuario_id`: BIGINT FK → Usuario
- `expires_at`: TIMESTAMPTZ NN — 7 días desde emisión
- `revoked_at`: TIMESTAMPTZ NULL — NULL = activo; SET en logout

### DireccionEntrega ★
- `id`: BIGSERIAL PK
- `usuario_id`: BIGINT FK → Usuario
- `alias`: VARCHAR(50) NULL — ej: 'Casa', 'Trabajo'
- `linea1`: TEXT NN
- `linea2`: TEXT NULL
- `ciudad`: VARCHAR(100) NN
- `codigo_postal`: VARCHAR(20) NN
- `es_principal`: BOOLEAN NN, default false — SOLO UNA por usuario
- `deleted_at`: TIMESTAMPTZ NULL

### Categoria
- `id`: BIGSERIAL PK
- `nombre`: VARCHAR(100) NN, UQ por nivel
- `descripcion`: TEXT NULL
- `parent_id`: BIGINT FK self-ref, NULL (ON DELETE SET NULL) — jerarquía arbitraria con CTE recursiva
- `deleted_at`: TIMESTAMPTZ NULL

### Producto
- `id`: BIGSERIAL PK
- `nombre`: VARCHAR(200) NN
- `descripcion`: TEXT NULL
- `imagen_url`: TEXT NULL
- `precio_base`: DECIMAL(10,2) CHECK ≥ 0, NN — NUNCA float
- `stock_cantidad`: INTEGER CHECK ≥ 0, NN, default 0
- `disponible`: BOOLEAN NN, default true — toggle manual
- `deleted_at`: TIMESTAMPTZ NULL

### Ingrediente ★
- `id`: BIGSERIAL PK
- `nombre`: VARCHAR(100) UQ, NN
- `es_alergeno`: BOOLEAN NN, default false
- `deleted_at`: TIMESTAMPTZ NULL

### ProductoCategoria
- `(producto_id, categoria_id)`: PK compuesta
- `es_principal`: BOOLEAN — categoría principal del producto

### ProductoIngrediente ★
- `(producto_id, ingrediente_id)`: PK compuesta
- `es_removible`: BOOLEAN NN — habilita personalización

### FormaPago ★
- `codigo`: VARCHAR(20) PK semántica — `MERCADOPAGO | EFECTIVO | TRANSFERENCIA`
- `nombre`: VARCHAR(100) NN
- `habilitado`: BOOLEAN NN, default true

### EstadoPedido
- `codigo`: VARCHAR(20) PK semántica
- `descripcion`: TEXT
- `orden`: INTEGER — para ordenar la FSM
- `es_terminal`: BOOLEAN NN — true = no admite transiciones salientes

### Pedido
- `id`: BIGSERIAL PK
- `usuario_id`: BIGINT FK → Usuario
- `estado_codigo`: VARCHAR(20) FK → EstadoPedido
- `forma_pago_codigo`: VARCHAR(20) FK → FormaPago
- `direccion_id`: BIGINT FK → DireccionEntrega, SET NULL
- `total`: DECIMAL(10,2) CHECK ≥ 0, NN — snapshot inmutable
- `costo_envio`: DECIMAL(10,2) NN, default 50.00 — fijo en v1
- `notas`: TEXT NULL
- `created_at`, `updated_at`: TIMESTAMPTZ

### DetallePedido
- `id`: BIGSERIAL PK
- `pedido_id`: BIGINT FK → Pedido
- `producto_id`: BIGINT FK → Producto
- `cantidad`: INTEGER CHECK ≥ 1, NN
- `nombre_snapshot`: VARCHAR(200) NN — snapshot inmutable
- `precio_snapshot`: DECIMAL(10,2) NN — snapshot inmutable
- `personalizacion`: INTEGER[] NULL — IDs de ingredientes removidos

### HistorialEstadoPedido (append-only)
- `id`: BIGSERIAL PK
- `pedido_id`: BIGINT FK → Pedido
- `estado_desde`: VARCHAR(20) FK NULL — NULL = transición inicial (RN-02)
- `estado_hasta`: VARCHAR(20) FK NN
- `usuario_id`: BIGINT FK NULL — NULL = SISTEMA
- `motivo`: TEXT NULL — obligatorio si CANCELADO
- `created_at`: TIMESTAMPTZ NN — NUNCA updated_at; append-only

### Pago ★
- `id`: BIGSERIAL PK
- `pedido_id`: BIGINT FK → Pedido
- `mp_payment_id`: BIGINT UQ NULL — ID de MercadoPago
- `mp_status`: VARCHAR(30) NN — `pending | approved | rejected | in_process | cancelled`
- `monto`: DECIMAL(10,2) NN
- `external_reference`: VARCHAR(100) UQ, NN — UUID del pedido enviado a MP
- `idempotency_key`: VARCHAR(100) UQ, NN — UUID generado por backend para evitar duplicados
- `created_at`, `updated_at`: TIMESTAMPTZ

## Seed data inicial

| Entidad | Registros obligatorios |
|---------|----------------------|
| Rol | ADMIN (1), STOCK (2), PEDIDOS (3), CLIENT (4) — IDs **explícitos y estables** |
| EstadoPedido | PENDIENTE (1), CONFIRMADO (2), EN_PREP (3), EN_CAMINO (4), ENTREGADO (5), CANCELADO (6) — `es_terminal`: ENTREGADO=true, CANCELADO=true |
| FormaPago | MERCADOPAGO (habilitado), EFECTIVO (habilitado), TRANSFERENCIA (habilitado) |
| Usuario admin | `admin@foodstore.com` / `Admin1234!` con rol ADMIN — credenciales configurables por `.env` |

> El seed debe ser idempotente: `INSERT ... ON CONFLICT DO NOTHING`.
> Sin seed, la aplicación no funciona (no existen roles ni estados de pedido).
