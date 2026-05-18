## ADDED Requirements

### Requirement: Persistencia del Carrito (cartStore)
El sistema DEBERÁ implementar un store global de Zustand que persista de forma segura en `localStorage` (bajo la clave `foodstore-cart`). Dicho store DEBERÁ garantizar que la lista de ítems, cantidades y exclusiones sobrevivan al refresco de la página, cierres accidentales de la pestaña/navegador, y flujos de inicio/cierre de sesión del usuario.

#### Scenario: Sostenibilidad del estado ante refresco
- **WHEN** el cliente tiene productos agregados en el carrito y realiza un refresco (refresh) de la aplicación
- **THEN** la interfaz gráfica del Drawer de compras continúa mostrando exactamente el mismo listado de ítems, cantidades y exclusiones que se tenían previo a la recarga.

### Requirement: Agregado y Acumulación Inteligente
El sistema DEBERÁ permitir al cliente agregar productos al carrito especificando cantidad. Si el producto a agregar ya existe en el carrito con exactamente la **misma lista de exclusiones de ingredientes**, el sistema DEBERÁ incrementar su cantidad. Si el producto a agregar posee **diferente lista de exclusiones**, el sistema DEBERÁ tratarlo como un ítem separado e independiente dentro del carrito de compras.

#### Scenario: Agregado de ítems idénticos
- **WHEN** el cliente agrega "Pizza Margherita" (sin exclusiones) y luego agrega otra unidad de "Pizza Margherita" (sin exclusiones)
- **THEN** el sistema acumula ambas unidades en una sola fila del carrito mostrando cantidad igual a 2.

#### Scenario: Agregado de ítems con personalización diferente
- **WHEN** el cliente agrega "Pizza Margherita" (sin exclusiones) y luego agrega otra unidad de "Pizza Margherita" (excluyendo el ingrediente 2 - cebolla)
- **THEN** el sistema almacena y visualiza dos ítems independientes y diferenciados en la lista del carrito de compras.

### Requirement: Exclusión Personalizada de Ingredientes (Alérgenos)
El sistema DEBERÁ proveer un modal interactivo de personalización que liste los ingredientes del producto cargados desde el catálogo. El sistema DEBERÁ permitir al cliente seleccionar qué ingredientes excluir, y DEBERÁ validar que únicamente se excluyan ingredientes asociados a la receta oficial de dicho producto. La lista de exclusiones se almacenará estrictamente como un array de IDs de ingredientes (`number[]`).

#### Scenario: Selección de exclusión permitida
- **WHEN** el cliente abre el modal para agregar "Pizza Margherita" que contiene "Mozzarella" (ID: 1) y "Albahaca" (ID: 2), y desmarca el toggle de "Albahaca"
- **THEN** el ítem se añade al carrito con la propiedad `exclusiones` igual a `[2]`.

### Requirement: Modificación de Cantidades e Integridad de Items
El sistema DEBERÁ permitir al cliente modificar la cantidad de cualquier ítem en el carrito desde los controles interactivos (+/-). Si el cliente decrementa la cantidad de un ítem y esta alcanza el valor de cero (0) o menor, el sistema DEBERÁ remover por completo el ítem del carrito y del almacenamiento local de forma inmediata.

#### Scenario: Decremento de cantidad a cero
- **WHEN** el cliente presiona el botón "-" sobre un ítem con cantidad igual a 1
- **THEN** el sistema elimina de forma definitiva el ítem de la lista del carrito de compras y de `localStorage`.

### Requirement: Vaciar Carrito con Confirmación Modal
El sistema DEBERÁ proveer una acción para vaciar completamente el carrito. Para evitar pérdidas accidentales, el sistema DEBERÁ desplegar un diálogo modal de confirmación y ejecutar el vaciado completo de la lista y el restablecimiento del total a $0.00 únicamente cuando el cliente confirme la operación.

#### Scenario: Confirmación exitosa de vaciado
- **WHEN** el cliente presiona "Vaciar Carrito" y luego presiona "Confirmar" en el modal de advertencia
- **THEN** el sistema elimina todas las entradas en el store de Zustand y limpia la clave del `localStorage`.

### Requirement: Cálculo Reactivo y Formato Financiero
El sistema DEBERÁ calcular automáticamente y de manera reactiva el subtotal de cada ítem de forma aislada (`precio_unitario * cantidad`) y el total acumulativo general de la compra. Todos los cálculos financieros visualizados en la interfaz de usuario DEBERÁN formatearse con exactamente 2 decimales para asegurar la coherencia estética comercial.

#### Scenario: Cálculo de subtotales y total general
- **WHEN** el cliente agrega al carrito 2 unidades de "Hamburguesa Clásica" (precio $1500.00) y 1 unidad de "Gaseosa Cola" (precio $500.00)
- **THEN** la interfaz muestra el subtotal de las hamburguesas como "$3000.00", el de la gaseosa como "$500.00", y el total acumulado como "$3500.00".
