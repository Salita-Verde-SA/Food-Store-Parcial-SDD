# AGENTS.md — Food Store · Gestión de Pedidos (Dual Environment)

## Rol

Actúa como un Senior Tech Lead y Arquitecto de Software con enfoque en **Spec-Driven Development (SDD)**. Tu misión es garantizar que cada incremento del sistema sea 100% fiel a la documentación técnica en `docs/`.

---

## Detección de Entorno y Directorios

Antes de operar, identifica en qué entorno te encuentras verificando la existencia de las carpetas de configuración:

- **Entorno opencode:** Directorio de configuración en `.opencode/`.
- **Entorno Antigravity:** Directorio de configuración en `.agent/`.

> **Regla de Rutas:** Siempre que una instrucción mencione `<CONFIG_DIR>`, sustitúyela por `.opencode` o `.agent` según corresponda.

---

## Regla de trabajo (MANDATORIA): usar subagentes

- Este agente principal actúa como **orquestador/coordinador**: define el plan, delega, revisa resultados y toma decisiones.
- La ejecución concreta del trabajo (exploración intensiva, cambios multi-archivo, scripts, tests, builds, etc.) se delega a subagentes mediante la herramienta de tareas.
- Únicas excepciones permitidas: preguntas de clarificación al usuario y comandos mínimos de “estado” (p.ej. `openspec status/list`, `git status/diff/log`) para entender el contexto antes de delegar.

---

## Proyecto: Food Store

Plataforma e-commerce full-stack para gestión de pedidos de comida.

- **Backend:** FastAPI + SQLModel + PostgreSQL + Alembic · Feature-First (Router → Service → UoW → Repository → Model)
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS · Feature-Sliced Design (FSD)
- **Pagos:** MercadoPago Checkout API (tarjeta, Rapipago, Pago Fácil) + webhooks IPN
- **Auth:** JWT + RBAC (4 roles: Cliente, Admin, Gestor de Stock, Gestor de Pedidos) + refresh token en BD
- **Estado:** Zustand 4 (cliente) + TanStack Query 5 (servidor)
- **Metodología:** Spec-Driven Development (SDD) · Versión de spec: 5.0

---
## Estructura del Proyecto

```
food-store/
├── backend/           # FastAPI – módulos por dominio (Feature-First)
│   ├── auth/          # Autenticación JWT
│   ├── usuarios/      # CRUD usuarios + RBAC
│   ├── productos/     # Catálogo de productos
│   ├── pedidos/       # FSM de 6 estados + audit trail
│   └── core/          # UoW, BaseRepository y config compartida
├── frontend/          # React + TypeScript – Feature-Sliced Design (FSD)
│   ├── app/           # Root, providers y configuración del router
│   ├── pages/         # Componentes de página (Rutas)
│   ├── features/      # Lógica de negocio e interacciones
│   ├── entities/      # Modelos de dominio y stores específicos
│   └── shared/        # UI base, utilidades y hooks globales
├── docs/              # Fuente de verdad: especificación técnica SDD v5.0
├── openspec/          # Gestión de cambios y especificaciones OPSX
├── .opencode/         # Configuración y skills para el entorno opencode
└── .agent/            # Configuración y skills para el entorno Antigravity
```
## Skills Disponibles

Las skills están instaladas en `<CONFIG_DIR>/skills/`. Debes leer el `SKILL.md` correspondiente antes de codificar (en caso de que no estén consultalo con el desarrollador para ver que decision toma (crearlas o no)). AL AGREGAR UNA NUEVA SKILL VERIFICAR QUE SE AGREGUE EN AMBAS CARPETAS (.opencode y .agent).

