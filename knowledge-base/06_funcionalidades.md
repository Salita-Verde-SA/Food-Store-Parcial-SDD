# Funcionalidades

Organizadas por **épica** y luego por **historia de usuario**.

---

## Épica 00 — Infraestructura y Setup (Sprint 0)

### US-000 — Scaffolding del monorepo
**Como** Líder Técnico, **quiero** el repositorio inicializado con estructura feature-first (backend) y FSD (frontend), **para** que el equipo comience sobre una base organizada.
**Criterios**: estructura de carpetas completa, `.gitignore`, `README.md`, `.env.example` en ambos proyectos.

### US-000a — Setup del backend FastAPI
**Como** Desarrollador, **quiero** FastAPI + SQLModel + Alembic configurados, **para** implementar los módulos funcionales.
**Criterios**: `uvicorn app.main:app --reload` arranca en puerto 8000; Swagger en `/docs`; CORS desde `.env`.

### US-000b — Base de datos, migraciones y seed
**Como** Desarrollador, **quiero** PostgreSQL con Alembic + seed data, **para** que el sistema tenga las tablas y datos catálogo necesarios.
**Criterios**: `alembic upgrade head` crea las 16 tablas del ERD v5; seed carga 4 roles, 6 estados, formas de pago y admin.

### US-000c — Setup del frontend React + Vite
**Como** Desarrollador, **quiero** React + TypeScript + Vite + TanStack + Zustand + Tailwind configurados, **para** construir la UI.
**Criterios**: `npm run dev` arranca en puerto 5173; TypeScript strict; Axios con interceptors JWT.

### US-000d — Patrones base (BaseRepository, UoW, dependencias FastAPI)
**Como** Desarrollador, **quiero** `BaseRepository[T]`, `UnitOfWork` y las dependencias `get_current_user` + `require_role`, **para** que los módulos tengan una base sólida.
**Criterios**: UoW como context manager con commit/rollback automático; `require_role` devuelve 403 si falta rol.

### US-000e — Stores de Zustand (authStore, cartStore, paymentStore, uiStore)
**Como** Desarrollador, **quiero** los 4 stores de Zustand configurados con persistencia, **para** gestión de estado consistente.
**Criterios**: cartStore y authStore persisten en localStorage; paymentStore y uiStore no persisten.

---

## Épica 01 — Autenticación y Autorización (Sprint 1)

### US-001 — Registro de cliente
**Como** Cliente, **quiero** registrarme con email y contraseña, **para** acceder a la plataforma.
**Reglas**: RN-AU01, RN-AU07, RN-DA04.

### US-002 — Login de usuario
**Como** Cliente, **quiero** iniciar sesión, **para** acceder a mi cuenta.
**Reglas**: RN-AU02, RN-AU06, RN-AU08.

### US-003 — Refresh de token
**Como** Sistema, **quiero** rotar los tokens via refresh token, **para** mantener sesión activa de forma segura.
**Reglas**: RN-AU04, RN-AU05.

### US-004 — Logout
**Como** Cliente, **quiero** cerrar sesión, **para** proteger mi cuenta.

### US-005 — Gestión de roles (RBAC)
**Como** Admin, **quiero** asignar roles a usuarios, **para** controlar el acceso.
**Reglas**: RN-RB01–RN-RB04.

### US-006 — Protección de rutas por rol
**Como** Sistema, **quiero** proteger endpoints según el rol, **para** garantizar acceso autorizado.
**Reglas**: RN-RB09, RN-RB10.

### US-073 — Rate limiting en endpoints sensibles
Login: 5 intentos/15min por IP → HTTP 429 con `Retry-After`.

---

## Épica 02 — Navegación y Layout Base (Sprint 1)

### US-075 — Navegación por rol
Menú adaptado: CLIENT ve catálogo/carrito/pedidos; STOCK ve catálogo admin; PEDIDOS ve panel de pedidos; ADMIN lo ve todo.

### US-076 — Protección de rutas en frontend
Guards: no autenticado → redirect a login; sin rol → pantalla 403.

