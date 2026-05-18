# Import all models here for Alembic detection
from app.modules.auth.model import Usuario, Rol, UsuarioRol
from app.modules.usuarios.model import DireccionEntrega
from app.modules.pedidos.model import EstadoPedido, Pedido, DetallePedido, HistorialEstadoPedido
from app.modules.pagos.model import FormaPago, Pago
from app.modules.categorias.model import Categoria
from app.modules.ingredientes.model import Ingrediente
from app.modules.productos.model import Producto, ProductoCategoria, ProductoIngrediente
from sqlmodel import SQLModel

target_metadata = SQLModel.metadata

