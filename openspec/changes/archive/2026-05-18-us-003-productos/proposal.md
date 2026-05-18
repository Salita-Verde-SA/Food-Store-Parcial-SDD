## Why

El sistema e-commerce de alimentos requiere un catálogo de productos robusto y dinámico para que los clientes puedan navegar, filtrar y realizar compras informadas. Asimismo, para cumplir con las normativas de salud y transparencia alimenticia (RN-CA07), el sistema debe permitir asociar ingredientes y declarar alérgenos a nivel de producto. Este cambio introduce la gestión completa de productos e ingredientes (roles de ADMIN/STOCK) y la consulta pública y segura del catálogo con control de stock y filtros avanzados para los clientes.

## What Changes

- **Gestión de Ingredientes**: CRUD de ingredientes globales con marcas específicas de alérgenos (US-011 a US-014).
- **Catálogo de Productos**: CRUD de productos con campos de precio con precisión numérica fija, stock y disponibilidad (US-015, US-020, US-022).
- **Asociaciones Multidimensionales**:
  - Relación muchos a muchos (M2M) entre Productos y Categorías (US-016).
  - Relación muchos a muchos (M2M) entre Productos e Ingredientes (US-017).
- **Control Lógico de Stock**: Operaciones atómicas para actualizar existencias y prevención estricta de stock negativo (US-021, RN-CA05).
- **Búsqueda y Consulta Pública**:
  - Endpoint público de listado de productos con paginación, búsqueda parcial de texto y filtrado por categoría (US-018).
  - Consulta de detalle de producto con ingredientes y alérgenos destacados sin revelar cantidades de stock exactas (US-019).
  - Filtro público de exclusión de alérgenos específicos para clientes con restricciones alimenticias (US-023).

## Capabilities

### New Capabilities
- `productos`: Engloba la gestión de productos, ingredientes globales, relaciones M2M (categorías/ingredientes), control transaccional de stock, consultas públicas parametrizadas y filtrado de alérgenos.

### Modified Capabilities
<!-- Ninguna especificación existente cambia sus requisitos de negocio core -->

## Impact

- **Base de Datos**: Creación de las tablas `ingrediente`, `producto`, `producto_categoria` y `producto_ingrediente`.
- **API Backend**: Nuevos routers en `/api/v1/productos` y `/api/v1/ingredientes` protegidos por roles RBAC (`require_role(['ADMIN', 'STOCK'])`) para escritura, y públicos para lectura.
- **Frontend**: Componentes de administración de catálogo en la sección de Stock, e integración del catálogo público del cliente con Zustand `cartStore` y filtros de búsqueda.
- **Infraestructura**: Migraciones de Alembic para el esquema relacional y ampliación del script de seed data.
