# Changes — Qué son y cómo trabajar con ellos

## ¿Qué es un change?

Un **change** es la unidad mínima de trabajo en el flujo SDD. No es una tarea suelta ni un ticket — es un conjunto de tres artefactos que juntos describen, diseñan e implementan una funcionalidad del sistema de forma completa y trazable.

Cada change tiene su propia carpeta dentro de `openspec/changes/` y contiene exactamente estos tres archivos:

```
openspec/changes/nombre-del-change/
├── proposal.md   ← QUÉ se va a construir y POR QUÉ
├── design.md     ← CÓMO técnicamente (arquitectura, modelos, endpoints)
└── tasks.md      ← CHECKLIST atómica de implementación
```

Una vez que el change está completamente implementado y verificado, se **archiva**: las specs se sincronizan en `openspec/specs/` y la carpeta del change se mueve al historial. Esa documentación viva queda disponible para todos los changes futuros.

---

## ¿Para qué sirve?

- **Trazabilidad**: cada línea de código tiene una propuesta y un diseño que la justifica.
- **Revisión antes de implementar**: el diseño se aprueba en papel antes de que el agente escriba una sola línea de código. Un error en el diseño cuesta 0. El mismo error en código cuesta horas de refactor.
- **Contexto persistente**: cuando el agente empieza un nuevo change, lee las specs de los changes anteriores ya archivados. Sabe qué existe, qué patrones se usaron, y no propone código duplicado o inconsistente.
- **Documentación automática**: al terminar el proyecto, `openspec/specs/` es la documentación completa del sistema. No hay que escribirla por separado.

---

## ¿Cómo se generan?

Los changes **no se crean a mano** — los genera el agente a partir de los documentos del proyecto y las historias de usuario. El flujo es siempre el mismo:

### 1. Explorar (opcional)
Antes de proponer, podés pedirle al agente que piense y analice el problema:
```
/opsx:explore [tema o pregunta]
```
El agente investiga el codebase y razona con vos. No genera código ni toma compromisos. Útil cuando no tenés claro cómo encaja algo en la arquitectura.

### 2. Proponer
Le pedís al agente que genere los tres artefactos del change:
```
/opsx:propose [nombre-del-change]
```
El agente lee los documentos en `docs/`, las historias de usuario relevantes y las specs ya archivadas. Genera `proposal.md`, `design.md` y `tasks.md`.

**Antes de continuar, revisás los artefactos.** Verificás que:
- El diseño respeta la arquitectura en capas (Router → Service → UoW → Repository → Model)
- Las tareas son atómicas (horas, no días)
- Las reglas de negocio están reflejadas
- El stack tecnológico es el correcto

Si algo está mal, lo corregís antes de implementar.

### 3. Aplicar
Una vez aprobados los artefactos, el agente implementa tarea por tarea:
```
/opsx:apply [nombre-del-change]
```
El agente lee `design.md` y `tasks.md`, implementa cada tarea en orden y la marca como completada. No improvisa — sigue el plan.

### 4. Archivar
Cuando todas las tareas están completas y los tests pasan:
```
/opsx:archive [nombre-del-change]
```
Las specs se sincronizan, el change se mueve al historial y el próximo change ya puede usarlas como contexto.

---

## ¿Cómo saber qué changes crear para este proyecto?

Los changes **no están predefinidos** — son una decisión de diseño que tomás vos basándote en los documentos del sistema.

El primer paso es pedirle al agente que analice los tres documentos de `docs/` y proponga el mapa completo de changes: cuáles son, en qué orden deben implementarse y por qué.

```
Analizá los documentos en docs/ y proponé el mapa completo 
de changes para desarrollar Food Store. Para cada change indicá:
- nombre sugerido
- qué funcionalidad cubre
- qué historias de usuario implementa
- de qué otros changes depende y por qué
```

Revisás la propuesta, la discutís, la ajustás si hace falta — y recién entonces empezás con el primer `/opsx:propose`.

---

## Reglas importantes

- **Nunca implementes sin artefactos.** Si no existe `proposal.md` y `design.md` aprobados, no hay `/opsx:apply`.
- **El orden importa.** Si el change B necesita código del change A, A tiene que estar archivado antes de proponer B.
- **Un change = un commit** (o varios commits atómicos). Nunca mezcles dos changes en un mismo commit.
# Changes — Qué son y cómo trabajar con ellos

