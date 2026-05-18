# Food Store — Repositorio Base

Sistema de e-commerce de productos alimenticios desarrollado con **Spec-Driven Development (SDD)** usando OPSX y Claude Code.

---

## Documentación del sistema

Antes de escribir una línea de código, leé los tres documentos en `docs/`:

| Archivo | Contenido |
|---------|-----------|
| `docs/Descripcion.txt` | Visión general, actores del sistema y stack tecnológico |
| `docs/Integrador.txt` | Arquitectura en capas, ERD, API REST y patrones de diseño |
| `docs/Historias_de_usuario.txt` | US-000 a US-076 con criterios de aceptación y reglas de negocio |

Estos documentos son la fuente de verdad del sistema. El agente los lee antes de cada propuesta.

---

## Stack tecnológico

**Backend**: FastAPI · SQLModel · PostgreSQL · Alembic · bcrypt · python-jose · slowapi · MercadoPago SDK  
**Frontend**: React · TypeScript · Vite · TanStack Query · TanStack Form · Zustand · Axios · Tailwind CSS · Recharts

---

## Setup del entorno de desarrollo

### Requisitos previos
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Claude Code: `npm install -g @anthropic-ai/claude-code`
- OpenSpec CLI: `npm install -g @fission-ai/openspec`

### 1. Clonar e inicializar

```bash
git clone <url-del-repo> food-store
cd food-store
```

### 2. Inicializar OpenSpec

```bash
npx @fission-ai/openspec@latest init
```

Esto genera la carpeta `openspec/` donde van a vivir todos los artefactos del proyecto.

### 3. Backend

#### ⚙️ Configuración Inicial
```bash
cd backend
cp .env.example .env
```
> [!IMPORTANT]
> **Simulador de Mercado Pago offline local (Recomendado para Dev):**  
> Para poder usar el checkout de forma local sin requerir credenciales reales ni internet (evitando el error `403 Forbidden`), configurá en tu `.env`:  
> `MP_ACCESS_TOKEN="TEST-MP-TOKEN"`

#### 📦 Creación de Entorno Virtual e Instalación
```bash
# 1. Crear el entorno virtual en la carpeta 'venv' (sin el punto delante)
python -m venv venv

# 2. Instalar las dependencias utilizando el pip del entorno virtual de forma segura
# En Windows (PowerShell/CMD):
.\venv\Scripts\pip install -r requirements.txt

# En Linux/macOS (Bash):
./venv/bin/pip install -r requirements.txt
```

#### 🗄️ Inicialización de Base de Datos y Semillero (Seed)
```bash
# Correr las migraciones iniciales de base de datos
# En Windows:
.\venv\Scripts\alembic upgrade head
# En Linux/macOS:
./venv/bin/alembic upgrade head

# Poblar la base de datos con usuarios y catálogo inicial de prueba (Clientes, Admin, Productos, etc.)
# En Windows:
.\venv\Scripts\python -m app.db.seed
# En Linux/macOS:
./venv/bin/python -m app.db.seed
```

#### 🚀 Ejecutar el Servidor de Desarrollo (Sin errores de dependencias globales)
Para garantizar al 100% que FastAPI corra con las dependencias del entorno virtual, ejecutalo llamando directamente al módulo de uvicorn desde el interprete de la `venv` especificando el puerto `8000`:

*   **En Windows (PowerShell / CMD):**
    ```powershell
    .\venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
    ```

*   **En Linux / macOS (Terminal):**
    ```bash
    ./venv/bin/python -m uvicorn app.main:app --reload --port 8000
    ```

API disponible en `http://127.0.0.1:8000`  
Documentación interactiva Swagger en `http://127.0.0.1:8000/docs`

### 4. Frontend

```bash
cd frontend
cp .env.example .env
# Completar VITE_API_URL=http://localhost:8000

npm install
npm run dev
```

App disponible en `http://localhost:5173`

---

## Flujo de desarrollo con OPSX

