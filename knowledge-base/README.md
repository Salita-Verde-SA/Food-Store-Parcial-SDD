# Food Store — Base de Conocimiento

Base de conocimiento generada a partir de los documentos fuente en `docs/` (Integrador.txt, Descripcion.txt, Historias_de_usuario.txt).

**Versión del sistema**: v5.0
**Fecha de generación**: 2026-05-14
**Fuentes**: `docs/Integrador.txt`, `docs/Descripcion.txt`, `docs/Historias_de_usuario.txt`

---

## Índice de Archivos

| Archivo | Contenido |
|---------|-----------|
| [01_vision_y_objetivos.md](01_vision_y_objetivos.md) | Propósito del sistema, objetivos por actor (Cliente, Admin, Gestor Stock/Pedidos), alcance v5.0, fuera de alcance, métricas de éxito |
| [02_descripcion_general.md](02_descripcion_general.md) | Stack tecnológico completo (backend/frontend), arquitectura por capas, integraciones externas (MP), resumen de API REST |
| [03_actores_y_roles.md](03_actores_y_roles.md) | Descripción de actores, matriz RBAC completa, reglas de autorización, rutas públicas |
| [04_modelo_de_datos.md](04_modelo_de_datos.md) | Dominios, ERD textual, descripción completa de las 16 entidades, seed data obligatorio |
| [05_reglas_de_negocio.md](05_reglas_de_negocio.md) | 50+ reglas codificadas por dominio (RN-AU, RN-RB, RN-CA, RN-DI, RN-CR, RN-PE, RN-FS, RN-PA, RN-DA) |
| [06_funcionalidades.md](06_funcionalidades.md) | 77 historias de usuario organizadas en 19 épicas con criterios de aceptación resumidos |
| [07_flujos_principales.md](07_flujos_principales.md) | 7 flujos E2E: registro/login, token refresh, compra completa, FSM de pedidos, UoW detallado, webhook IPN, carrito Zustand |
| [08_arquitectura_propuesta.md](08_arquitectura_propuesta.md) | Patrones (UoW, Repository, FSM, Snapshot, Soft Delete), estructura de directorios completa, seguridad, variables de entorno, convenciones |
| [09_decisiones_y_supuestos.md](09_decisiones_y_supuestos.md) | 7 decisiones documentadas (DD-01..07) + 6 supuestos inferidos (SU-01..06) con trade-offs y riesgos |
| [10_preguntas_abiertas.md](10_preguntas_abiertas.md) | 5 inconsistencias detectadas (IN-01..05), tabla de preguntas priorizadas, 8 gotchas técnicos (GE-01..08) |
| [11_pagos_mercadopago.md](11_pagos_mercadopago.md) | Flujo técnico completo de la integración MP, modelo de datos Pago, tarjetas de prueba, variables de entorno |

---

## Quick Start para Desarrolladores

| Objetivo | Leer primero |
|----------|-------------|
| Entender qué construye el sistema | [01_vision](01_vision_y_objetivos.md), [03_actores](03_actores_y_roles.md) |
| Entender las entidades y la BD | [04_modelo_de_datos](04_modelo_de_datos.md) |
| Entender las reglas que no se pueden romper | [05_reglas](05_reglas_de_negocio.md) |
| Entender cómo se construye el backend | [08_arquitectura](08_arquitectura_propuesta.md) |
| Entender el flujo de un pedido de punta a punta | [07_flujos](07_flujos_principales.md) |
| Entender qué features implementar en qué orden | [06_funcionalidades](06_funcionalidades.md) |
| Integrar MercadoPago | [11_pagos_mercadopago](11_pagos_mercadopago.md) |
| Antes de codificar algo — leer esto | [10_preguntas_abiertas](10_preguntas_abiertas.md) |

---

## Resumen Ejecutivo

Food Store es una plataforma de e-commerce de alimentos con autenticación JWT+RBAC (4 roles), catálogo jerárquico, carrito client-side en Zustand, pedidos atómicos con FSM de 6 estados y audit trail inmutable, y pagos PCI-compliant vía MercadoPago Checkout API con webhooks IPN para confirmación automática. El backend usa FastAPI + SQLModel + PostgreSQL con el patrón Router→Service→UoW→Repository→Model; el frontend usa React 18 + TypeScript + Vite + TanStack + Tailwind con Feature-Sliced Design.

---

## KB generada en knowledge-base/

| Archivo | Líneas aprox. | Temas cubiertos |
|---------|:---:|-----------------|
| 01_vision_y_objetivos.md | ~55 | Propósito, 5 actores, alcance v5.0, 7 ítems fuera de alcance |
| 02_descripcion_general.md | ~100 | Stack 17 tecnologías, arquitectura ASCII, 2 integraciones externas, 28 endpoints |
| 03_actores_y_roles.md | ~70 | 6 actores, matriz RBAC 15×7, 10 reglas RN-RB, 9 rutas públicas |
| 04_modelo_de_datos.md | ~130 | 3 dominios, ERD ASCII, 13 entidades detalladas, 4 tablas de seed |
| 05_reglas_de_negocio.md | ~130 | 50+ reglas en 8 dominios con trazabilidad a US |
| 06_funcionalidades.md | ~160 | 77 US organizadas en 19 épicas |
| 07_flujos_principales.md | ~150 | 7 flujos E2E con secuencia paso a paso |
| 08_arquitectura_propuesta.md | ~140 | 12 patrones, árbol de directorios, regla de dependencias, 20 vars entorno |
| 09_decisiones_y_supuestos.md | ~120 | 7 DD con alternativas y trade-offs, 6 SU con riesgos |
| 10_preguntas_abiertas.md | ~90 | 5 IN, 11 preguntas priorizadas, 8 GE (gotchas técnicos) |
| 11_pagos_mercadopago.md | ~100 | Flujo completo MP, modelo Pago, tarjetas sandbox, 5 reglas RN-PA |
