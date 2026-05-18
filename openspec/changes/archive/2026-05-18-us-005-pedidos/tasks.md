## 1. Base de Datos y Modelos SQLModel

- [x] 1.1 Crear los modelos de DireccionEntrega, Pedido, DetallePedido, HistorialEstadoPedido y Pago en el modulo correspondiente
- [x] 1.2 Generar y aplicar la migración de Alembic para crear las 5 nuevas tablas de forma atómica en base de datos
- [x] 1.3 Registrar las 5 nuevas tablas en app.models y extender los repositorios genéricos en el Unit of Work (uow.py)

## 2. Módulo de Direcciones de Entrega (Backend)

- [x] 2.1 Implementar esquemas Pydantic y repositorios genéricos para la entidad DireccionEntrega
- [x] 2.2 Desarrollar el servicio DireccionService con la lógica de rotación automática y atómica de dirección principal (RN-DI01)
- [x] 2.3 Crear los endpoints HTTP de Direcciones con control estricto de ownership por JWT (US-025, US-026, US-027)

## 3. Lógica Transaccional de Pedidos (Backend)

- [x] 3.1 Implementar esquemas Pydantic para creación y lectura de Pedidos y Detalles
- [x] 3.2 Crear PedidoService.crear_pedido utilizando Unit of Work (UoW) y aplicando inmutabilidad con Snapshots de precio y dirección (RN-PE02, RN-PE03)
- [x] 3.3 Implementar bloqueo SELECT FOR UPDATE sobre filas de Producto/Ingrediente para validar y reservar stock concurrente (RN-PE04)

## 4. Máquina de Estados (FSM) y Auditoría (Backend)

- [x] 4.1 Implementar la máquina de estados FSM de 6 niveles en PedidoService, rechazando transiciones inválidas y estados terminales (RN-FS01, RN-FS06)
- [x] 4.2 Configurar el motivo de cancelación obligatorio (RN-05) y el reintegro de stock atómico al inventario en cancelaciones (RN-FS05)
- [x] 4.3 Desarrollar el historial de estados con comportamiento de solo adición (append-only) y crear routers de consultas para clientes y gestores

## 5. Webhook e Integración de Pagos (Backend)

- [x] 5.1 Crear el endpoint público POST /api/v1/pagos/webhook para recibir notificaciones IPN de MercadoPago
- [x] 5.2 Implementar control de idempotencia con idempotency_key sobre la tabla de Pagos para evitar eventos duplicados (RN-PA02)
- [x] 5.3 Enlazar webhook aprobado con la transición PENDIENTE -> CONFIRMADO y decremento atómico del stock (RN-FS03, RN-PA05)

## 6. Interfaces del Cliente (Frontend FSD)

- [x] 6.1 Desarrollar la página "Mis Direcciones" con CRUD funcional y selector de dirección principal activa
- [x] 6.2 Diseñar la página "Checkout" para resumen final de ítems, dirección y método de pago con pasarela MercadoPago SDK
- [x] 6.3 Crear la página "Mis Pedidos" con listado reactivo y línea de tiempo (timeline) de trazabilidad en tiempo real

## 7. Panel Operativo de Pedidos (Frontend FSD)

- [x] 7.1 Crear la página de panel de control "Gestión de Pedidos" protegida para roles ADMIN y PEDIDOS
- [x] 7.2 Implementar controles de avance dinámicos para los estados de preparación en cocina y logística (EN_PREP, EN_CAMINO)
- [x] 7.3 Diseñar el diálogo de cancelación que solicite el motivo obligatorio y actualice reactivamente los stocks de catálogo

## 8. Verificaciones y Pruebas Unitarias/Manuales

- [x] 8.1 Escribir y correr tests de integración de backend para validar flujos concurrentes, UoW, FSM y control de stock
- [x] 8.2 Realizar pruebas manuales de punta a punta simulando un flujo completo de compra, pago MercadoPago y cancelación
