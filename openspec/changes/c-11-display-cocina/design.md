## Context

El sistema de pedidos de Food Store cuenta con un flujo de estados gobernado por una máquina de estados FSM transaccional. Sin embargo, no existe un canal en tiempo real que avise de nuevos pedidos, forzando a una consulta pasiva. Tampoco existe un rol operativo para cocina (`COCINA`) que pueda avanzar los pedidos en su etapa de preparación, ni se almacenan de manera persistente en la base de datos las observaciones/personalizaciones del cliente (`notas`), las cuales se descartan al ser parseadas únicamente en schemas.

Este documento de diseño establece las especificaciones técnicas para:
1. Agregar el campo `notas` al modelo de datos de pedidos y generar su migración.
2. Añadir el rol `COCINA` y expandir los permisos de transición en la FSM del backend.
3. Crear un canal reactivo de notificaciones en tiempo real basado en Server-Sent Events (SSE).
4. Implementar la interfaz de usuario del Display de Cocina (KDS) en el frontend siguiendo la arquitectura Feature-Sliced Design (FSD).

## Goals / Non-Goals

**Goals:**
- **Persistencia de notas**: Mapear y migrar la base de datos para registrar `Pedido.notas` y retornar este campo en los listados y detalles del pedido.
- **Transiciones de Cocina en FSM**: Habilitar a `COCINA` para avanzar transiciones del ciclo de vida de producción (`CONFIRMADO → EN_PREP` y `EN_PREP → EN_CAMINO`), auditando con su `operador_id` en la tabla `HistorialEstadoPedido`.
- **Canal reactivo SSE**: Proveer un stream de eventos de servidor en tiempo real y pub/sub seguro en memoria.
- **KDS Frontend Reactivo**: Crear el tablero visual en `/cocina` con columnas, sonido de notificación por Web Audio API, actualización automática de timers semáforos, y polling de respaldo ante fallas de conexión.
- **Control de disponibilidad rápida**: Permitir a cocina marcar un producto como temporalmente no disponible.

**Non-Goals:**
- **Canal bidireccional por WebSockets**: Descartado por simplicidad; las acciones de actualización del cocinero se enviarán por endpoints REST HTTP estándar (`PATCH`).
- **Nuevos estados intermedios**: No se agregarán nuevos estados a la FSM para evitar modificar la lógica de stock, precios y pagos consolidada.
- **Operaciones de cancelación o logística**: El rol `COCINA` no puede cancelar pedidos ni marcarlos como entregados en destino.

## Decisions

### 1. Canal en Tiempo Real: Server-Sent Events (SSE) sobre WebSockets (WS)
- **Decisión**: Usar SSE para empujar eventos desde el servidor hacia el KDS del cocinero.
- **Alternativa considerada**: WebSockets (WS).
- **Razón**: El flujo es estrictamente unidireccional (Server -> Client). SSE viaja sobre HTTP estándar, lo que facilita enormemente la inyección de JWT por headers de autorización, maneja reconexión automática nativa en navegadores (EventSource), y es sumamente fácil de implementar en FastAPI (`EventSourceResponse`).

### 2. Pub/Sub y Concurrencia en Memoria (In-Process)
- **Decisión**: Implementar un Pub/Sub básico en memoria dentro de un `CocinaService` singleton utilizando `asyncio.Lock()` y un conjunto (`set`) de colas `asyncio.Queue` activas.
- **Alternativa considerada**: Integrar Redis Pub/Sub.
- **Razón**: La aplicación corre actualmente en una única instancia de backend. Introducir Redis sumaría una dependencia de infraestructura innecesaria para el alcance actual del proyecto. Si en el futuro se escala a múltiples procesos en producción, se podrá migrar fácilmente el backend de `CocinaService` a Redis sin tocar la interfaz SSE del cliente.

### 3. Migración de Base de Datos para Notas del Cliente
- **Decisión**: Modificar `Pedido` en `backend/app/modules/pedidos/model.py` agregando la columna `notas: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))` y generar una migración de Alembic.
- **Razón**: Es indispensable almacenar las notas del cliente para que cocina sepa si hay personalizaciones de comida (ej: "sin cebolla"). Al definir la columna como `nullable=True`, las órdenes históricas en la base de datos no sufrirán conflictos de integridad al correr la migración.

### 4. Control de Disponibilidad Específico para Cocina
- **Decisión**: Crear un endpoint específico `PATCH /api/v1/productos/{id}/disponibilidad` protegido para los roles `['ADMIN', 'STOCK', 'COCINA']` que reciba únicamente `{ "disponible": bool }` en el cuerpo de la petición.
- **Razón**: Permite a cocina pausar temporalmente un plato que se quedó sin insumos durante el despacho de manera rápida, sin tener permisos para alterar el precio, la descripción, ni el stock.

### 5. Reproducción de Audio de Alerta y Web Audio API
- **Decisión**: Implementar un botón explícito de "Conectarse al KDS" o "Activar KDS" en `/cocina` para inicializar el stream SSE y desbloquear el `AudioContext` de la API de Web Audio tras una interacción del usuario.
- **Razón**: Los navegadores modernos bloquean la reproducción automática de sonido (`autoplay`) por motivos de accesibilidad y experiencia de usuario a menos que el cliente interactúe primero con el documento.

## Risks / Trade-offs

- **[Riesgo: Caída de la conexión SSE]**
  - **Mitigación**: El frontend del KDS utilizará un wrapper de `EventSource` que detecta errores de conexión (`onerror`). Al desconectarse, iniciará automáticamente un polling periódico a `GET /api/v1/cocina/pedidos` cada 10 segundos para mantener la pantalla actualizada como respaldo, intentando reconectarse en segundo plano con backoff exponencial.

- **[Riesgo: Conflictos concurrentes al actualizar estados de pedidos]**
  - **Mitigación**: `PedidoService.avanzar_estado` ya implementa `SELECT FOR UPDATE` sobre la base de datos dentro del Unit of Work. Si dos cocineros intentan avanzar el mismo pedido en paralelo, la transacción del segundo cocinero levantará una excepción HTTP 400 informando que la transición es inválida (ya que el pedido ya no está en el estado de origen requerido), evitando inconsistencias y duplicaciones.
