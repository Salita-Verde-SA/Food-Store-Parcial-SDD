## 1. Configuración de Base de Datos y Modelo

- [x] 1.1 Crear el modelo `Categoria` en `backend/app/modules/categorias/model.py` heredando de `SQLModel`, incluyendo `parent_id` autoreferencial y `deleted_at` para soft delete
- [x] 1.2 Crear una nueva migración de base de datos usando Alembic (`alembic revision --autogenerate -m "add_categoria_table"`)
- [x] 1.3 Ejecutar la migración (`alembic upgrade head`) para crear la tabla físicamente y verificar que la estructura coincida con la spec

## 2. Repositorio y Transaccionalidad (UoW)

- [x] 2.1 Crear `CategoriaRepository` en `backend/app/modules/categorias/repository.py` heredando de `BaseRepository[Categoria]`
- [x] 2.2 Implementar la consulta recursiva de base de datos (CTE) `get_hierarchical_tree` en `CategoriaRepository` para obtener la jerarquía plana, ordenando por nivel y nombre, excluyendo registros borrados
- [x] 2.3 Importar `CategoriaRepository` y registrar la inyección de `self.categorias` dentro de la clase `UnitOfWork` en `backend/app/core/uow.py`

## 3. Schemas de Pydantic y Capa de Servicio

- [x] 3.1 Crear los esquemas de Pydantic v2 (`CategoriaCreate`, `CategoriaUpdate`, `CategoriaRead`, `CategoriaTreeRead`) en `backend/app/modules/categorias/schemas.py`, definiendo recursividad en `CategoriaTreeRead`
- [x] 3.2 Crear `CategoriaService` en `backend/app/modules/categorias/service.py` e implementar el método `get_tree` para agrupar el resultado plano de la CTE en una estructura anidada recursiva
- [x] 3.3 Implementar la validación de unicidad de nombre en el mismo nivel jerárquico y el algoritmo iterativo de prevención de ciclos en el `parent_id` (subiendo por ancestros) en `CategoriaService`
- [x] 3.4 Implementar el Soft Delete en `CategoriaService.delete_categoria` seteando en `NULL` el `parent_id` de las categorías hijas directas y agregando el stub para validar que no posea productos activos

## 4. Controladores API y Rutas de FastAPI

- [x] 4.1 Crear el controlador `router.py` en `backend/app/modules/categorias/router.py` con los endpoints REST: GET `/` (público), POST `/` (requiere ADMIN/STOCK), PUT `/{id}` (requiere ADMIN/STOCK), DELETE `/{id}` (requiere ADMIN)
- [x] 4.2 Registrar el router de categorías en el archivo principal `backend/app/main.py` bajo el prefijo correspondiente
- [x] 4.3 Escribir tests unitarios básicos para validar las reglas de prevención de ciclos y de soft delete condicionado

## 5. Frontend: Tipos, Clientes API y Fix de cartStore

- [x] 5.1 Corregir el error de tipado en `frontend/src/shared/stores/cartStore.ts` en la línea 6, cambiando `nombre: str` por `nombre: string`
- [x] 5.2 Definir los tipos de TypeScript `Categoria` y `CategoriaTree` en `frontend/src/shared/types/index.ts` o un archivo específico
- [x] 5.3 Crear el cliente HTTP en `frontend/src/shared/api/categorias.ts` utilizando la instancia de Axios configurada

## 6. Frontend: Componentes de UI y Pantalla de Administración

- [x] 6.1 Crear los componentes de árbol de categorías e interacción (modales de creación/edición, formulario jerárquico) en `frontend/src/features/categorias/`
- [x] 6.2 Crear la vista de administración principal en `frontend/src/pages/admin/CategoriasPage.tsx`
- [x] 6.3 Agregar las rutas protegidas y la navegación en la barra lateral del panel de administración para acceder a la nueva pantalla de categorías
