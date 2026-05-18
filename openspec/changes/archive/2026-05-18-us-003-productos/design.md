## Context

Para implementar el catálogo de e-commerce y el control de inventario de Food Store, se requiere una sólida infraestructura de base de datos relacional y un backend en capas robusto. Este documento define el diseño arquitectónico y de datos para el módulo de Productos e Ingredientes, detallando las relaciones jerárquicas con Categorías (M2M) y la composición con Ingredientes (M2M), el motor de consultas eficientes con exclusión de alérgenos y la interfaz administrativa en React 18 siguiendo Feature-Sliced Design (FSD).

## Goals / Non-Goals

**Goals:**
- Diseñar el esquema de base de datos relacional para `Producto`, `Ingrediente` y sus tablas asociativas M2M con índices optimizados para búsquedas (US-015, US-016, US-017).
- Diseñar el flujo en capas (Router -> Service -> UoW -> Repository -> Model) integrando los nuevos repositorios en `UnitOfWork` (US-000d).
- Definir el motor de filtrado del catálogo público con paginación, búsqueda parcial `ILIKE` y exclusión eficiente de múltiples alérgenos por ID mediante la cláusula `NOT EXISTS` (US-018, US-023).
- Definir las pantallas de administración CRUD en el frontend con protección de rutas por rol `STOCK` / `ADMIN` e interactividad Premium (US-076).

**Non-Goals:**
- No se incluye la lógica para personalizar (excluir) ingredientes dentro de los pedidos/carrito (eso corresponde a la Épica de Carrito `us-004-carrito` y Pedidos `us-005-pedidos`).
- No se incluye el upload físico de imágenes a servidores externos S3; se utilizará almacenamiento local de assets estáticos o URLs de demostración funcionales y premium.

## Decisions

### 1. Esquema de Datos Relacional y Tablas Pivote M2M
**Decisión**: Utilizar SQLModel con claves foráneas explícitas y restricciones de integridad en cascada.
- **`Producto`**:
  - `id`: `Optional[int] = Field(default=None, primary_key=True)`
  - `nombre`: `str = Field(max_length=100, nullable=False)`
  - `descripcion`: `Optional[str]`
  - `precio`: `Numeric(10,2)` (precisión numérica fija, RN-CA04)
  - `stock`: `int = Field(default=0)` (restricción `CheckConstraint("stock >= 0")`, RN-CA05)
  - `disponible`: `bool = Field(default=True)`
  - `imagen_url`: `Optional[str]`
  - `deleted_at`: `Optional[datetime] = Field(default=None)` (Soft Delete)
- **`Ingrediente`**:
  - `id`: `Optional[int] = Field(default=None, primary_key=True)`
  - `nombre`: `str = Field(max_length=100, nullable=False, unique=True)`
  - `es_alergeno`: `bool = Field(default=False)`
  - `deleted_at`: `Optional[datetime] = Field(default=None)` (Soft Delete)
- **`ProductoCategoria`**: Pivot M2M con PK compuesta `(producto_id, categoria_id)`.
- **`ProductoIngrediente`**: Pivot M2M con PK compuesta `(producto_id, ingrediente_id)`.

**Alternativa considerada**: Almacenar ingredientes como un tipo JSONB embebido en la tabla de productos.
- *Razón de rechazo*: Impide el mantenimiento centralizado de ingredientes como catálogo global administrable y penaliza severamente el rendimiento de búsquedas inversas por alérgenos.

---

### 2. Ampliación del Unit of Work (UoW) y Repositorios
**Decisión**: Exponer `ProductoRepository` y `IngredienteRepository` dentro de `UnitOfWork` en `backend/app/core/uow.py`.
- Esto garantiza que cualquier flujo de negocio (como la creación de un producto asociando categorías e ingredientes) se ejecute de manera 100% atómica dentro de una única transacción de base de datos.
- Se definirá `ProductoRepository` heredando de `BaseRepository[Producto]`.
- Se definirá `IngredienteRepository` heredando de `BaseRepository[Ingrediente]`.

---

### 3. Motor de Consultas: Exclusión Eficiente de Alérgenos
**Decisión**: Utilizar la función `not exists()` de SQLAlchemy en el método `list_active_products` de `ProductoRepository`.
- Cuando el cliente solicita productos omitiendo ciertos alérgenos (`?excluirAlergenos=1,3`), la consulta SQL generada debe ser equivalente a:
  ```sql
  SELECT * FROM producto p
  WHERE p.disponible = true AND p.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM producto_ingrediente pi
      WHERE pi.producto_id = p.id AND pi.ingrediente_id IN (1, 3)
    )
  ```
- Esta estructura es altamente eficiente en PostgreSQL/SQLite y aprovecha los índices compuestos de la tabla pivote.

**Alternativa considerada**: Recuperar todos los productos y filtrarlos en memoria (Python).
- *Razón de rechazo*: Altamente ineficiente a medida que el catálogo crece. Rompe la paginación a nivel de base de datos.

---

### 4. Arquitectura Frontend (FSD) y Zustand
**Decisión**: Implementar el consumo mediante **TanStack Query** (servidor) y estructurar las páginas administrativas bajo el estándar FSD:
- `pages/admin/ProductosPage.tsx`: Vista general del catálogo administrativo.
- `pages/admin/IngredientesPage.tsx`: Vista general del catálogo de ingredientes.
- `features/productos/`: Formularios de creación/edición, selector dinámico M2M de categorías e ingredientes con chips, y control interactivo de incrementos de stock.
- `features/ingredientes/`: Formularios de gestión con checkbox destacado para marcar alérgenos.
- `entities/producto/`: Modelos e interfaces de tipado.

---

## Risks / Trade-offs

- **[Riesgo: Consistencia del Stock en Peticiones Concurrentes]**
  - *Mitigación*: El endpoint PATCH `/api/v1/productos/{id}/stock` utilizará una sentencia de actualización atómica directa a nivel de base de datos (`SET stock = stock + :cantidad`) o un bloqueo optimista, de forma que dos gestores modificando existencias simultáneamente no generen pérdidas de consistencia.
- **[Riesgo: Carga de Datos en Joins de Catálogo Público]**
  - *Mitigación*: La consulta pública del listado principal no traerá los ingredientes completos de cada producto para no sobrecargar el payload; solo traerá los alérgenos básicos. Los ingredientes completos se recuperarán exclusivamente en la consulta detallada por ID (`GET /api/v1/productos/{id}`).
