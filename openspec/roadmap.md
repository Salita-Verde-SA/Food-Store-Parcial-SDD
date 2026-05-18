# Roadmap de Implementación

Mapa completo de changes para desarrollar **Food Store** de inicio a fin.
Generado a partir de `knowledge-base/` el 2026-05-14.

---

## Orden de ejecución

| # | Change | Funcionalidad | US | Depende de | Razón de la dependencia |
|---|--------|---------------|-----|------------|--------------------------| 
| 1 | `us-000-setup` | Infraestructura base: scaffolding, FastAPI, PostgreSQL, Alembic, seed, React+Vite, UoW, BaseRepository, Zustand stores | US-000, US-000a, US-000b, US-000c, US-000d, US-000e, US-068 | — | Punto de partida. Sin esto, nada existe. |
| 2 | `us-001-auth` | JWT · RBAC · refresh tokens · rate limiting · protección de rutas backend y frontend | US-001 a US-006, US-073, US-075, US-076, US-066, US-067 | `us-000-setup` | Requiere backend operativo, tablas de usuarios/roles y patrones base implementados. Sin auth, ningún endpoint protegido funciona. |
| 3 | `us-002-categorias` | Catálogo jerárquico: CRUD de categorías con CTE recursiva, árbol anidado público | US-007 a US-010 | `us-001-auth` | Los endpoints CRUD requieren rol STOCK/ADMIN. La CTE requiere PostgreSQL configurado. |
| 4 | `us-003-productos` | CRUD de productos, stock, ingredientes, catálogo público, filtros, paginación | US-011 a US-023 | `us-002-categorias` | `Producto.categoria_id` referencia `Categoria`. Ingredientes son globales pero su flujo se introduce aquí. |
| 5 | `us-004-carrito` | Estado client-side con Zustand: agregar, personalizar (excluir ingredientes), modificar, vaciar | US-029 a US-034 | `us-003-productos` | Necesita el catálogo de productos disponible para agregar items con precio y datos de ingredientes. |
| 6 | `us-005-pedidos` | Creación atómica de pedido (UoW), snapshots de precio y dirección, FSM completa (6 estados), audit trail append-only | US-024 a US-028, US-035 a US-044, US-049 a US-052, US-061 a US-063, US-069, US-070, US-071 | `us-004-carrito` | Convierte el carrito en un pedido persistido. Requiere productos, categorías, usuarios autenticados y direcciones de entrega. |
| 7 | `us-006-pagos-mercadopago` | MercadoPago Checkout API: crear orden, tokenización PCI SAQ-A, webhook IPN, confirmación automática de pedido, reintento | US-045 a US-048, US-072 | `us-005-pedidos` | El pago se asocia a un pedido existente en estado PENDIENTE. La confirmación (PENDIENTE→CONFIRMADO) es disparada por el webhook. |
| 8 | `us-007-admin` | Panel de administración: gestión de usuarios, dashboard con recharts, métricas de ventas y pedidos, configuración | US-053 a US-060, US-064, US-065 | `us-006-pagos-mercadopago` | Las métricas requieren datos de pedidos y pagos completos. El dashboard incluye gráficos de ventas que implican pedidos ENTREGADOS. |

---

## Detalle por change

### 1. `us-000-setup`

**Funcionalidad**: Scaffolding del monorepo, configuración de FastAPI con CORS y rate limiting middleware, conexión a PostgreSQL con SQLModel, migraciones Alembic, seed data idempotente (roles, estados, formas de pago, admin), frontend React + Vite + TypeScript + Tailwind, 4 stores de Zustand (auth/cart/payment/ui), Axios instance con interceptores JWT, BaseRepository[T] genérico, UnitOfWork como context manager, dependencias `get_current_user` y `require_role`.

**US implementadas**: US-000, US-000a, US-000b, US-000c, US-000d, US-000e, US-068.

**Depende de**: ninguno (punto de partida).

**Justificación**: Todos los changes posteriores asumen estructura de directorios establecida, base de datos accesible con todas las tablas creadas, patrones de infraestructura implementados (UoW, BaseRepository), y el estado del frontend configurado (Zustand stores, Axios interceptors). Sin esto, nada funciona.

**Riesgos / preguntas abiertas**: Ver IN-01 (¿driver sync psycopg2 o async asyncpg?). Resolución recomendada: `psycopg2` para v1 académica. El seed debe ejecutarse con `python -m app.db.seed` después de `alembic upgrade head`.

---

### 2. `us-001-auth`

**Funcionalidad**: Registro de cliente (bcrypt ≥10), login con JWT (access 30min + refresh 7días con rotación y detección de replay attack), endpoint de refresh con revocación automática del token anterior, logout (revoca refresh token en BD), gestión de roles RBAC (4 roles fijos), `require_role` en FastAPI, rate limiting (5 intentos/15min), navegación adaptada por rol en frontend (rutas públicas vs. protegidas), guards de rutas React Router, interceptor de Axios para refresh automático transparente.

