# Import all models here for Alembic detection
from app.modules.auth.model import Usuario, Rol, UsuarioRol
from app.modules.pedidos.model import EstadoPedido
from app.modules.pagos.model import FormaPago
from app.modules.categorias.model import Categoria
from sqlmodel import SQLModel

target_metadata = SQLModel.metadata
