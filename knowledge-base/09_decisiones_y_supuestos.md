# Decisiones y Supuestos

## Decisiones documentadas

### DD-01 — SQLModel sobre SQLAlchemy puro
**Decisión**: Usar SQLModel como ORM y biblioteca de schemas Pydantic.
**Contexto**: FastAPI usa Pydantic para validación. SQLAlchemy es el ORM estándar en Python.
**Alternativas consideradas**: SQLAlchemy puro + Pydantic por separado; Tortoise ORM; Peewee.
**Justificación**: SQLModel integra ambas en un único modelo de clases, elimina duplicación de definiciones entre ORM y schemas. Creado por el autor de FastAPI — integración nativa con OpenAPI.
**Trade-offs aceptados**: SQLModel es menos maduro que SQLAlchemy puro; posibles edge cases en relaciones complejas; menor comunidad. Versión async aún en estabilización.

---

### DD-02 — Unit of Work sobre transacciones manuales en Services
**Decisión**: Toda transacción pasa por el patrón Unit of Work implementado como context manager.
**Contexto**: Crear un pedido implica 3-4 INSERT que deben ser atómicos. El manejo manual de `session.commit()` en Services es frágil y propenso a errores.
**Alternativas consideradas**: `session.commit()` directamente en Service; middleware de transacción por request.
**Justificación**: El UoW garantiza que nunca queden transacciones en estado inconsistente. Facilita testing (UoW puede ser mockeado). Centraliza commit/rollback en un solo lugar.
**Trade-offs aceptados**: Overhead conceptual; algunos developers no están familiarizados con el patrón.

---

### DD-03 — Carrito 100% client-side con Zustand
**Decisión**: El carrito no existe en el backend. Es exclusivamente Zustand + localStorage.
**Contexto**: El carrito es volátil y de uso frecuente. Persiste entre sesiones del mismo usuario pero no necesita sincronización entre dispositivos en v1.
**Alternativas consideradas**: Carrito en BD (tabla CartItem); carrito en Redis; carrito mixto (BD + localStorage).
**Justificación**: Simplicidad masiva — elimina endpoints CRUD de carrito, reduce carga en BD, mejora performance al ser local. Sin necesidad de sincronización entre dispositivos en v1.
**Trade-offs aceptados**: El carrito se pierde si el usuario cambia de dispositivo o borra localStorage. Sin historial de abandono de carrito en BD. Riesgo de inconsistencia de precios (mitigado por validación en checkout).

---

### DD-04 — Refresh token almacenado hasheado en BD
**Decisión**: El refresh token (UUID) se almacena con hash SHA-256 en la BD. El token real solo existe en el cliente.
**Contexto**: Si la BD es comprometida, los refresh tokens no deben ser útiles por sí solos.
**Alternativas consideradas**: Token en plaintext; token firmado (opaque vs. JWT); sin almacenamiento (stateless).
**Justificación**: Rotación + detección de replay attack requiere persistencia en BD. El hashing protege si la BD es expuesta.
**Trade-offs aceptados**: Costo computacional del hash en cada verificación (SHA-256 es rápido). Requiere BD para logout/invalidación — no es puramente stateless.

---

### DD-05 — Paginación con skip/limit y total_count
**Decisión**: Todos los endpoints de listado retornan `{ items: [...], total: N, page: P, size: S }`.
**Contexto**: El frontend necesita construir controles de paginación.
**Alternativas consideradas**: Cursor-based pagination; `Link` headers; solo items sin total.
**Justificación**: Offset pagination es simple de implementar y suficiente para los volúmenes esperados en un MVP. Retornar `total` permite al frontend calcular páginas.
**Trade-offs aceptados**: Offset pagination tiene degradación de performance con datasets grandes (> 1M registros). Aceptable para v1.

---

