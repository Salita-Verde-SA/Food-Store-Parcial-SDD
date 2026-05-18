# Descripción General

## Stack tecnológico

| Capa | Tecnología | Versión mínima | Rol |
|------|-----------|----------------|-----|
| Frontend | React + TypeScript | 18.x + 5.x | UI, enrutamiento, componentes |
| Frontend | Vite | 5.x | Build tool y dev server |
| Frontend | Tailwind CSS | 3.x | Estilos utility-first |
| Frontend | TanStack Query | 5.x | Fetching, caché y sincronización de datos del servidor |
| Frontend | TanStack Form | 0.x | Gestión de formularios con validación |
| Frontend | Zustand | 4.x | Estado global del cliente (carrito, sesión, pagos, UI) |
| Frontend | Axios | 1.x | Cliente HTTP con interceptors JWT |
| Frontend | recharts | 2.x | Gráficos del dashboard de administración |
| Frontend | @mercadopago/sdk-react | latest | SDK oficial MercadoPago para tokenización PCI-compliant |
| Backend | FastAPI | 0.111+ | Framework REST + generación automática OpenAPI |
| Backend | SQLModel | 0.0.19+ | ORM + schemas Pydantic integrados |
| Backend | PostgreSQL | 15+ | Base de datos relacional |
| Backend | Alembic | 1.13+ | Migraciones versionadas de base de datos |
| Backend | Passlib (bcrypt) | — | Hashing de contraseñas (cost factor ≥ 12) |
| Backend | python-jose / PyJWT | — | Generación y verificación JWT (HS256) |
| Backend | mercadopago SDK | 2.3.0+ | SDK oficial MercadoPago Python |
| Backend | slowapi | 0.1.9+ | Rate limiting por IP en endpoints críticos |

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                        │
│  React + TypeScript + Vite + Tailwind                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │authStore │ │cartStore │ │payStore  │ │uiStore   │      │
│  │(Zustand) │ │(Zustand) │ │(Zustand) │ │(Zustand) │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│          ↓ TanStack Query / Axios (JWT interceptor)        │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP REST /api/v1
┌───────────────────────────▼─────────────────────────────────┐
│                   BACKEND (FastAPI)                         │
│  Router → Service → UoW → Repository → Model               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐  │
│  │  auth   │ │productos│ │ pedidos │ │     pagos       │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ SQLModel / SQLAlchemy
┌───────────────────────────▼─────────────────────────────────┐
│                  PostgreSQL 15+                              │
└─────────────────────────────────────────────────────────────┘
```

**Principio fundamental del backend**: flujo de dependencias unidireccional:
```
Router → Service → UoW → Repository → Model
```
Ninguna capa importa de la capa superior. Absoluto.

**Separación de estado en frontend**:
- **Zustand**: estado del CLIENTE (carrito, sesión, proceso de pago, UI)
- **TanStack Query**: estado del SERVIDOR (productos, pedidos, dashboard)

## Integraciones externas

| Servicio | Propósito | Tipo |
|---------|-----------|------|
| MercadoPago Checkout API | Tokenización de tarjetas, creación de pagos | SDK REST |
| MercadoPago IPN/Webhook | Notificación asíncrona del resultado del pago | Webhook POST |

## API REST (resumen de endpoints)

Prefijo global: `/api/v1`. Errores siguen RFC 7807. Paginación: `?page=1&size=20`.

| Módulo | Método | Endpoint | Auth |
|--------|--------|---------|------|
| Auth | POST | `/auth/register` | Pública |
| Auth | POST | `/auth/login` | Pública (rate limited) |
| Auth | POST | `/auth/refresh` | Pública |
| Auth | POST | `/auth/logout` | Bearer |
| Auth | GET | `/auth/me` | Bearer |
| Productos | GET | `/productos` | Pública |
| Productos | GET | `/productos/{id}` | Pública |
| Productos | POST | `/productos` | ADMIN/STOCK |
| Productos | PUT | `/productos/{id}` | ADMIN/STOCK |
| Productos | PATCH | `/productos/{id}/disponibilidad` | ADMIN/STOCK |
| Productos | DELETE | `/productos/{id}` | ADMIN |
| Categorías | GET | `/categorias` | Pública |
| Categorías | POST | `/categorias` | ADMIN/STOCK |
| Categorías | PUT | `/categorias/{id}` | ADMIN/STOCK |
| Categorías | DELETE | `/categorias/{id}` | ADMIN |
| Pedidos | GET | `/pedidos` | CLIENT/ADMIN/PEDIDOS |
| Pedidos | POST | `/pedidos` | CLIENT |
| Pedidos | GET | `/pedidos/{id}` | Propietario/ADMIN |
| Pedidos | PATCH | `/pedidos/{id}/estado` | ADMIN/PEDIDOS |
| Pedidos | GET | `/pedidos/{id}/historial` | Propietario/ADMIN |
| Pagos | POST | `/pagos/crear` | CLIENT |
| Pagos | POST | `/pagos/webhook` | Pública (validar firma MP) |
| Pagos | GET | `/pagos/{pedido_id}` | Propietario/ADMIN |
| Admin | GET | `/admin/usuarios` | ADMIN |
| Admin | GET | `/admin/metricas/resumen` | ADMIN |
| Direcciones | GET | `/direcciones` | CLIENT |
| Direcciones | POST | `/direcciones` | CLIENT |
| Direcciones | PATCH | `/direcciones/{id}/predeterminada` | CLIENT |