### US-066 — Manejo de token expirado en frontend
Interceptor Axios detecta 401 → refresh automático → reintenta request original. Cola de requests concurrentes.

---

## Épica 03 — Gestión de Categorías (Sprint 2)

### US-007 — Crear categoría (STOCK/ADMIN)
Categoría con nombre y `parent_id` opcional. Jerarquía arbitraria via FK autoreferencial + CTE.

### US-008 — Listar categorías jerárquicas (público)
Árbol anidado con CTE recursiva. Sin autenticación.

### US-009 — Editar categoría
Modificar nombre o `parent_id`. Validar que el cambio no genere ciclos.

### US-010 — Eliminar categoría (soft delete)
Solo si no tiene productos activos asociados.

---

## Épica 04 — Gestión de Ingredientes (Sprint 2)

### US-011 — Crear ingrediente (STOCK/ADMIN)
Nombre único + flag `es_alergeno`.

### US-012 — Listar ingredientes
Con filtro por `es_alergeno` y paginación.

### US-013 — Editar ingrediente
Nombre o flag de alérgeno.

### US-014 — Eliminar ingrediente (soft delete)

---

## Épica 05 — Gestión de Productos (Sprint 3)

### US-015 — Crear producto (STOCK/ADMIN)
Nombre, descripción, `precio_base` (DECIMAL), `stock_cantidad`, `disponible`, `imagen_url`.

### US-016 — Asociar producto a categorías
M2M via ProductoCategoria.

### US-017 — Asociar ingredientes a producto
M2M via ProductoIngrediente con `es_removible`.

### US-018 — Listar productos del catálogo (público)
Filtros: `categoria`, `busqueda` (ILIKE), `disponible`. Paginación. Solo `disponible=true` y no eliminados.

### US-019 — Ver detalle de producto (público)
Con ingredientes (y badge de alérgeno) y categorías.

### US-020 — Editar producto (STOCK/ADMIN)
### US-021 — Gestionar stock (STOCK/ADMIN) — `PATCH /productos/{id}/disponibilidad`
### US-022 — Eliminar producto (soft delete)
### US-023 — Filtrar productos por alérgenos

---

## Épica 06 — Perfil del Cliente (Sprint 3)

### US-061 — Ver perfil propio
### US-062 — Editar perfil (nombre, teléfono — NO el email)
### US-063 — Cambiar contraseña (invalida todos los refresh tokens)

---

## Épica 07 — Direcciones de Entrega (Sprint 4)

### US-024 — Crear dirección (primera = predeterminada automáticamente)
### US-025 — Listar direcciones propias
### US-026 — Editar dirección propia
### US-027 — Eliminar dirección
### US-028 — Establecer dirección predeterminada (operación transaccional)

---

## Épica 08 — Carrito de Compras (Sprint 4)

> El carrito es **completamente client-side**. No hay endpoints de carrito en el backend.

### US-029 — Agregar producto al carrito (Zustand persist)
Si ya existe, incrementa cantidad. Persiste en localStorage.

### US-030 — Personalizar producto (excluir ingredientes)
Solo ingredientes que el producto tiene. Se almacena como `exclusiones: number[]`.

### US-031 — Modificar cantidad en carrito
Cantidad = 0 → elimina el item.

### US-032 — Eliminar item del carrito
### US-033 — Ver resumen del carrito (items, subtotales, total)
### US-034 — Vaciar carrito (con confirmación modal)

---

## Épica 09 — Validaciones Pre-Checkout (Sprint 5)

### US-069 — Validar disponibilidad al hacer checkout
Pre-validación client-side + validación definitiva server-side dentro de la transacción.

### US-070 — Verificar precios actualizados
Comparar precio del carrito (localStorage) vs precio actual (DB). Notificar diferencia.

---

## Épica 10 — Creación de Pedidos (Sprint 5)