## ¿Qué es un change?

Un **change** es la unidad mínima de trabajo en el flujo SDD. No es una tarea suelta ni un ticket — es un conjunto de tres artefactos que juntos describen, diseñan e implementan una funcionalidad del sistema de forma completa y trazable.

Cada change tiene su propia carpeta dentro de `openspec/changes/` y contiene exactamente estos tres archivos:

```
openspec/changes/nombre-del-change/
├── proposal.md   ← QUÉ se va a construir y POR QUÉ
├── design.md     ← CÓMO técnicamente (arquitectura, modelos, endpoints)
└── tasks.md      ← CHECKLIST atómica de implementación
```

Una vez que el change está completamente implementado y verificado, se **archiva**: las specs se sincronizan en `openspec/specs/` y la carpeta del change se mueve al historial. Esa documentación viva queda disponible para todos los changes futuros.

---

## ¿Para qué sirve?

- **Trazabilidad**: cada línea de código tiene una propuesta y un diseño que la justifica.
- **Revisión antes de implementar**: el diseño se aprueba en papel antes de que el agente escriba una sola línea de código. Un error en el diseño cuesta 0. El mismo error en código cuesta horas de refactor.
- **Contexto persistente**: cuando el agente empieza un nuevo change, lee las specs de los changes anteriores ya archivados. Sabe qué existe, qué patrones se usaron, y no propone código duplicado o inconsistente.
- **Documentación automática**: al terminar el proyecto, `openspec/specs/` es la documentación completa del sistema. No hay que escribirla por separado.

---

## ¿Cómo se generan?

Los changes **no se crean a mano** — los genera el agente a partir de los documentos del proyecto y las historias de usuario. El flujo es siempre el mismo:

### 1. Explorar (opcional)
Antes de proponer, podés pedirle al agente que piense y analice el problema:
```
/opsx:explore [tema o pregunta]
```
El agente investiga el codebase y razona con vos. No genera código ni toma compromisos. Útil cuando no tenés claro cómo encaja algo en la arquitectura.

### 2. Proponer
Le pedís al agente que genere los tres artefactos del change:
```
/opsx:propose [nombre-del-change]
```
El agente lee los documentos en `docs/`, las historias de usuario relevantes y las specs ya archivadas. Genera `proposal.md`, `design.md` y `tasks.md`.

**Antes de continuar, revisás los artefactos.** Verificás que:
- El diseño respeta la arquitectura en capas (Router → Service → UoW → Repository → Model)
- Las tareas son atómicas (horas, no días)
- Las reglas de negocio están reflejadas
- El stack tecnológico es el correcto

Si algo está mal, lo corregís antes de implementar.

### 3. Aplicar
Una vez aprobados los artefactos, el agente implementa tarea por tarea:
```
/opsx:apply [nombre-del-change]
```
El agente lee `design.md` y `tasks.md`, implementa cada tarea en orden y la marca como completada. No improvisa — sigue el plan.

### 4. Archivar
Cuando todas las tareas están completas y los tests pasan:
```
/opsx:archive [nombre-del-change]
```
Las specs se sincronizan, el change se mueve al historial y el próximo change ya puede usarlas como contexto.

---

## ¿Cómo saber qué changes crear para este proyecto?

Los changes **no están predefinidos** — son una decisión de diseño que tomás vos basándote en los documentos del sistema.

El primer paso es pedirle al agente que analice los tres documentos de `docs/` y proponga el mapa completo de changes: cuáles son, en qué orden deben implementarse y por qué.

```
Analizá los documentos en docs/ y proponé el mapa completo 
de changes para desarrollar Food Store. Para cada change indicá:
- nombre sugerido
- qué funcionalidad cubre
- qué historias de usuario implementa
- de qué otros changes depende y por qué
```

Revisás la propuesta, la discutís, la ajustás si hace falta — y recién entonces empezás con el primer `/opsx:propose`.

---

## Reglas importantes

