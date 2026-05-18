# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Authoritative project context

Two documents take precedence over anything inferred from code:

- `AGENTS.md` — operating rules for this repo: SDD/OPSX workflow, post-archive git protocol, Engram memory sync, backend "Regla de Oro" import flow, FSD frontend rules, Skills index, environment detection (`.opencode/` vs `.agent/`). **Read it before proposing or applying changes.**
- `docs/` — source of truth for the system itself:
  - `docs/Integrador.txt` — architecture, ERD v5, REST API
  - `docs/Descripcion.txt` — stack and actors
  - `docs/Historias_de_usuario.txt` — US-000 … US-076 with acceptance criteria
  - `docs/CHANGES.md` — human-readable log of archived OPSX changes

The README is in Spanish; preserve Spanish identifiers, comments, and commit scopes when editing existing code.

## Commands

All backend commands assume the venv lives at `backend/venv/` (no leading dot — this is the convention the README enforces). Run from `backend/`:

```bash
# Install / migrate / seed
./venv/Scripts/pip install -r requirements.txt        # Windows
./venv/Scripts/alembic upgrade head
./venv/Scripts/python -m app.db.seed

# Dev server (must invoke uvicorn through venv's python, not global)
./venv/Scripts/python -m uvicorn app.main:app --reload --port 8000

# Tests
./venv/Scripts/python -m pytest                       # all
./venv/Scripts/python -m pytest tests/test_pedidos.py # single file
./venv/Scripts/python -m pytest tests/test_pedidos.py::test_name  # single test

# New migration
./venv/Scripts/alembic revision --autogenerate -m "descripcion"
```

On Linux/macOS swap `./venv/Scripts/` for `./venv/bin/`.

Frontend, from `frontend/`:

```bash
npm install
npm run dev      # Vite on :5173 (CORS in backend allows 5173–5176)
npm run build    # tsc -b && vite build
npm run lint     # eslint .
```

There is no frontend test runner configured.

## Architecture

### Backend — Feature-First with strict unidirectional flow

The "Regla de Oro" from `AGENTS.md` is enforced by import direction:

```
Router → Service → UoW → Repository → Model
```

- `app/main.py` mounts all module routers under `settings.API_V1_STR` (`/api/v1`), wires CORS, slowapi rate limiting, and RFC 7807 error handlers.
- `app/core/uow.py` — `UnitOfWork` is an async context manager that opens a single `Session`, instantiates every repository against it, then commits on clean exit or rolls back on exception. **Services must do all DB work inside `async with UnitOfWork() as uow:` — never open sessions directly.**
- `app/core/repository.py` — generic `BaseRepository[T]` with built-in soft-delete (auto-filters `deleted_at` when the model declares it) and pagination. Module-specific repositories (e.g. `CategoriaRepository`) extend it only when extra queries are needed.
- `app/modules/<dominio>/` — each domain has `model.py · schemas.py · repository.py · service.py · router.py`. `admin/` is the exception: dashboard/reporting glue that composes other services, no model of its own.
- Services raise `HTTPException` directly; routers and repositories must not.
- Sensitive endpoints (e.g. login) decorated with `slowapi` rate limits.
- Migrations live in `backend/alembic/versions/`; never alter tables by hand.

Domain modules currently wired in `main.py`: `auth`, `categorias`, `productos`, `ingredientes`, `usuarios` (+ `usuarios_admin_router`), `admin`, `pedidos`, `pagos`, `configuracion`.

### Pedidos FSM

`PedidoService.FSM_TRANSITIONS` in `app/modules/pedidos/service.py` is the single source of truth for order-state transitions. Every state change writes a row to `HistorialEstadoPedido` (audit trail). `CANCELADO` requires a `motivo`. Pedidos store address/price snapshots (`direccion_snapshot`, `nombre_snapshot`, `precio_snapshot`) so historical data is immune to later edits.

### Frontend — Feature-Sliced Design

Layer order (imports may only flow downward):

```
app → pages → features → entities → shared
```

`src/app/router.tsx` is the route map and the canonical place to see role-gating. `ProtectedRoute` accepts `allowedRoles` (`ADMIN`, `STOCK`, `PEDIDOS`); the `/admin/*` tree is partitioned by role. Server state goes through **TanStack Query** only — do not mirror it in Zustand. Client state (cart, session, UI, payment flow) uses typed **Zustand** stores in `src/shared/stores/`. Forms use **TanStack Form** (not react-hook-form). HTTP goes through an Axios instance in `src/shared/api/` with a JWT attach + refresh interceptor. Card data uses `@mercadopago/sdk-react` tokenisation — never send raw PAN to our backend.

## SDD / OPSX workflow

Every functional change is gated by OPSX. The four-step loop:

```
/opsx:explore  →  /opsx:propose  →  /opsx:apply  →  /opsx:archive
```

- Active changes live in `openspec/changes/<name>/` (proposal · design · specs · tasks).
- Archived changes live in `openspec/changes/archive/YYYY-MM-DD-<name>/` and are the long-term spec record alongside `openspec/specs/`.
- Before any feature work, check for an active change: `openspec list --json`.
- **Before `/opsx:archive`**: ask the developer to manually test, send a one-line "what to test" summary after every successful `/opsx:apply`.
- **After `/opsx:archive`** (mandatory, automatic per `AGENTS.md`):
  1. Update `docs/CHANGES.md` — move the row to the archived section, set the date, point Evidencia at the new archive folder.
  2. `git add -A && git commit -m "feat: implement and archive <change-name> — completed all tasks and specs" && git push`.

## Engram memory sync

Engram persists shared memories in `.engram/chunks/`. The plugin auto-imports only at session start, so **after every `git pull`** run:

```bash
engram sync --import
```

When the user signals session end ("listo", "done", "cerrar sesión", etc.), `AGENTS.md` requires an automatic sequence: `engram sync` → `git add -A` → `git status` → commit → `git push` → only then call `mem_session_summary`. If `git push` fails, stop and wait for instructions — do not close the Engram session.

## Conventions specific to this repo

- Conventional Commits with module scope: `feat(pedidos): ...`, `fix(auth): ...`. **No `Co-Authored-By` or AI attribution** in commit trailers (`AGENTS.md` explicitly forbids it — overrides the default Claude Code commit trailer behavior).
- Spanish is the working language for identifiers, comments, error messages, and docs. Keep it.
- `.env` is never committed; copy from `backend/.env.example` and `frontend/.env.example`. For offline Mercado Pago dev, set `MP_ACCESS_TOKEN="TEST-MP-TOKEN"`.
- Don't run `npm run build` or production builds unless asked — the team triggers builds explicitly.
- Skills (`fastapi-python`, `postgres`, `frontend-design`, `tailwind-design-system`, `documentation-writer`, `commit-changes-reporter`) live under `<CONFIG_DIR>/skills/` where `<CONFIG_DIR>` is `.opencode/` or `.agent/` depending on environment. Read the relevant `SKILL.md` before generating code in that domain. New skills must be added to **both** directories.
