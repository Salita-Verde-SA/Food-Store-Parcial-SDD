# Arquitectura Propuesta

## Patrones aplicados

| Patrón | Dónde se usa | Por qué |
|--------|-------------|---------|
| **Repository Pattern** | Backend — capa de acceso a datos | Abstrae queries de SQLAlchemy; facilita testing con mocks; `BaseRepository[T]` genérico evita duplicación |
| **Unit of Work (UoW)** | Backend — gestión de transacciones | Garantiza atomicidad en operaciones multi-tabla (crear pedido = 3 INSERT atómicos) |
| **Service Layer** | Backend — lógica de negocio | Centraliza reglas en un lugar predecible y testeable; independiente del framework HTTP |
| **Snapshot Pattern** | Backend/BD — DetallePedido, Pedido | Precios y direcciones inmutables al crear el pedido; cambios futuros no afectan historial |
| **Soft Delete** | Backend/BD — entidades de negocio | `deleted_at TIMESTAMPTZ` — preserva integridad referencial y datos históricos |
| **Audit Trail Append-Only** | Backend/BD — HistorialEstadoPedido | Solo INSERT; trazabilidad completa e inmutable del ciclo de vida de cada pedido |
| **State Machine (FSM)** | Backend — módulo pedidos | Transiciones del pedido validadas en Service contra mapa explícito de transiciones permitidas |
| **Idempotent Payments** | Backend — módulo pagos | `idempotency_key` UUID evita cobros duplicados por reintentos de webhook |
| **Feature-Sliced Design (FSD)** | Frontend | Organización por capas con reglas estrictas de importación; evita dependencias circulares |
| **Custom Hooks** | Frontend | Encapsulan lógica de TanStack Query; componentes enfocados en presentación |
| **Optimistic Updates** | Frontend | TanStack Query `onMutate/onError/onSettled`; UI responsiva sin latencia perceptible |
| **Webhook/IPN** | Backend — integración MP | MercadoPago notifica asíncronamente; evita polling constante del estado del pago |

---

## Estructura de directorios

```
food-store/
├── backend/
│   ├── app/
│   │   ├── main.py               ← FastAPI app, CORS, rate limiting, routers
│   │   ├── core/
│   │   │   ├── config.py         ← Variables de entorno (pydantic-settings)
│   │   │   ├── database.py       ← Engine y SessionFactory de SQLAlchemy
│   │   │   ├── security.py       ← JWT create/verify, bcrypt hash/verify
│   │   │   ├── uow.py            ← UnitOfWork context manager
│   │   │   ├── repository.py     ← BaseRepository[T] genérico
│   │   │   └── dependencies.py   ← get_current_user, require_role
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── model.py      ← RefreshToken SQLModel table
│   │   │   │   ├── schemas.py    ← LoginRequest, RegisterRequest, TokenResponse
│   │   │   │   ├── repository.py ← RefreshTokenRepository
│   │   │   │   ├── service.py    ← AuthService (login, register, refresh, logout)
│   │   │   │   └── router.py     ← /api/v1/auth/*
│   │   │   ├── usuarios/
│   │   │   ├── categorias/
│   │   │   ├── productos/
│   │   │   ├── ingredientes/
│   │   │   ├── direcciones/
│   │   │   ├── pedidos/
│   │   │   ├── pagos/
│   │   │   └── admin/
│   │   └── db/
│   │       └── seed.py           ← Script de seed idempotente
│   ├── alembic/
│   │   └── versions/             ← Migraciones versionadas
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── main.tsx          ← ReactDOM.render, providers
    │   │   ├── App.tsx           ← Router raíz
    │   │   └── providers.tsx     ← QueryClientProvider, ThemeProvider
    │   ├── pages/
    │   │   ├── CatalogoPage.tsx
    │   │   ├── ProductoDetailPage.tsx
    │   │   ├── CheckoutPage.tsx
    │   │   ├── MisPedidosPage.tsx
    │   │   ├── LoginPage.tsx
    │   │   ├── RegisterPage.tsx
    │   │   └── admin/
    │   ├── features/
    │   │   ├── auth/             ← LoginForm, RegisterForm, ProtectedRoute
    │   │   ├── catalogo/         ← CatalogoGrid, ProductoCard, FiltrosCatalogo
    │   │   ├── carrito/          ← CartDrawer, CartItem, CartSummary
    │   │   ├── checkout/         ← CheckoutForm, CardPayment (MP), OrderConfirmation
    │   │   ├── pedidos/          ← PedidosList, PedidoDetail, HistorialTimeline
    │   │   └── admin/            ← Dashboard, GestionPedidos, StockTable, CRUDs
    │   ├── entities/
    │   │   ├── producto/         ← Tipo Producto + useProductos hook
    │   │   ├── pedido/           ← Tipo Pedido + usePedidos hook
    │   │   └── usuario/          ← Tipo Usuario + useUsuario hook
    │   ├── shared/
    │   │   ├── api/
    │   │   │   └── axios.ts      ← Axios instance + interceptores JWT
    │   │   ├── stores/
    │   │   │   ├── authStore.ts  ← accessToken, user, isAuthenticated
    │   │   │   ├── cartStore.ts  ← items, addItem, removeItem, etc.
    │   │   │   ├── paymentStore.ts
    │   │   │   └── uiStore.ts
    │   │   ├── ui/               ← Button, Input, Modal, Toast, Skeleton, Badge
    │   │   └── types/            ← Tipos globales TypeScript
    │   └── index.css             ← Tailwind CSS imports
    ├── vite.config.ts
    ├── tsconfig.json             ← strict: true
    └── .env.example
```

