## 1. Backend: Modelos y Migraciones

- [x] 1.1 Crear el modelo de base de datos `Ingrediente` en `backend/app/modules/ingredientes/model.py` con campos de auditoría y soporte de soft delete.
- [x] 1.2 Crear el modelo de base de datos `Producto` en `backend/app/modules/productos/model.py` con precisión numérica fija y check constraint para stock >= 0.
- [x] 1.3 Crear las tablas asociativas pivote `ProductoCategoria` y `ProductoIngrediente` para soportar relaciones muchos a muchos (M2M).
- [x] 1.4 Registrar los nuevos repositorios `productos` e `ingredientes` en el context manager de `UnitOfWork` (`backend/app/core/uow.py`).
- [x] 1.5 Generar y aplicar la migración de base de datos correspondiente mediante Alembic (`alembic revision --autogenerate -m "add_productos_and_ingredientes"` y `alembic upgrade head`).
- [x] 1.6 Ampliar el script de seed data (`backend/app/db/seed.py`) para precargar ingredientes básicos y productos iniciales premium de forma idempotente.

## 2. Backend: Capa de Repositorios y Servicios

- [x] 2.1 Implementar `IngredienteRepository` en `backend/app/modules/ingredientes/repository.py` heredando de `BaseRepository[Ingrediente]`.
- [x] 2.2 Implementar `ProductoRepository` en `backend/app/modules/productos/repository.py` heredando de `BaseRepository[Producto]` con la consulta avanzada del catálogo público (paginación, filtros de categorías, búsqueda y exclusión de alérgenos con subconsulta SQL `not exists`).
- [x] 2.3 Definir los esquemas Pydantic/SQLModel para inputs y outputs en `schemas.py` de productos e ingredientes.
- [x] 2.4 Implementar `IngredienteService` en `backend/app/modules/ingredientes/service.py` con validaciones de unicidad, soft delete y manejo de UoW.
- [x] 2.5 Implementar `ProductoService` en `backend/app/modules/productos/service.py` con lógica de stock no negativo, mapeo de relaciones multidimensionales y transacciones atómicas.

## 3. Backend: API Routers y Seguridad RBAC

- [x] 3.1 Implementar los endpoints CRUD protegidos de ingredientes en `backend/app/modules/ingredientes/router.py` usando `require_role(['ADMIN', 'STOCK'])`.
- [x] 3.2 Implementar los endpoints CRUD protegidos de productos en `backend/app/modules/productos/router.py` usando `require_role(['ADMIN', 'STOCK'])`.
- [x] 3.3 Implementar el endpoint público de listado de productos `GET /api/v1/productos` con soporte para filtros y exclusión de alérgenos.
- [x] 3.4 Implementar el endpoint público de detalle de producto `GET /api/v1/productos/{id}` resolviendo alérgenos y ocultando el stock cuantitativo exacto.
- [x] 3.5 Escribir la suite de pruebas unitarias y de integración para productos y alérgenos en `backend/tests/test_productos.py`.

## 4. Frontend: Tipado y Clientes de API

- [x] 4.1 Definir los tipos e interfaces TypeScript para Producto, Ingrediente y filtros de catálogo en `frontend/src/shared/types/index.ts` usando `import type` estricto.
- [x] 4.2 Crear el cliente de Axios para ingredientes en `frontend/src/shared/api/ingredientes.ts`.
- [x] 4.3 Crear el cliente de Axios para productos en `frontend/src/shared/api/productos.ts` incluyendo la query string para exclusión de alérgenos.

## 5. Frontend: Vistas y Componentes Administrativos

- [x] 5.1 Implementar la página de gestión de ingredientes `IngredientesPage.tsx` con listado, formulario de alta/edición y checkbox destacado de alérgenos.
- [x] 5.2 Implementar la página de gestión de productos `ProductosPage.tsx` con soporte para asociar ingredientes y categorías en forma de chips interactivos.
- [x] 5.3 Implementar el componente de incrementos/decrementos atómicos de stock rápido en la tabla de productos de administración.
- [x] 5.4 Registrar las nuevas rutas de administración protegidas por rol en `frontend/src/app/router.tsx` y asociarlas al menú de navegación por rol.

## 6. Frontend: Catálogo del Cliente e Integración

- [x] 6.1 Integrar la barra de filtros avanzados (categorías y exclusión de ingredientes alérgenos) en la página del catálogo de cara al cliente.
- [x] 6.2 Integrar el catálogo público con Zustand `cartStore` permitiendo a los clientes agregar productos con sus respectivos precios.