Todo cambio al sistema sigue este ciclo:

```
/opsx:explore   →  pensar antes de comprometerse (opcional)
/opsx:propose   →  generar propuesta + diseño + tareas
/opsx:apply     →  implementar tarea por tarea
/opsx:archive   →  sincronizar specs y cerrar el change
```

### Orden de implementación

```
us-000-setup               ← infraestructura base (Sprint 0)
us-001-auth                ← JWT · RBAC · refresh tokens
us-002-categorias          ← catálogo jerárquico
us-003-productos           ← CRUD · stock · ingredientes
us-004-carrito             ← estado client-side con Zustand
us-005-pedidos             ← UoW · FSM · audit trail
us-006-pagos-mercadopago   ← checkout · webhooks IPN
us-007-admin               ← panel · métricas
us-008-direcciones         ← direcciones de entrega
```

---

## Variables de entorno

Crear `backend/.env` a partir de `backend/.env.example`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/foodstore
SECRET_KEY=tu-clave-secreta-de-64-caracteres-minimo
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
MP_ACCESS_TOKEN=TEST-tu-token-de-mercadopago
MP_PUBLIC_KEY=TEST-tu-public-key-de-mercadopago
CORS_ORIGINS=http://localhost:5173
```

Crear `frontend/.env` a partir de `frontend/.env.example`:

```env
VITE_API_URL=http://localhost:8000
VITE_MP_PUBLIC_KEY=TEST-tu-public-key-de-mercadopago
```

---

## Convenciones de commits

```
feat(modulo): descripción del cambio
fix(modulo): descripción del bug corregido
refactor(modulo): descripción del refactor
test(modulo): descripción de los tests
docs(modulo): descripción del cambio en docs
```

---

## Branch didáctico — `clase-demo`

El branch [`clase-demo`](../../tree/clase-demo) tiene el flujo completo de la clase ensayado paso a paso, con **9 tags** que marcan el estado del repositorio en cada hito del proceso SDD. Sirve como referencia para revisar cómo queda el repo después de cada paso.

```bash
git fetch --tags
git checkout clase-demo
```

| Tag | Estado del repo |
|-----|-----------------|
| `step-0-clean` | Repo recién clonado |
| `step-2-skills-installed` | Después de instalar las skills (las skills viven en `~/.agents/skills/`, no en el repo) |
| `step-3-kb-generated` | Base de conocimiento generada en `knowledge-base/` (10 archivos canónicos + README) |
| `step-4-openspec-init` | OpenSpec inicializado: `openspec/`, `.opencode/`, `.claude/` |
| `step-5-roadmap-done` | `CHANGES.md` (raíz) con árbol de dependencias, gates, camino crítico y 10 changes |
| `step-6-agents-configured` | `AGENTS.md` (referencia `CHANGES.md`) y `openspec/config.yaml` con context y rules |
| `step-7a-proposed` | `us-000-setup` propuesto: proposal + design + 4 specs + tasks |
| `step-7b-applied` | `us-000-setup` implementado: backend FastAPI + frontend Vite + tests |
| `step-7c-archived` | `us-000-setup` archivado: specs sincronizados, change cerrado |

Para saltar a un estado específico:

```bash
git checkout step-3-kb-generated     # ver cómo queda con la KB completa
git checkout step-7c-archived        # ver el repo después del primer change
git checkout clase-demo              # volver al estado final
```

### Skills usadas en la clase

- **kb-creator** — genera la base de conocimiento en `knowledge-base/`. Repo: [JuanCruzRobledo/kb-creator](https://github.com/JuanCruzRobledo/kb-creator).
- **roadmap-generator** — genera `CHANGES.md` (raíz) desde la KB. Repo: [JuanCruzRobledo/roadmap-generator](https://github.com/JuanCruzRobledo/roadmap-generator).

Instalación:

```bash
npx skills add https://github.com/JuanCruzRobledo/kb-creator
npx skills add https://github.com/JuanCruzRobledo/roadmap-generator
```
