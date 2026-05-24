## 1. Base de Datos y Semillas (Foundations)

- [x] 1.1 Modificar el modelo SQLModel `Pedido` en `backend/app/modules/pedidos/model.py` para incluir la columna `notas` de tipo `Text` (nullable=True).
- [x] 1.2 Generar una nueva migración de Alembic para crear la columna `notas` en la tabla `pedido` (`alembic revision --autogenerate -m "add_notas_to_pedido"`).
- [x] 1.3 Modificar `app/db/seed.py` para asegurar que el rol `COCINA` and el usuario semilla `cocina@foodstore.com` con dicho rol se agreguen correctamente a las tablas `rol`, `usuario` y `usuariorol`.
- [x] 1.4 Ejecutar las migraciones y sembrar los datos en la base de datos de desarrollo (`poetry run alembic upgrade head` y `python -m app.db.seed`).

## 2. Backend: Canal SSE y Pub/Sub en Memoria

- [x] 2.1 Crear un módulo `cocina` en `backend/app/modules/cocina` con su estructura base (`router.py`, `service.py`).
- [x] 2.2 Implementar en `CocinaService` el gestor pub/sub en memoria usando `asyncio.Lock()` para garantizar seguridad en accesos concurrentes a las colas de eventos de clientes activos.
- [x] 2.3 Crear el endpoint de Server-Sent Events `/api/v1/cocina/events` en `cocina/router.py` que configure `EventSourceResponse` y asocie el stream del cliente autenticado con la cola del Pub/Sub.
- [x] 2.4 Modificar `PedidoService.avanzar_estado` en `backend/app/modules/pedidos/service.py` para hacer broadcast de los eventos de cambio de estado (`PEDIDO_CONFIRMADO`, `PEDIDO_EN_PREPARACION`, `PEDIDO_EN_CAMINO`, `PEDIDO_CANCELADO`) a través de `CocinaService` inmediatamente después del commit transaccional.

## 3. Backend: API y Lógica de Negocio (REST)

- [x] 3.1 Crear el endpoint de consulta REST KDS `/api/v1/cocina/pedidos` para recuperar todos los pedidos activos en cocina (estados `CONFIRMADO` y `EN_PREP`) ordenados de más antiguo a más nuevo.
- [x] 3.2 Modificar los esquemas de respuesta del pedido (`PedidoDetail`, `PedidoListItem`, `PedidoDetailResponse`) en `backend/app/modules/pedidos/schemas.py` para exponer el campo `notas` y la timeline con el historial de estados completo.
- [x] 3.3 Modificar `PedidoService.avanzar_estado` para autorizar al rol `COCINA` en transiciones de producción (`CONFIRMADO → EN_PREP` y `EN_PREP → EN_CAMINO`), y lanzar HTTP 403 ante cualquier otra transición.
- [x] 3.4 Modificar el router de pedidos `/api/v1/pedidos/{id}/estado` en `backend/app/modules/pedidos/router.py` para incluir el rol `COCINA` en el decorador `@require_role`.
- [x] 3.5 Crear el endpoint específico `PATCH /api/v1/productos/{id}/disponibilidad` en `backend/app/modules/productos/router.py` para permitir que `COCINA` (además de `ADMIN` y `STOCK`) modifique temporalmente la disponibilidad del producto.

## 4. Frontend: Ruteo, Accesos y Menú

- [x] 4.1 Modificar `frontend/src/app/router.tsx` para agregar la ruta `/cocina` protegida por `ProtectedRoute` permitiendo el acceso únicamente a los roles `['ADMIN', 'PEDIDOS', 'COCINA']`.
- [x] 4.2 Crear el layout y archivo de página base `frontend/src/pages/cocina/CocinaPage.tsx`.
- [x] 4.3 Modificar `frontend/src/shared/ui/ClientHeader.tsx` para incluir una opción de navegación rápida "Display Cocina" en el menú de usuario (`isUserMenuOpen`) si el rol del usuario autenticado incluye `COCINA`, `PEDIDOS` o `ADMIN`.

## 5. Frontend: Pantalla de Cocina (KDS) Reactiva

- [x] 5.1 Implementar el layout de KDS con dos columnas principales ("Por Preparar" / "En Preparación") y tarjetas informativas detallando ítems, cantidades, personalizaciones y notas del cliente.
- [x] 5.2 Implementar en el cliente React el escuchador SSE `EventSource` conectándose a `/api/v1/cocina/events`, manejando la inserción y movimiento visual reactivo de tarjetas en pantalla.
- [x] 5.3 Implementar la resiliencia en el frontend: ante un error o desconexión en el listener SSE, iniciar un polling de respaldo consultando `GET /api/v1/cocina/pedidos` cada 10 segundos, intentando reconectarse al stream SSE de fondo.
- [x] 5.4 Diseñar el semáforo visual de urgencia (timers en cada tarjeta del KDS que calculan los minutos transcurridos y se refrescan cada 15 segundos mediante un `setInterval`, cambiando el color de fondo/borde según RN-CO07).
- [x] 5.5 Integrar la alerta sonora de nuevos pedidos usando `Web Audio API` (con un control interactivo que sirva para habilitar el `AudioContext` ante el primer clic del usuario y permita silenciar/desactivar el sonido en pantalla).
- [x] 5.6 Implementar en el KDS una pestaña de catálogo rápido que muestre los productos del local y permita al cocinero togglear su disponibilidad llamando a `PATCH /productos/{id}/disponibilidad`.

## 6. Pruebas Automatizadas (Tests)

- [x] 6.1 Crear unit tests en `backend/tests/test_pedidos.py` que validen la creación de pedidos guardando y recuperando el campo `notas`.
- [x] 6.2 Crear tests integrados en `backend/tests/test_pedidos.py` simulando transiciones exitosas para un usuario con rol exclusivo `COCINA` (`CONFIRMADO → EN_PREP` y `EN_PREP → EN_CAMINO`).
- [x] 6.3 Crear tests que verifiquen el rechazo HTTP 403 cuando un usuario con rol `COCINA` intente realizar transiciones no permitidas (ej: `EN_CAMINO → ENTREGADO` o cancelaciones).
- [x] 6.4 Escribir un test de integración que simule la conexión SSE a `/api/v1/cocina/events` y verifique la correcta recepción de un evento de cambio de estado.
