## Context

El proyecto Food Store se encuentra en su fase inicial. Se dispone de la documentación técnica en `docs/` y una base de conocimiento en `knowledge-base/`. El repositorio actual está vacío (solo documentación). Este change implementa la estructura base de carpetas y configuración para un monorepo con FastAPI (backend) y React (frontend).

## Goals / Non-Goals

**Goals:**
- Estructura de carpetas Feature-First en backend y FSD en frontend.
- Configuración de dependencias base (`requirements.txt`, `package.json`).
- Conexión a base de datos PostgreSQL usando SQLModel.
- Sistema de migraciones Alembic operativo.
- Patrones arquitectónicos `UnitOfWork` y `BaseRepository` implementados.
- Manejo de errores RFC 7807 global.
- Stores de Zustand con persistencia configurados.
- Seed data para roles y estados de pedido.

**Non-Goals:**
- Implementación de lógica de autenticación (US-001+).
- Implementación de lógica de negocio de productos, categorías o pedidos.
- Integración real con MercadoPago.
- Despliegue en producción.

## Decisions

- **Patrón Arquitectónico**: Se adopta el flujo `Router → Service → UoW → Repository → Model` para el backend. Esto garantiza una separación clara de responsabilidades y atomicidad en las operaciones.
- **ORM**: SQLModel por su integración nativa con Pydantic y FastAPI.
- **Manejo de Errores**: RFC 7807 (Problem Details) para estandarizar la comunicación de fallos a la UI.
- **Frontend State**: Zustand para el estado del cliente (carrito, sesión) y TanStack Query para el estado del servidor (fetching de datos).
- **Driver DB**: `psycopg2` (sync) para evitar la complejidad extra de drivers async inestables en SQLModel v1.

## Risks / Trade-offs

- **Sincronía vs Asincronía**: Se opta por driver síncrono para mayor estabilidad, lo que podría afectar el throughput máximo si no se maneja bien el pool de conexiones en el executor de FastAPI.
- **Soft Delete**: Se implementa a nivel de `BaseRepository`, lo que requiere que todos los desarrolladores respeten el patrón para evitar fugas de datos "borrados".
- **Seed Data**: El seed es crítico para el funcionamiento de los roles (RBAC). Si el seed falla o se modifica manualmente, la lógica de permisos podría romperse.