---

## Regla de dependencias del backend (INVIOLABLE)

```
Router → Service → UoW → Repository → Model
```

- `Router`: HTTP puro — parsear request, validar schema Pydantic, delegar al Service
- `Service`: Lógica de negocio — stateless, orquesta via UoW, lanza HTTPException
- `UoW`: Gestión de transacción — abre sesión, provee repos, commit/rollback automático
- `Repository`: Acceso a BD — queries sin lógica de negocio, hereda `BaseRepository[T]`
- `Model`: SQLModel tables — sin imports de capas superiores

**Ninguna capa importa de la capa superior. Sin excepciones.**

---

## Seguridad

| Aspecto | Implementación |
|---------|---------------|
| Autenticación | JWT HS256 — access token 30min, refresh token 7días almacenado hasheado en BD |
| Autorización | RBAC con `require_role(roles: list[str])` en FastAPI — HTTP 403 si rol insuficiente |
| Hashing | bcrypt cost factor ≥ 12 (Passlib) |
| Rate limiting | slowapi — 5 intentos/15min en login por IP; HTTP 429 + `Retry-After` |
| PCI compliance | Tokenización de tarjetas 100% en browser (MP SDK) — SAQ-A level |
| CORS | `CORSMiddleware` en `main.py` — orígenes desde variable de entorno `CORS_ORIGINS` |
| SQL injection | SQLAlchemy ORM con queries parametrizados — nunca concatenación de SQL |
| Secrets | `.env` excluido del repositorio; `.env.example` documenta variables |

---

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción | Ejemplo | Sensible |
|---------|-------------|---------|:--------:|
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://user:pass@localhost:5432/foodstore` | ✅ |
| `SECRET_KEY` | Clave para firmar JWT (mín. 64 chars) | `openssl rand -hex 32` | ✅ |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Duración access token | `30` | ❌ |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Duración refresh token | `7` | ❌ |
| `CORS_ORIGINS` | Orígenes permitidos | `http://localhost:5173` | ❌ |
| `MP_ACCESS_TOKEN` | Token de acceso MP (backend) | `TEST-xxx` | ✅ |
| `MP_PUBLIC_KEY` | Clave pública MP | `TEST-xxx` | ❌ |
| `MP_NOTIFICATION_URL` | URL del webhook IPN | `https://dominio.com/api/v1/pagos/webhook` | ❌ |
| `ADMIN_EMAIL` | Email del admin inicial | `admin@foodstore.com` | ❌ |
| `ADMIN_PASSWORD` | Contraseña del admin inicial | `Admin1234!` | ✅ |

### Frontend (`frontend/.env`)

| Variable | Descripción | Ejemplo | Sensible |
|---------|-------------|---------|:--------:|
| `VITE_API_URL` | URL base del backend | `http://localhost:8000` | ❌ |
| `VITE_MP_PUBLIC_KEY` | Clave pública MP para SDK | `TEST-xxx` | ❌ |

---

## Convenciones de código

### Backend (Python)
- `snake_case` para variables, funciones y módulos
- `PascalCase` para clases (modelos, schemas, repositorios)
- Funciones < 50 líneas; SRP
- Docstrings en servicios y repositorios complejos
- Sin `session.commit()` directo en Services — solo el UoW hace commit

### Frontend (TypeScript)
- `camelCase` para variables y funciones
- `PascalCase` para componentes y tipos
- `SCREAMING_SNAKE_CASE` para constantes globales
- `strict: true` en TypeScript — sin `any`
- Suscripción por slice en Zustand: `useStore(s => s.campo)`, nunca `useStore()`
- FSD: imports solo fluyen hacia abajo — `Pages → Features → Entities → Shared`

### General
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`
- Sin co-authored-by ni atribución a IA