**US implementadas**: US-001 a US-006, US-073, US-075, US-076, US-066, US-067.

**Depende de**: `us-000-setup`.

**Justificación**: Este change crea el módulo `auth/` con modelos `Usuario`, `UsuarioRol`, `RefreshToken`; los endpoints `/api/v1/auth/*`; y el middleware de autorización. Sin auth funcional, ningún endpoint protegido del resto del sistema puede probarse. Se incluyen US-075 y US-076 (navegación y guards frontend) porque dependen directamente del authStore creado en us-000 y de la lógica de roles implementada aquí.

**Riesgos / preguntas abiertas**: Ver IN-02 (hash SHA-256 del refresh token en BD vs. plaintext). Ver GE-01 (detección de replay attack — TODOS los tokens del usuario se revocan). Ver GE-06 (Zustand fuera de React para el interceptor de Axios).

---

### 3. `us-002-categorias`

**Funcionalidad**: CRUD completo de categorías (Gestor de Stock / Admin): crear con `parent_id` opcional (jerarquía arbitraria), listar como árbol anidado via CTE recursiva PostgreSQL (endpoint público), editar validando que no se generen ciclos, eliminar con soft delete (solo si no tiene productos activos). Frontend: pantalla de gestión de categorías para STOCK, árbol navegable para cliente.

**US implementadas**: US-007 a US-010.

**Depende de**: `us-001-auth`.

**Justificación**: Los endpoints de creación/edición/eliminación requieren rol STOCK o ADMIN (implementado en auth). La CTE recursiva requiere PostgreSQL configurado (us-000-setup). El catálogo sin categorías no tiene navegación semántica.

**Riesgos / preguntas abiertas**: Ver RN-CA01 (jerarquía arbitraria — asegurarse de que la CTE funcione con profundidad ≥3). Ver RN-CA02 (validar ciclos antes de persistir — no olvidar este check en el Service). Ver RN-CA03 (no eliminar si tiene productos activos).

---

### 4. `us-003-productos`

**Funcionalidad**: CRUD completo de productos (precio como DECIMAL, stock entero ≥0, soft delete), gestión de ingredientes globales (con flag `es_alergeno`), asociación M2M producto-categoría y producto-ingrediente, catálogo público con filtros (categoría, búsqueda ILIKE, excluir alérgenos), paginación con total, detalle de producto. Frontend: grid del catálogo con filtros, página de detalle, formularios de gestión para STOCK.

**US implementadas**: US-011 a US-023, US-061 a US-063 (perfil del cliente — se incluye aquí por simplicidad de módulo).

**Depende de**: `us-002-categorias`.

**Justificación**: `Producto` referencia `Categoria` en la relación M2M. El catálogo público puede desarrollarse en paralelo con las categorías, pero el CRUD completo de productos requiere categorías existentes para asociar. El perfil del cliente (US-061..063) depende solo de auth y se agrupa aquí para no crear un change mínimo.

**Riesgos / preguntas abiertas**: Ver SU-04 (imágenes como URL externa, no upload). Ver RN-CA04 (DECIMAL — nunca float para precios). Ver RN-CA08 (catálogo público: solo `disponible=true` y `deleted_at IS NULL`). Ver GE-07 (BaseRepository filtra `deleted_at IS NULL` por defecto).

---

### 5. `us-004-carrito`

**Funcionalidad**: Carrito 100% client-side con Zustand (`cartStore`): agregar producto (incrementar si existe), personalizar con exclusión de ingredientes (solo los que el producto tiene), modificar cantidad (0 = eliminar), eliminar item, vaciar con confirmación, resumen con subtotales y total. Persistencia en localStorage que sobrevive a cierre de navegador, refresh y logout/login. Frontend: CartDrawer o página de carrito.

**US implementadas**: US-029 a US-034.

**Depende de**: `us-003-productos`.

**Justificación**: El carrito necesita datos del producto (nombre, precio, imagen, ingredientes disponibles) para construir los items y las exclusiones. Sin el catálogo de productos implementado, no hay nada que agregar al carrito.

**Riesgos / preguntas abiertas**: Ver RN-CR01 (sin backend — el carrito no existe en BD). Ver RN-CR03 (agregar producto existente incrementa cantidad). Ver RN-CR04 (validar exclusiones contra ingredientes del producto al agregar). Ver GE-06 (acceso a cartStore fuera de React para enviarlo en POST /pedidos).

---

### 6. `us-005-pedidos`