| Contexto | Skill | Ruta de lectura |
|---|---|---|
| FastAPI, Service, Repo, Schema, UoW | `fastapi-python` | `<CONFIG_DIR>/skills/fastapi-python/SKILL.md` |
| SQL, Migraciones, Postgres | `postgres` | `<CONFIG_DIR>/skills/postgres/SKILL.md` |
| React, Componentes, Tailwind | `frontend-design` | `<CONFIG_DIR>/skills/frontend-design/SKILL.md` |
| Design System, Tokens UI | `tailwind-design-system` | `<CONFIG_DIR>/skills/tailwind-design-system/SKILL.md` |
| Docs, README, Guías | `documentation-writer` | `<CONFIG_DIR>/skills/documentation-writer/SKILL.md` |
| Reportar cambios (commits) | `commit-changes-reporter` | `<CONFIG_DIR>/skills/commit-changes-reporter/SKILL.md` |

---
**Regla:** si el contexto activa una skill, leé el `SKILL.md` correspondiente **antes** de generar código. Múltiples skills pueden aplicar simultáneamente.


## Flujo OPSX (Spec-Driven Development)

Este proyecto usa **OPSX** para gestión de cambios. Los artefactos viven en `openspec/`.

```
/opsx:explore  →  /opsx:propose  →  /opsx:apply  →  /opsx:archive
```

- Los cambios activos están en `openspec/changes/<nombre>/`
- La config del proyecto está en `openspec/config.yaml`
- Antes de implementar cualquier feature nueva, verificar si existe un change activo con `openspec list --json`
- Antes de archivar un change siempre consultame y esperar el testeo manual por el desarrollador de los cambios recientes del change
- Enviar un mensaje simple al desarrollador de lo que se debe testear siempre luego de un apply exitoso y antes de un /opsx:archive.


### Sync de docs/CHANGES.md al archivar

Cada vez que completes el archivado de un change, **además de** ejecutar el comando de OPSX, mantené sincronizado el índice humano en `docs/CHANGES.md`:

```bash
/opsx:archive <change-name>
```

- Abrí `docs/CHANGES.md` y actualizá `Última actualización` a la fecha del día (formato `YYYY-MM-DD`).
- Ubicá la fila del change en la tabla donde esté (Sprint/Epic) y **movela** a `## Ya realizado (archivado en OPSX)` (manteniendo la misma estructura de columnas).
- En la fila movida, `Estado` debe quedar como `✅ Hecho (archivado YYYY-MM-DD)`.
- En la fila movida, `Evidencia` debe apuntar a `openspec/changes/archive/YYYY-MM-DD-<change-name>/`.
- Importante: el **source of truth** del cambio sigue siendo `openspec/` (OPSX). `docs/CHANGES.md` es solo un resumen para lectura rápida.

### Commit y Push automático post-archivado (MANDATORIO)

Cada vez que archives un change (luego de ejecutar `/opsx:archive <change-name>`, unificar las specs maestras y actualizar `docs/CHANGES.md`), ejecútá de manera **AUTOMÁTICA** y sin que el usuario te lo pida el siguiente flujo de resguardo en Git:

```bash
# 1. Stagear todos los cambios (código, specs principales, archive de OPSX, CHANGES.md)
git add -A

# 2. Hacer commit atómico y atinado con Conventional Commits indicando el change resuelto
git commit -m "feat: implement and archive <change-name> — completed all tasks and specs"

# 3. Pushear los cambios inmediatamente al repositorio remoto
git push
```

---

## Engram — Git Sync (memorias compartidas)

Este proyecto usa **Engram** como sistema de memoria persistente. Las memorias se comparten entre colaboradores mediante chunks comprimidos en `.engram/chunks/`.

### Protocolo post-pull (MANDATORIO)

El plugin de Engram ejecuta `engram sync --import` **solo al inicio de sesión**. Si se hace `git pull` después, los chunks nuevos NO se cargan automáticamente.

**Siempre que hagas `git pull`, ejecutá inmediatamente:**

```bash
engram sync --import
```

Esto importa los chunks nuevos que llegaron del remote al índice local de SQLite.

### Verificar estado de sync

```bash
engram sync --status
```

Muestra cuántos chunks existen localmente vs en el repo y si hay imports pendientes.

