## Why

Como cliente del e-commerce Food Store, es fundamental contar con un mecanismo de almacenamiento temporal, interactivo y persistente que permita seleccionar y personalizar productos de forma fluida antes de realizar el pedido. Sin un carrito de compras, el cliente se vería forzado a comprar de a un plato por vez o a recordar su selección de forma manual. Implementar un carrito client-side persistente con Zustand optimiza radicalmente la conversión de ventas, facilitando la exclusión de alérgenos por plato y garantizando que la selección sobreviva a recargas de página, cierres accidentales de pestaña o flujos de inicio/cierre de sesión.

## What Changes

- **Introducción de `cartStore` con Zustand**: Creación de un almacén global tipado para la gestión del carrito, configurado con el middleware `persist` de Zustand para persistencia automática en `localStorage` del navegador.
- **Estructura atómica de Items del Carrito (`CartItem`)**: Cada elemento del carrito contendrá:
  - `producto_id`: ID numérico del producto.
  - `nombre`: Nombre del producto (snapshot para renderizado rápido).
  - `precio`: Precio unitario decimal (snapshot).
  - `cantidad`: Entero positivo (mínimo 1).
  - `imagen_url`: URL de la imagen del plato (opcional).
  - `exclusiones`: Array de IDs de ingredientes a excluir (`number[]`).
- **Lógica de Acumulación por Personalización**:
  - Si se agrega un producto cuya lista de `exclusiones` es **exactamente idéntica** a la de un item ya existente en el carrito, se incrementará reactivamente su `cantidad`.
  - Si se agrega un producto con **distintas exclusiones** (ej. una Pizza Margherita normal y otra Pizza Margherita "sin cebolla"), se tratarán como **dos items separados e independientes** dentro del carrito.
- **Acciones del Store**:
  - `addItem(producto, cantidad, exclusiones)`: Agrega un item al carrito o incrementa su cantidad. Valida que las exclusiones pertenezcan a los ingredientes reales del producto.
  - `updateQuantity(producto_id, exclusiones, nueva_cantidad)`: Modifica cantidades. Si la cantidad baja a 0, elimina automáticamente el item.
  - `removeItem(producto_id, exclusiones)`: Quita un item específico de forma directa.
  - `clearCart()`: Vacía todo el carrito de compras.
- **Cálculos y Selectores Reactivos**:
  - Subtotal por item (`precio * cantidad`).
  - Cantidad total de items acumulados.
  - Total general de la compra, formateado de forma segura a exactamente 2 decimales.
- **Interfaz del Usuario (UI/UX Premium)**:
  - **CartDrawer (Sidebar interactivo)**: Componente colapsable flotante accesible desde cualquier pantalla del catálogo. Ofrece micro-animaciones fluidas de hover, control interactivo de cantidades (+/-), detalle explícito de ingredientes excluidos en cada item, y botón destacado para proceder al checkout.
  - **Modal de Personalización**: Al hacer click en "Agregar al Carrito" en productos con ingredientes, se abrirá un modal estéticamente cuidado que listará sus ingredientes con toggles/checkboxes interactivos para que el usuario elija cuáles excluir (especialmente alérgenos).
  - **Estado Vacío**: Ilustración y mensaje amigable con enlace de retorno al catálogo cuando el carrito no tenga items.
  - **Diálogo de Confirmación**: Vaciar el carrito requiere confirmación explícita mediante un modal de advertencia para prevenir borrados accidentales.

## Capabilities

### New Capabilities
- `carrito-compras`: Carrito de compras 100% client-side con Zustand, soporte de exclusión de ingredientes (personalización de recetas y alérgenos), persistencia robusta en localStorage, y cálculos financieros reactivos listos para consumirse al crear pedidos.

### Modified Capabilities
*No aplica. Es una funcionalidad de frontend puramente nueva que no modifica comportamientos ni requisitos de especificaciones backend existentes.*

## Impact

- **Frontend (React & Zustand)**:
  - **Types**: Definición de interfaces `CartItem` y `CartStore` en `frontend/src/shared/types/index.ts`.
  - **Store**: Implementación del Zustand store en `frontend/src/shared/stores/cartStore.ts` con persistencia habilitada.
  - **Features / Componentes**:
    - Creación de `CartDrawer` en `frontend/src/features/carrito/CartDrawer.tsx` con soporte de animación de entrada/salida.
    - Creación del selector de exclusiones de ingredientes en el modal de catálogo de `frontend/src/features/productos/`.
    - Integración de los disparadores del carrito en la barra de navegación superior (Header).
- **Backend (FastAPI)**:
  - Ninguno. Este incremento es exclusivamente client-side. No obstante, la estructura de exclusiones de ingredientes (`exclusiones: number[]`) está perfectamente coordinada con los esquemas de la base de datos para que la posterior épica `us-005-pedidos` pueda persistirlos en base de datos sin fricción técnica.
