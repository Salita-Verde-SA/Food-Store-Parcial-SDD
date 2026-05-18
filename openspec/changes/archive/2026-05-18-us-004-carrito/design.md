## Context

El e-commerce de Food Store actualmente cuenta con un catálogo interactivo público y un panel de administración funcional de productos, ingredientes y categorías. Sin embargo, carece de un flujo de compra para el cliente final. La épica `us-004-carrito` introduce el elemento central de interacción del cliente: el carrito de compras. Al ser una aplicación full-stack con arquitectura desacoplada, este módulo operará 100% en el lado del cliente (client-side) para brindar una experiencia de usuario rápida, reactiva y offline-first, antes de enviar los datos consolidados al backend para crear el pedido.

## Goals / Non-Goals

**Goals:**
- Implementar un store de Zustand (`cartStore`) robusto, modular y tipado con soporte de persistencia local en `localStorage`.
- Soportar la adición y edición interactiva de productos con exclusión personalizada de ingredientes (alérgenos) en base a la lista real de ingredientes que tiene asociada cada plato en el catálogo.
- Resolver la acumulación de items de forma inteligente: items con la misma personalización acumulan cantidad; items con distinta personalización se separan.
- Proveer una UI premium y fluida (Drawer colapsable) con transiciones suaves, controles +/- responsivos y confirmaciones de vaciado de carrito.
- Formatear y calcular de manera exacta subtotales y totales financieros en el cliente con precisión decimal (`.toFixed(2)`).

**Non-Goals:**
- Sincronizar el estado del carrito en una base de datos backend (el carrito no existirá en las tablas de PostgreSQL).
- Implementar el formulario de datos de envío ni el checkout definitivo (corresponde a la épica `us-005-pedidos`).
- Validar el stock real del restaurante en tiempo real en cada mutación del carrito (se validará atómicamente en el backend al momento de enviar/crear el pedido final).

## Decisions

### 1. Estado Global: Zustand con Middleware `persist`
- **Decisión**: Usar Zustand 4 en lugar de React Context API para administrar el estado del carrito.
- **Justificación**: 
  - **Rendimiento**: Zustand evita re-renders innecesarios en la grilla del catálogo cuando se modifica la cantidad de un item. Los componentes solo se re-renderizan si se suscriben a sub-estados específicos (selectores).
  - **Simplicidad**: El middleware `persist` serializa y sincroniza de forma nativa el store con `localStorage` sin necesidad de escribir efectos secundarios manuales (`useEffect`).
  - **Consumo Externo**: Zustand permite acceder al estado del carrito fuera del árbol de React (`useCartStore.getState()`), facilitando la posterior inyección de los items y sus exclusiones directamente en el request de envío de pedidos a las APIs de Axios sin ensuciar la UI.

### 2. Clave de Identificación Única: `cart_item_key`
- **Decisión**: Generar una clave de item compuesta basada en el ID de producto y sus exclusiones ordenadas.
  - *Fórmula*: ``const cart_item_key = `${producto_id}-${[...exclusiones].sort((a,b) => a-b).join(',')}`;``
- **Justificación**: Dado que el mismo producto puede agregarse con personalizaciones distintas (ej: Pizza Margherita clásica vs Pizza Margherita sin albahaca), el `producto_id` no es suficiente para identificar de forma única a un item en la lista del carrito. La clave compuesta soluciona esto de raíz, garantizando que el incremento de cantidad o la eliminación afecten exactamente al item correspondiente.

### 3. Snapshot de Datos en el Cliente
- **Decisión**: Almacenar snapshots de `nombre`, `precio` e `imagen_url` en el store del carrito.
- **Justificación**: Esto permite que el renderizado de la barra lateral (Drawer) sea instantáneo y offline-first sin necesidad de consultar endpoints del backend de forma repetitiva.
- **Alternativa Considerada**: Almacenar únicamente `producto_id` y `cantidad` en el store y hacer un fetch masivo del catálogo para renderizar el Drawer. *Descartada* porque incrementa la latencia y la cantidad de peticiones concurrentes innecesariamente en pantallas de compra de alta concurrencia.
- **Mitigación de Seguridad (Precios)**: El cliente podría manipular el precio en el `localStorage` mediante la consola de desarrollo del navegador. Para mitigar esto, **el backend ignorará por completo los precios enviados por el frontend** al crear el pedido final. El backend realizará un `SELECT` a la base de datos para obtener los precios reales unitarios en el momento de la confirmación atómica transaccional.

### 4. Flujo UX: CartDrawer interactivo
- **Decisión**: Implementar el resumen y control del carrito en un `CartDrawer` lateral flotante en lugar de una página web separada.
- **Justificación**: Mantener al cliente en el catálogo de productos mientras gestiona su carrito reduce drásticamente la fricción y fomenta la adición de múltiples ítems adicionales de forma fluida.

## Risks / Trade-offs

- **[Risk] Desincronización de catálogos (Precios/Disponibilidad cambiantes)** → El administrador puede dar de baja un producto o cambiar su precio mientras el cliente lo tiene en el carrito desde hace horas.
  - *Mitigación*: Durante la renderización del catálogo, la UI filtrará o deshabilitará el checkout si detecta productos inválidos en el carrito, y el backend arrojará un error transaccional de validación en la creación del pedido si el producto ya no está activo o disponible.
- **[Risk] Exclusión de ingredientes inválidos** → Un cliente podría excluir ingredientes que no corresponden a la receta original del plato por manipulación directa del store.
  - *Mitigación*: El modal de selección de exclusiones solo listará los ingredientes asignados a la receta del producto cargado desde el catálogo.