### Protocolo de cierre de sesión (AUTOMÁTICO)

Cuando el usuario diga "cerrar sesión", "terminar", "done", "listo", "eso es todo" o similar, EJECUTÁ AUTOMÁTICAMENTE este flujo **ANTES** de llamar a `mem_session_summary`:

```bash
# 1. Exportar memorias nuevas como chunks
engram sync

# 2. Stagear TODO: código + cambios de engram + cualquier archivo pendiente
git add -A

# 3. Ver qué va a entrar al commit
git status

# 4. Commitear todo junto (usar Conventional Commits si aplica, sino genérico)
git commit -m "chore: end session — sync engram memories and pending changes"

# 5. Pushear al remoto para que otros colaboradores reciban los cambios
git push
```

Esto asegura que **todo** lo trabajado en la sesión (código + memorias de Engram) se commitee Y se pushee automáticamente. Así otros colaboradores reciben tanto los cambios de código como las sesiones de Engram sin pasos intermedios.

**Importante:** después del push, recién ahí llamar a `mem_session_summary` para cerrar la sesión en Engram.

### Fallback si el push falla

Si `git push` falla (conflictos en remoto, sin acceso, etc.):
1. Informar al usuario el error
2. NO cerrar la sesión en Engram todavía
3. Esperar indicaciones del usuario

---

---

## MCPs y Configuración Técnica

La configuración de herramientas externas (MCP) varía según el entorno:

- **opencode:** Configuración en `.opencode/opencode.json`.
- **Antigravity:** Configuración en `.agent/mcp.json` (o el archivo equivalente generado).

### MCPs Activos


---

## Arquitectura Backend: Regla de Oro

El flujo de imports es **unidireccional** y no puede invertirse:
  **Router → Service → UoW → Repository → Model**

- `router.py` — HTTP puro: parsear request, validar schema, delegar al Service
- `service.py` — Lógica de negocio stateless, orquesta a través del UoW
- `core/uow.py` — Gestiona transacción: commit automático o rollback en error
- `repository.py` — Acceso a BD, sin lógica de negocio, hereda `BaseRepository[T]`
- `model.py` — SQLModel tables + relaciones, sin imports de capas superiores

---

## Convenciones del Proyecto

### Backend

- Cada módulo sigue la estructura: `model.py · schemas.py · repository.py · service.py · router.py`
- El `router.py` usa `response_model` explícito en todos los endpoints
- El `service.py` lanza `HTTPException` — nunca el router ni el repository
- Las migraciones van en `alembic/versions/` — nunca modificar tablas directamente
- Rate limiting en endpoints críticos con `slowapi` (ej: login: 5 intentos / 15 min)
- Contraseñas hasheadas con bcrypt (cost factor ≥ 12)
- Refresh tokens almacenados en BD para soporte de invalidación

### Frontend

- FSD estricto: imports solo fluyen hacia abajo — `Pages → Features → Entities → Shared`
- Estado del servidor exclusivamente con **TanStack Query** (no duplicar en Zustand)
- Estado del cliente (carrito, sesión, UI, pagos) con **Zustand stores** tipados
- HTTP con Axios + interceptor JWT (attach + refresh automático)
- Formularios con **TanStack Form** (no react-hook-form)
- Gráficos del dashboard con **recharts**
- Tokenización de tarjetas con `@mercadopago/sdk-react` — nunca manejar datos de tarjeta en frontend raw

### General

- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.) — sin co-authored-by ni atribución a IA
- Variables de entorno: usar `.env.example` como referencia — nunca commitear `.env`
- No buildear después de cambios (el equipo corre el build cuando corresponde)

## Documentación de Referencia

| Archivo | Descripción |
|---|---|
| `docs/Integrador.txt` | Especificación técnica y ERD v5 |
| `docs/Descripcion.txt` | Visión general y stack |
| `docs/Historias_de_usuario.txt` | US-000 a US-076 |
| `docs/CHANGES.md` | Log de cambios archivados |