**Funcionalidad**: CRUD de direcciones de entrega (con predeterminada automática), creación atómica de pedido desde carrito (UoW: SELECT FOR UPDATE + snapshots de precio y dirección + INSERT Pedido + N DetallePedido + HistorialEstadoPedido inicial), validación de stock en transacción, FSM completa de 6 estados (Service con mapa de transiciones), audit trail append-only, cancelación con restauración de stock, historial de estados, vistas de pedidos para cliente y gestor.

**US implementadas**: US-024 a US-028, US-035 a US-044, US-049 a US-052, US-069, US-070, US-071.

**Depende de**: `us-004-carrito`.

**Justificación**: La creación del pedido consume el carrito (Zustand) y lo convierte en entidades persistidas. Requiere productos (FK en DetallePedido), usuarios autenticados (FK en Pedido), y direcciones de entrega. Se incluyen direcciones (US-024..028) en este change porque son prerequisito directo de la creación del pedido.

**Riesgos / preguntas abiertas**: Ver IN-03 (snapshot de dirección: campos individuales vs JSON). Ver IN-05 (forma_pago_codigo nullable al crear). Ver GE-02 (SELECT FOR UPDATE en async — validar que funciona con el driver elegido). Ver GE-04 (restaurar stock solo si pedido venía de CONFIRMADO). Ver GE-05 (dirección predeterminada — operación transaccional). Ver GE-08 (primer historial: estado_desde=NULL, no es error). Ver RN-PE01..08 y RN-FS01..09.

---

### 7. `us-006-pagos-mercadopago`

**Funcionalidad**: Integración MercadoPago Checkout API: crear orden MP con `idempotency_key` UUID único, endpoint de pago, tokenización de tarjeta 100% en browser via SDK React de MP (PCI SAQ-A), webhook IPN (responder 200 inmediatamente, verificar firma, consultar estado real en API MP, procesamiento idempotente), transición automática PENDIENTE→CONFIRMADO con decremento de stock al recibir `approved`, reintentar pago rechazado (nuevo idempotency_key), feedback visual de retorno de MP.

**US implementadas**: US-045 a US-048, US-072.

**Depende de**: `us-005-pedidos`.

**Justificación**: El pago se asocia a un pedido existente en estado PENDIENTE. La confirmación automática (PENDIENTE→CONFIRMADO) dispara la FSM de pedidos implementada en us-005. Sin pedidos funcionando, no hay nada que pagar.

**Riesgos / preguntas abiertas**: Ver IN-01 de pagos (¿Checkout API vs Checkout Pro?). Ver GE-01 (idempotencia de webhook — crítico). Ver GE-03 (idempotencia de webhook — mismo payment_id dos veces). Ver GE-04 (decremento de stock solo al confirmar pago). Ver RN-PA01..09. Ver SU-03 (ngrok requerido para IPN en desarrollo local — la URL cambia con cada reinicio de ngrok free tier).

---

### 8. `us-007-admin`

**Funcionalidad**: Panel de administración completo: gestión de usuarios (listar con filtros, editar rol/estado, desactivar con invalidación de tokens), dashboard de métricas con recharts (total ventas, pedidos por estado, top productos, evolución temporal con `DATE_TRUNC`), CRUD de catálogo con permisos de Admin, acceso completo a gestión de pedidos, configuración del sistema (tabla key-value).

**US implementadas**: US-053 a US-060, US-064, US-065.

**Depende de**: `us-006-pagos-mercadopago`.

**Justificación**: Las métricas del dashboard requieren datos de pedidos ENTREGADOS y pagos APPROVED que solo existen después de que el flujo completo de compra funciona. Las queries de agregación (`SUM`, `COUNT`, `DATE_TRUNC`) asumen tablas con datos reales. US-064 y US-065 son permisos adicionales del Admin sobre catálogo y pedidos ya implementados.

**Riesgos / preguntas abiertas**: Ver US-060 (configuración de sistema — prioridad baja, puede dejarse al final). Ver IN-04 (¿tabla `Configuracion` key-value o configuración en `.env`?). Las métricas con `recharts` pueden ser visualmente complejas — dedicar tiempo al `LineChart` de ventas por período.

---

## Notas finales

- Este roadmap sigue el **orden de implementación recomendado en `README.md`** del proyecto.
- Los changes `us-004-carrito` y `us-008-direcciones` (incluido en `us-005-pedidos`) podrían trabajarse en paralelo con parte del backend de `us-005`, ya que el carrito es completamente client-side.
- Las preguntas abiertas en `10_preguntas_abiertas.md` deben resolverse ANTES del change que las bloquea — especialmente IN-01 (driver DB) que bloquea `us-000-setup`.
- Cada change debe pasar por el ciclo completo OPSX: `/opsx:propose` → `/opsx:apply` → `/opsx:archive`.
- Al archivar cada change, actualizar `docs/CHANGES.md` según el protocolo del AGENTS.md.
