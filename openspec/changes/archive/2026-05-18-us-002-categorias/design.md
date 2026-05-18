## Context

Actualmente el proyecto cuenta con la infraestructura de base de datos síncrona en SQLite/PostgreSQL y las tablas de autenticación e identidad. Para avanzar con el catálogo de productos (`us-003`), necesitamos implementar primero el sistema de categorías jerárquicas recursivas (`us-002`).

Este diseño explica la implementación de la jerarquía arbitraria de categorías utilizando una clave autoreferencial (`parent_id`) en la tabla `categoria`, consultas eficientes usando Common Table Expressions (CTE) recursivas y validaciones de consistencia (prevención de ciclos y soft delete condicionado).

## Goals / Non-Goals

**Goals:**
- Crear el modelo `Categoria` en `SQLModel` e implementar su tabla física con migraciones Alembic.
- Agregar `CategoriaRepository` e integrarlo en la clase `UnitOfWork` (UoW).
- Implementar la consulta recursiva de categorías (CTE) para retornar el árbol estructurado en un solo viaje de red.
- Implementar endpoints CRUD para la gestión de categorías protegidos por roles (`STOCK`/`ADMIN`).
- Implementar la validación lógica para evitar ciclos y autoreferencias.
- Crear la pantalla de administración y árbol visual de categorías en el frontend utilizando Zustand y React.

**Non-Goals:**
- Crear la tabla o el CRUD de productos (corresponde a `us-003-productos`).
- Implementar la relación directa en base de datos con productos (se dejará la lógica simulada o stub de validación en la eliminación y se cableará físicamente en el siguiente cambio).

## Decisions

### 1. Modelo de Datos y Relación Jerárquica
Se modelará la entidad `Categoria` usando `SQLModel`:
```python
class Categoria(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, nullable=False)
    descripcion: Optional[str] = Field(default=None)
    parent_id: Optional[int] = Field(default=None, foreign_key="categoria.id", nullable=True)
    deleted_at: Optional[datetime] = Field(default=None)
```
- **Trade-off**: Usar una relación autoreferencial simple en lugar de esquemas más complejos (como Adjacency List + Nested Sets) reduce drásticamente la complejidad de escritura y edición. La penalización clásica de lectura lenta de este patrón se elimina completamente usando una consulta recursiva CTE.

### 2. Lectura del Árbol mediante CTE Recursiva
En `CategoriaRepository` se definirá un método especializado para realizar la consulta jerárquica recursiva:
```sql
WITH RECURSIVE cte_categorias AS (
    -- Miembros ancla: categorías raíz
    SELECT id, nombre, descripcion, parent_id, deleted_at, 0 as nivel
    FROM categoria
    WHERE parent_id IS NULL AND deleted_at IS NULL
    
    UNION ALL
    
    -- Miembros recursivos: categorías hijas
    SELECT c.id, c.nombre, c.descripcion, c.parent_id, c.deleted_at, cc.nivel + 1
    FROM categoria c
    INNER JOIN cte_categorias cc ON c.parent_id = cc.id
    WHERE c.deleted_at IS NULL
)
SELECT * FROM cte_categorias ORDER BY nivel, parent_id, nombre;
```
- **Trade-off**: Esta aproximación es extremadamente eficiente en base de datos. En el servicio o router, agruparemos los resultados planos en un diccionario indexado para construir el árbol JSON anidado en tiempo de ejecución ($O(N)$ complejidad).

### 3. Algoritmo de Prevención de Ciclos
Antes de persistir una categoría con un `parent_id` no nulo, el servicio `CategoriaService` validará que el nuevo padre no sea:
1. La propia categoría (autoreferencia directa).
2. Alguna de sus subcategorías descendientes (autoreferencia indirecta).

El algoritmo de detección recorrerá recursiva o iterativamente hacia arriba desde el nuevo padre propuesto:
```python
def check_cycle(self, uow, categoria_id: int, new_parent_id: int):
    if categoria_id == new_parent_id:
        return True
    
    current_parent_id = new_parent_id
    while current_parent_id is not None:
        parent = uow.session.get(Categoria, current_parent_id)
        if not parent or parent.deleted_at:
            break
        if parent.parent_id == categoria_id:
            return True # Ciclo detectado
        current_parent_id = parent.parent_id
    return False
```
- **Trade-off**: Es un algoritmo simple e iterativo sumamente rápido ($O(H)$ donde $H$ es la altura del árbol, típicamente < 5). Evita queries recursivas complejas en código de aplicación.

### 4. Integridad en la Eliminación (RN-CA03 y RN-CA09)
Para cumplir con las reglas de negocio en la eliminación:
- Al aplicar Soft Delete (`deleted_at`), el servicio actualizará a `parent_id = NULL` a todas las subcategorías hijas directas, de forma que queden huérfanas en la raíz en lugar de eliminarse en cascada (cumpliendo con la especificación de desasociación).
- Dado que la tabla `producto` aún no existe, en `CategoriaService.delete_categoria` dejaremos un stub que verifique si la categoría tiene productos activos (retornará `False` por defecto) con un comentario `TODO: cablear con ProductoRepository en us-003-productos`.

### 5. Frontend Slices
- Creamos `frontend/src/pages/admin/CategoriasPage.tsx` para la interfaz de administración.
- Registramos las llamadas en `frontend/src/shared/api/axios.ts` o creamos un servicio específico de categorías.
- Corrección de tipado en `cartStore.ts` (`nombre: string` en lugar de `str`).

## Risks / Trade-offs

- **[Riesgo] Recursión infinita en la CTE si hay ciclos manuales en base de datos**
  *Mitigación*: Agregaremos una restricción en la consulta recursiva de la CTE que limite la profundidad a un máximo de 10 niveles (`WHERE cc.nivel < 10`), garantizando que la base de datos nunca entre en un bucle infinito en caso de corrupción de datos.
  
- **[Riesgo] Inconsistencias al no tener la tabla Producto integrada**
  *Mitigación*: Dejar el stub limpio en el servicio. La cobertura de tests unitarios del módulo categorías probará que el flujo de borrado funciona asumiendo 0 productos, y se agregará un test de integración en el siguiente change cuando `Producto` sea introducido.
