# Actores y Roles

## Actores del sistema

| Actor | Descripción | Cómo interactúa |
|-------|-------------|-----------------|
| **Cliente** | Usuario final registrado que compra productos | Navega catálogo, gestiona carrito, crea pedidos, paga vía MP, ve historial propio |
| **Admin** | Control total del sistema | Gestiona usuarios, catálogo completo, pedidos, roles, métricas y configuración |
| **Gestor de Stock** | Responsable del inventario | Crea/edita/elimina productos, categorías e ingredientes; actualiza stock y disponibilidad |
| **Gestor de Pedidos** | Operador del flujo de pedidos | Visualiza todos los pedidos, avanza estados (FSM), cancela desde PENDIENTE/CONFIRMADO |
| **Sistema** | Proceso automatizado | Recibe webhooks IPN de MP, transiciona pedidos automáticamente, gestiona expiración de tokens |
| **Público** | Visitante no autenticado | Solo puede navegar el catálogo y acceder a login/registro |

## RBAC — Matriz de permisos

| Recurso | CLIENT | STOCK | PEDIDOS | ADMIN |
|---------|:------:|:-----:|:-------:|:-----:|
| Catálogo público (read) | ✅ | ✅ | ✅ | ✅ |
| Crear/editar productos | ❌ | ✅ | ❌ | ✅ |
| Gestionar stock/disponibilidad | ❌ | ✅ | ❌ | ✅ |
| Crear/editar categorías | ❌ | ✅ | ❌ | ✅ |
| Gestionar ingredientes | ❌ | ✅ | ❌ | ✅ |
| Crear pedido propio | ✅ | ❌ | ❌ | ✅ |
| Ver pedidos propios | ✅ | ❌ | ❌ | ✅ |
| Ver TODOS los pedidos | ❌ | ❌ | ✅ | ✅ |
| Avanzar estado de pedido | ❌ | ❌ | ✅ | ✅ |
| Cancelar pedido (PENDIENTE/CONFIRM) | ✅* | ❌ | ✅ | ✅ |
| Cancelar pedido (EN_PREPARACIÓN) | ❌ | ❌ | ❌ | ✅ |
| Gestionar usuarios | ❌ | ❌ | ❌ | ✅ |
| Asignar roles | ❌ | ❌ | ❌ | ✅ |
| Dashboard / métricas | ❌ | ❌ | ❌ | ✅ |
| Gestionar direcciones propias | ✅ | ❌ | ❌ | ❌ |
| Ver perfil propio | ✅ | ✅ | ✅ | ✅ |

> *CLIENT solo puede cancelar pedidos PENDIENTES propios (sin stock confirmado)

## Reglas de autorización clave (RBAC)

| Código | Regla |
|--------|-------|
| RN-RB01 | 4 roles fijos con IDs estables: ADMIN(1), STOCK(2), PEDIDOS(3), CLIENT(4) |
| RN-RB02 | Un usuario puede tener múltiples roles simultáneamente (M2M) |
| RN-RB03 | Solo ADMIN puede asignar/modificar roles de otros usuarios |
| RN-RB04 | Un ADMIN no puede quitarse el rol ADMIN si es el único admin del sistema |
| RN-RB05 | Un CLIENT solo puede ver y operar sobre sus propios datos |
| RN-RB06 | STOCK NO tiene acceso a pedidos, usuarios ni métricas |
| RN-RB07 | PEDIDOS NO tiene acceso a catálogo ni gestión de usuarios |
| RN-RB08 | Solo ADMIN puede cancelar pedidos en estado EN_PREPARACIÓN |
| RN-RB09 | Rol insuficiente → HTTP 403 Forbidden |
| RN-RB10 | Sin token válido → HTTP 401; rutas públicas no requieren auth |

## Rutas públicas (sin autenticación)

- `GET /api/v1/productos` — listado del catálogo
- `GET /api/v1/productos/{id}` — detalle de producto
- `GET /api/v1/categorias` — árbol de categorías
- `GET /api/v1/ingredientes` — listado de ingredientes
- `POST /api/v1/auth/login` — inicio de sesión
- `POST /api/v1/auth/register` — registro de cliente
- `POST /api/v1/auth/refresh` — renovación de token
- `POST /api/v1/pagos/webhook` — IPN de MercadoPago (validación por firma)
- `GET /docs` y `GET /redoc` — documentación OpenAPI
