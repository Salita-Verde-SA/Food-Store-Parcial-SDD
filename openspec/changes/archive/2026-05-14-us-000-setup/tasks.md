## 1. Infraestructura Backend (FastAPI)

- [x] 1.1 Crear estructura de carpetas `backend/app/` (core, modules, db).
- [x] 1.2 Configurar `requirements.txt` con FastAPI, SQLModel, Alembic, SlowAPI, etc.
- [x] 1.3 Implementar `app/core/config.py` con Pydantic Settings.
- [x] 1.4 Crear `app/main.py` con configuración de CORS y Rate Limiting base.
- [x] 1.5 Implementar manejo de errores global siguiendo RFC 7807 en `app/core/errors.py`.

## 2. Persistencia y Modelos Iniciales

- [x] 2.1 Configurar engine y session en `app/core/database.py`.
- [x] 2.2 Inicializar Alembic (`alembic init alembic`) y configurar `env.py` para detectar modelos.
- [x] 2.3 Crear modelos SQLModel para: `Rol`, `EstadoPedido`, `FormaPago` y `Usuario` (mínimo para seed).
- [x] 2.4 Generar y aplicar la primera migración de base de datos. (Script generado en backend/alembic/versions/)
- [x] 2.5 Implementar `app/db/seed.py` con datos iniciales para roles, estados y administrador.

## 3. Patrones Arquitectónicos

- [x] 3.1 Implementar `BaseRepository[T]` genérico en `app/core/repository.py`.
- [x] 3.2 Implementar `UnitOfWork` como context manager en `app/core/uow.py`.
- [x] 3.3 Crear dependencias `get_current_user` y `require_role` (stubs para US-001).

## 4. Infraestructura Frontend (React)

- [x] 4.1 Crear proyecto React + Vite + TypeScript en `frontend/`.
- [x] 4.2 Configurar Tailwind CSS y estructura Feature-Sliced Design (FSD).
- [x] 4.3 Implementar `src/shared/api/axios.ts` con interceptores base.
- [x] 4.4 Crear stores de Zustand: `authStore`, `cartStore`, `paymentStore`, `uiStore`.
- [x] 4.5 Configurar `QueryClientProvider` de TanStack Query en `app/providers.tsx`.
