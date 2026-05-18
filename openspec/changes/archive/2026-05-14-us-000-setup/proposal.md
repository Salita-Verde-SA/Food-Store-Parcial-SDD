## Why

Establecer los cimientos técnicos del proyecto Food Store. Sin esta base de infraestructura, no es posible desarrollar las funcionalidades de negocio (autenticación, catálogo, pedidos) de manera consistente. Este change asegura que el monorepo esté configurado correctamente, la base de datos sea accesible, el frontend tenga su sistema de estado y el backend siga los patrones arquitectónicos definidos (UoW, Repository).

## What Changes

- Inicialización del monorepo con carpetas `backend/` y `frontend/`.
- Configuración de FastAPI con Pydantic Settings, CORS y middleware de rate limiting base.
- Configuración de SQLModel para PostgreSQL y Alembic para migraciones.
- Implementación de patrones `BaseRepository[T]` y `UnitOfWork`.
- Setup de React 18 con Vite, Tailwind CSS, TanStack Query y Zustand.
- Creación de los 4 stores globales de Zustand (`auth`, `cart`, `payment`, `ui`).
- Implementación del manejo de errores estandarizado bajo RFC 7807.
- Script de seed data para roles (ADMIN, STOCK, PEDIDOS, CLIENT), estados de pedido y usuario administrador inicial.

## Capabilities

### New Capabilities
- `infra-base`: Estructura monorepo, gestión de entornos (.env) y configuración global.
- `backend-setup`: Servidor FastAPI operativo con conexión a PostgreSQL y sistema de migraciones.
- `frontend-setup`: Aplicación React configurada con Tailwind y proveedores de estado (Query/Zustand).
- `core-patterns`: Implementación de Unit of Work, BaseRepository y manejo de errores RFC 7807.
- `seed-system`: Sistema de poblado de datos iniciales para roles, estados y configuraciones fijas.

### Modified Capabilities
- (Ninguna - Este es el change inicial de setup)

## Impact

- **Backend**: Afecta a toda la estructura `app/`, `core/` y `modules/`. Introduce dependencias de FastAPI, SQLModel, SQLAlchemy, Alembic y SlowAPI.
- **Frontend**: Afecta a `src/`, estableciendo la arquitectura Feature-Sliced Design (FSD). Introduce dependencias de React, Vite, Zustand, TanStack Query y Axios.
- **Base de Datos**: Creación del esquema inicial con 16 tablas.
- **Seguridad**: Establece la base para el hashing de contraseñas y la configuración de CORS.
