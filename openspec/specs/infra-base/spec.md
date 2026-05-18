## ADDED Requirements

### Requirement: core-structure
El sistema debe tener una estructura de monorepo con backend (FastAPI) y frontend (React) claramente separados.

#### Scenario: backend-folder
- **WHEN** se explora la raíz del proyecto
- **THEN** debe existir una carpeta `backend/` con `app/`, `alembic/` y `requirements.txt`.

#### Scenario: frontend-folder
- **WHEN** se explora la raíz del proyecto
- **THEN** debe existir una carpeta `frontend/` con `src/`, `vite.config.ts` y `package.json`.