### US-035 — Crear pedido desde el carrito
Atómico (UoW): INSERT Pedido + N DetallePedido + HistorialEstadoPedido inicial. Snapshot de precio y dirección. Vaciar carrito al finalizar.
**Reglas**: RN-PE01–RN-PE08, RN-FS07.

### US-036 — Validación de stock al crear pedido (SELECT FOR UPDATE)
### US-037 — Snapshot de precios en DetallePedido
### US-038 — Snapshot de dirección en Pedido

---

## Épica 11 — Pagos con MercadoPago (Sprint 6)

### US-045 — Iniciar proceso de pago
Crear orden MP. Generar `idempotency_key` UUID. Tokenización en browser (PCI SAQ-A).
**Reglas**: RN-PA01, RN-PA02, RN-PA09, RN-AU09.

### US-046 — Procesar webhook IPN
Responder 200 inmediatamente. Verificar firma. Consultar estado real en API MP. Idempotente.
**Reglas**: RN-PA02–RN-PA07.

### US-047 — Consultar estado de pago propio
### US-048 — Reintentar pago rechazado (nuevo idempotency_key)

---

## Épica 12 — Máquina de Estados de Pedidos (Sprint 6)

### US-039 — PENDIENTE → CONFIRMADO (solo automático por webhook)
Decremento atómico de stock. Registro en historial con actor=SISTEMA.

### US-040 — CONFIRMADO → EN_PREP (PEDIDOS/ADMIN)
### US-041 — EN_PREP → EN_CAMINO (PEDIDOS/ADMIN)
### US-042 — EN_CAMINO → ENTREGADO (PEDIDOS/ADMIN) — estado terminal
### US-043 — Cancelar pedido (con restauración de stock si venía de CONFIRMADO)
### US-044 — Historial de estados (append-only, visible para propietario/Admin)

---

## Épica 13 — Visualización de Pedidos (Sprint 7)

### US-049 — Ver mis pedidos (Cliente) — lista paginada, filtrable por estado
### US-050 — Ver detalle de mi pedido (con items, snapshots, historial)
### US-051 — Ver todos los pedidos (PEDIDOS/ADMIN) — con filtros avanzados
### US-052 — Ver detalle de cualquier pedido (PEDIDOS/ADMIN)

---

## Épica 14 — Notificaciones y Feedback UX (Sprint 7)

### US-071 — Confirmación visual al crear pedido (pantalla con resumen)
### US-072 — Feedback de retorno de MercadoPago (success/failure/pending)

---

## Épica 15 — Administración de Usuarios (Sprint 8)

### US-053 — Listar usuarios (ADMIN) — con búsqueda y filtro por rol
### US-054 — Editar usuario y rol (ADMIN) — invalida refresh tokens del usuario
### US-055 — Desactivar usuario (soft delete) — invalida todos sus tokens

---

## Épica 16 — Gestión Avanzada de Catálogo (Sprint 8)

### US-064 — Acceso Admin a catálogo (ADMIN tiene mismos permisos que STOCK)
### US-065 — Acceso Admin a pedidos (ADMIN tiene mismos permisos que PEDIDOS)

---

## Épica 17 — Panel de Métricas y Dashboard (Sprint 8)

### US-056 — Dashboard de métricas generales (ventas, pedidos por estado, usuarios)
### US-057 — Gráfico de ventas por período (LineChart de recharts)
### US-058 — Top productos más vendidos (BarChart de recharts)
### US-059 — Métricas de pedidos por estado (PieChart de recharts)

---

## Épica 18 — Configuración del Sistema (Sprint 8)

### US-060 — Panel de configuración general (parámetros operativos en tabla key-value)

---

## Resumen por prioridad

| Prioridad | Épicas | US Count |
|-----------|--------|----------|
| Alta (Sprint 0-6) | 00, 01, 03, 04, 05, 07, 08, 10, 11, 12 | ~55 US |
| Media (Sprint 7-8) | 02, 06, 09, 13, 14, 15, 16, 17 | ~18 US |
| Baja | 18 | 1 US |
| **Total** | 19 épicas | **77 US** |