### DD-06 — Errores RFC 7807 (Problem Details)
**Decisión**: Todos los errores de la API siguen el estándar RFC 7807.
**Contexto**: La API retornaba errores inconsistentes. El frontend necesita parsear errores de forma uniforme.
**Justificación**: Estándar establecido. FastAPI no implementa RFC 7807 out-of-the-box → se implementa con exception handler global.
**Trade-offs aceptados**: Overhead de implementar el exception handler. El frontend necesita adaptarse al formato.

---

### DD-07 — MercadoPago Checkout API (no Checkout Pro)
**Decisión**: Usar MercadoPago Checkout API (card token → payment) en lugar de Checkout Pro (redirect).
**Contexto**: La especificación requiere flujo embebido con `CardPayment` component del SDK React de MP.
**Alternativas consideradas**: Checkout Pro (redirect a página de MP); Checkout Bricks; API directa.
**Justificación**: Checkout API permite UX completamente embebida en el sitio. PCI SAQ-A cumplido porque los datos de tarjeta se tokenizan en el browser via SDK oficial de MP.
**Trade-offs aceptados**: Mayor complejidad de implementación. Requiere configuración de webhook/IPN para recibir resultados de pago de forma asíncrona. Necesita URL pública para IPN (ngrok en desarrollo local).

---

## Supuestos inferidos

### SU-01 — Costo de envío fijo
**Supuesto**: El costo de envío es un valor fijo ($50.00 ARS) en v1, no variable por zona geográfica.
**Origen**: Inferido de la spec (cita "costo de envío" sin sistema de zonas).
**Riesgo si es falso**: El módulo de pedidos necesitaría un sistema de tarifas de envío.
**Cómo validar**: Consultar con el docente/PO si hay lógica de zonas en la rúbrica.

### SU-02 — Un solo tenant (single store)
**Supuesto**: El sistema gestiona una única tienda. No hay multi-tenant ni múltiples sucursales.
**Origen**: La spec describe un único catálogo y un único flujo de pedidos.
**Riesgo si es falso**: La arquitectura requeriría agregar `tenant_id` en casi todas las tablas.
**Cómo validar**: Obvio de la spec — fuera de alcance explicitado.

### SU-03 — PostgreSQL como única base de datos
**Supuesto**: No hay Redis, no hay cache compartido, no hay Elasticsearch. Solo PostgreSQL.
**Origen**: Stack tecnológico especificado en `Descripcion.txt`.
**Riesgo si es falso**: El rate limiting in-memory (slowapi) no es distribuido — si hay múltiples workers, los contadores no se comparten.
**Cómo validar**: Para desarrollo/demo con un único worker, no es problema. En producción real, se necesitaría Redis para slowapi.

### SU-04 — Imágenes de productos como URL externa
**Supuesto**: La imagen del producto se almacena como `imagen_url` (URL a un recurso externo o al filesystem local). No hay sistema de upload a S3 en v1.
**Origen**: La spec menciona `imagen_url` como campo de texto. No describe flujo de upload.
**Riesgo si es falso**: Necesitaría multer/fastapi-upload y configuración de storage.
**Cómo validar**: Asumir URL para v1 académico es correcto.

### SU-05 — Modo async en FastAPI + SQLModel
**Supuesto**: Se usa el driver síncrono de SQLAlchemy (`psycopg2`) con endpoints `async def` en FastAPI (via `run_in_executor`), no el driver async nativo (`asyncpg`).
**Origen**: La spec no especifica. SQLModel async está en estabilización.
**Riesgo si es falso**: Si se elige asyncpg, el setup es considerablemente más complejo.
**Cómo validar**: Decisión técnica a tomar al iniciar `us-000-setup`. Recomendación: `psycopg2` para simplicidad en versión académica.

### SU-06 — Un solo usuario admin en seed
**Supuesto**: El seed crea un único usuario administrador con credenciales configurables por `.env`.
**Origen**: US-000b specifica "1 Usuario administrador con rol ADMIN y credenciales configurables por variables de entorno".
**Cómo validar**: Confirmado por la spec.
