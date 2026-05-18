## Why

Para organizar de manera intuitiva y profesional el menú y catálogo del e-commerce Food Store, es indispensable contar con una estructura jerárquica de categorías (por ejemplo, "Bebidas" -> "Gaseosas" o "Pizzas" -> "Pizzas Especiales"). Este cambio resuelve la limitación actual de no tener un catálogo estructurado, permitiendo a los clientes navegar de forma semántica y a los gestores de stock organizar de manera granular y escalable los productos del negocio.

## What Changes

- **Estructura de Datos**: Creación de la tabla `categoria` con una clave autoreferencial (`parent_id`) para soportar jerarquías recursivas ilimitadas.
- **Consultas Eficientes**: Implementación de una Common Table Expression (CTE) recursiva en PostgreSQL/SQLite para devolver el árbol de categorías anidado completo de forma eficiente en un único viaje de red.
- **Operaciones CRUD**: Endpoints protegidos (`ADMIN`/`STOCK`) para crear, editar, eliminar y listar categorías.
- **Validación de Ciclos**: Regla de negocio en la capa de Servicio que impide crear dependencias circulares (por ejemplo, que una categoría sea hija de sí misma o de alguna de sus descendientes).
- **Protección de Datos e Integridad**:
  - Soft Delete (`deleted_at`) en categorías para no romper referencias de negocio.
  - Validación física que impida la eliminación si una categoría tiene productos activos asociados.
- **Panel de Gestión Visual (Frontend)**: Interfaz de árbol navegable para la administración rápida de categorías (crear, editar, eliminar) y vistas de selección jerárquica en el catálogo del cliente.

## Capabilities

### New Capabilities
- `categorias`: Capacidad para gestionar categorías con estructura de árbol jerárquico ilimitado, soporte de CTE recursiva para lectura pública del árbol completo, controles CRUD con reglas de prevención de ciclos y soft delete integrado con la integridad de catálogo de productos.

### Modified Capabilities
- Ninguna. La capacidad de autenticación/identidad se consume pero sus requisitos funcionales no se ven modificados.

## Impact

- **Database**: Creación de la tabla `categoria` con índice en `parent_id` y `deleted_at`. Creación de la migración correspondiente con Alembic.
- **Backend (FastAPI)**:
  - Nuevo módulo `app/modules/categorias/` que implementa: `model.py`, `schemas.py`, `repository.py`, `service.py`, `router.py`.
  - Registro del nuevo router de categorías en `app/main.py`.
  - Inyección del nuevo `CategoriaRepository` en el `UnitOfWork`.
- **Frontend (React)**:
  - Nueva página de administración en `pages/admin/CategoriasPage.tsx`.
  - Componentes de interacción y árbol visual en `features/categorias/`.
  - Tipos e integración en `shared/types/` y `shared/api/`.
