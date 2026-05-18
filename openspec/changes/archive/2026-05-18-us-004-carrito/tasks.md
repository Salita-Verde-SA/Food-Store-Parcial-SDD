## 1. Fundamentos del Store (Zustand)

- [x] 1.1 Definir los tipos e interfaces del Carrito (`CartItem`, `CartStore`) en `frontend/src/shared/types/index.ts`
- [x] 1.2 Crear el store global `cartStore` con persistencia en `localStorage` usando el middleware `persist` en `frontend/src/shared/stores/cartStore.ts`
- [x] 1.3 Implementar la acción `addItem` resolviendo el incremento de cantidad para ítems con idénticas exclusiones y separación para ítems con distintas exclusiones
- [x] 1.4 Implementar las acciones mutadoras secundarias: `updateQuantity`, `removeItem` y `clearCart` en el store

## 2. Componentes de UI (Integración y Personalización)

- [x] 2.1 Crear el modal interactivo de personalización de ingredientes con toggles interactivos que filtre únicamente los ingredientes del plato seleccionado
- [x] 2.2 Conectar el botón "Agregar al Carrito" del catálogo para disparar el modal de personalización o agregarlo directamente si el plato no tiene ingredientes
- [x] 2.3 Diseñar e implementar el `CartDrawer` lateral flotante con animaciones y micro-interacciones utilizando Tailwind CSS y Lucide Icons
- [x] 2.4 Integrar en `CartDrawer` el listado de ítems seleccionados, visualización clara de sus exclusiones de alérgenos, y controles interactivos +/- de cantidad
- [x] 2.5 Implementar el indicador numérico (badge) del carrito sobre el Header superior de navegación reactivo a las existencias del store
- [x] 2.6 Implementar el modal de confirmación visual para la acción de vaciar el carrito previniendo clics accidentales

## 3. Pruebas y Cierre Técnico

- [x] 3.1 Validar la persistencia recargando la página con productos en el carrito y cerrando/abriendo sesión
- [x] 3.2 Verificar que el total y los subtotales se recalculen reactivamente y se visualicen formateados a exactamente dos decimales
- [x] 3.3 Probar los límites de stock inicial y decremento interactivo (cota inferior en 1 unidad, reducciones a 0 eliminan el ítem)