- **Nunca implementes sin artefactos.** Si no existe `proposal.md` y `design.md` aprobados, no hay `/opsx:apply`.
- **El orden importa.** Si el change B necesita código del change A, A tiene que estar archivado antes de proponer B.
- **Un change = un commit** (o varios commits atómicos). Nunca mezcles dos changes en un mismo commit.
- **Las specs son código.** Se versionan en git, se revisan en PRs, evolucionan con el proyecto.

---

Última actualización: 2026-05-18

## Ya realizado (archivado en OPSX)

| ID | Change Name | Descripcion | US Relacionadas | Dependencias | Estado | Evidencia |
|---|---|---|---|---|---|---|
| 0 | us-000-setup | Infraestructura base (Backend/Frontend) | US-000 a US-000e, US-068 | - | ✅ Hecho (archivado 2026-05-14) | [openspec/changes/archive/2026-05-14-us-000-setup/](file:///c:/Users/eduar/OneDrive/Escritorio/UTN%204/Gestion%20desarrollo%20de%20software/RepositorioBaseFoodStore-SDD/openspec/changes/archive/2026-05-14-us-000-setup/) |
| 1 | us-001-auth | Autenticación y Autorización (JWT · RBAC) | US-001 a US-006, US-073, US-075, US-076, US-066, US-067 | us-000-setup | ✅ Hecho (archivado 2026-05-18) | [openspec/changes/archive/2026-05-18-us-001-auth/](file:///c:/Users/eduar/OneDrive/Escritorio/UTN%204/Gestion%20desarrollo%20de%20software/RepositorioBaseFoodStore-SDD/openspec/changes/archive/2026-05-18-us-001-auth/) |
| 2 | us-002-categorias | Catálogo de Categorías Jerárquicas con Soft Delete | US-002 | us-001-auth | ✅ Hecho (archivado 2026-05-18) | [openspec/changes/archive/2026-05-18-us-002-categorias/](file:///c:/Users/eduar/OneDrive/Escritorio/UTN%204/Gestion%20desarrollo%20de%20software/RepositorioBaseFoodStore-SDD/openspec/changes/archive/2026-05-18-us-002-categorias/) |
| 3 | us-003-productos | Catálogo de Productos e Ingredientes con Alérgenos | US-003, US-004, US-005, US-018 | us-002-categorias | ✅ Hecho (archivado 2026-05-18) | [openspec/changes/archive/2026-05-18-us-003-productos/](file:///c:/Users/eduar/OneDrive/Escritorio/UTN%204/Gestion%20desarrollo%20de%20software/RepositorioBaseFoodStore-SDD/openspec/changes/archive/2026-05-18-us-003-productos/) |
| 4 | us-004-carrito | Gestión del Carrito de Compras del Cliente | US-004 | us-003-productos | ✅ Hecho (archivado 2026-05-18) | [openspec/changes/archive/2026-05-18-us-004-carrito/](file:///c:/Users/eduar/OneDrive/Escritorio/UTN%204/Gestion%20desarrollo%20de%20software/RepositorioBaseFoodStore-SDD/openspec/changes/archive/2026-05-18-us-004-carrito/) |
| 5 | us-005-pedidos | Gestión de Pedidos, Direcciones y FSM con stock | US-024 a US-028, US-035 a US-044, US-049 a US-052, US-069, US-070, US-071 | us-004-carrito | ✅ Hecho (archivado 2026-05-18) | [openspec/changes/archive/2026-05-18-us-005-pedidos/](file:///c:/Users/eduar/OneDrive/Escritorio/UTN%204/Gestion%20desarrollo%20de%20software/RepositorioBaseFoodStore-SDD/openspec/changes/archive/2026-05-18-us-005-pedidos/) |
| 6 | us-006-pagos-mercadopago | Integración de MercadoPago Checkout API (Preferencia, Webhook IPN, Idempotencia y Reintentos) | US-029 a US-034, US-045 a US-048 | us-005-pedidos | ✅ Hecho (archivado 2026-05-18) | [openspec/changes/archive/2026-05-18-us-006-pagos-mercadopago/](file:///c:/Users/eduar/OneDrive/Escritorio/UTN%204/Gestion%20desarrollo%20de%20software/RepositorioBaseFoodStore-SDD/openspec/changes/archive/2026-05-18-us-006-pagos-mercadopago/) |

