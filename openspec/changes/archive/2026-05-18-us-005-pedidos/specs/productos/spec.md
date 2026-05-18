## ADDED Requirements

### Requirement: Descuento Transaccional y Restauración de Stock por Pedidos
El sistema MUST descontar de forma transaccional el stock disponible de los ingredientes/productos asociados al crearse un pedido en estado `PENDIENTE`. Si el pedido es cancelado (avanza al estado `CANCELADO`), el sistema MUST reintegrar de forma atómica el stock que había sido descontado para restablecer las existencias de forma inmediata.

#### Scenario: Descuento exitoso al crear pedido
- **WHEN** un cliente crea un pedido conteniendo productos y sus ingredientes con stock suficiente
- **THEN** el sistema descuenta atómicamente el stock y permite la creación del pedido.

#### Scenario: Restauración de stock al cancelar pedido
- **WHEN** un administrador o gestor cancela un pedido en preparación
- **THEN** el sistema reintegra atómicamente la cantidad de existencias correspondiente en el inventario.
