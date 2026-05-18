# Visión y Objetivos

## Propósito del sistema

Food Store es una plataforma de e-commerce para la venta de productos alimenticios. Permite a los clientes explorar un catálogo, gestionar un carrito, realizar pedidos con pago integrado vía MercadoPago y hacer seguimiento en tiempo real del estado de su pedido. Los administradores gestionan el catálogo, el stock, los pedidos y los usuarios desde un panel centralizado.

## Objetivos por actor

| Actor | Objetivo principal | Objetivos secundarios |
|-------|-------------------|----------------------|
| **Cliente** | Navegar el catálogo, gestionar carrito, pagar con MercadoPago y rastrear pedidos | Ver historial de pedidos, gestionar direcciones, personalizar productos (excluir ingredientes), cambiar contraseña |
| **Administrador** | Gestión total: usuarios, catálogo, pedidos, stock, métricas | Asignar roles, configurar parámetros del sistema, ver dashboard con recharts |
| **Gestor de Stock** | Controlar disponibilidad y cantidad de stock de productos | Crear/editar/eliminar productos, categorías e ingredientes (con flag `es_alergeno`) |
| **Gestor de Pedidos** | Visualizar y avanzar el estado de los pedidos (FSM) | Cancelar pedidos desde PENDIENTE/CONFIRMADO, ver historial de estados |
| **Sistema** | Procesar webhooks IPN de MercadoPago, gestionar expiración de tokens | Transicionar pedidos automáticamente al confirmar pago, decrementar stock |

## Alcance v5.0

- Autenticación y autorización con JWT + RBAC (4 roles) + invalidación de refresh token en BD
- Catálogo de productos con categorías jerárquicas (CTE recursiva) e ingredientes con flag `es_alergeno`
- Carrito de compras client-side con persistencia en localStorage via Zustand
- Gestión de pedidos con FSM de 6 estados y audit trail append-only (`HistorialEstadoPedido`)
- Pasarela de pagos MercadoPago Checkout API: tarjeta de crédito/débito, Rapipago, Pago Fácil
- Notificaciones webhook IPN de MercadoPago para confirmación automática de pagos
- Módulo DireccionEntrega: CRUD completo con dirección predeterminada por usuario
- Panel de administración: dashboard con recharts, CRUD de entidades, gestión de pedidos y stock
- Rate limiting con slowapi: máximo 5 intentos fallidos por IP en 15 minutos en el login
- CORS configurado correctamente con CORSMiddleware para separación frontend/backend
- Seed data obligatorio: roles, estados de pedido, formas de pago y usuario administrador
- API REST documentada con FastAPI/OpenAPI — accesible en `/docs` y `/redoc`

## Fuera de alcance

- Pagos en efectivo en tiempo real (solo se registran como forma de pago, sin flujo automatizado)
- Sistema de notificaciones por email o SMS a clientes
- App móvil nativa (solo web responsive)
- Sistema de reviews / calificaciones de productos
- Sistema de cupones o descuentos
- Gestión de múltiples sucursales o tiendas
- Integración con sistemas de delivery de terceros

## Métricas de éxito

- El sistema puntúa ≥ 181/200 pts en la rúbrica de corrección (Excelente)
- El flujo de pago end-to-end funciona con tarjetas sandbox de MercadoPago
- `alembic upgrade head` + `python -m app.db.seed` corre sin errores en máquina limpia
- Todos los endpoints documentados en Swagger UI (`/docs`)
- El carrito persiste tras cerrar y reabrir el navegador
