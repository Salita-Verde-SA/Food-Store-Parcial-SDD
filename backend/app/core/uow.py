from typing import Type
from sqlmodel import Session
from app.core.database import engine
from app.core.repository import BaseRepository
from app.modules.auth.model import Usuario, Rol, UsuarioRol
from app.modules.usuarios.model import DireccionEntrega
from app.modules.pedidos.model import EstadoPedido, Pedido, DetallePedido, HistorialEstadoPedido
from app.modules.pagos.model import FormaPago, Pago
from app.modules.categorias.repository import CategoriaRepository
from app.modules.productos.repository import ProductoRepository
from app.modules.ingredientes.repository import IngredienteRepository


class UnitOfWork:
    def __init__(self):
        self.session_factory = Session(engine, expire_on_commit=False)

    async def __aenter__(self):
        self.session = self.session_factory
        # Inicialización de repositorios
        self.usuarios = BaseRepository(Usuario, self.session)
        self.roles = BaseRepository(Rol, self.session)
        self.estados = BaseRepository(EstadoPedido, self.session)
        self.pagos = BaseRepository(FormaPago, self.session)
        self.categorias = CategoriaRepository(self.session)
        self.productos = ProductoRepository(self.session)
        self.ingredientes = IngredienteRepository(self.session)
        self.direcciones = BaseRepository(DireccionEntrega, self.session)
        self.pedidos = BaseRepository(Pedido, self.session)
        self.detalles_pedido = BaseRepository(DetallePedido, self.session)
        self.historial_pedidos = BaseRepository(HistorialEstadoPedido, self.session)
        self.pagos_transaccion = BaseRepository(Pago, self.session)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.session.rollback()
        else:
            self.session.commit()
        self.session.close()

    def commit(self):
        self.session.commit()

    def rollback(self):
        self.session.rollback()
