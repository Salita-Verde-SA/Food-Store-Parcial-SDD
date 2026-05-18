from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Numeric, Text, Integer, CheckConstraint

from app.modules.auth.model import Usuario
from app.modules.pagos.model import FormaPago
from app.modules.usuarios.model import DireccionEntrega
from app.modules.productos.model import Producto


class EstadoPedido(SQLModel, table=True):
    codigo: str = Field(primary_key=True, max_length=20)
    descripcion: Optional[str] = None
    orden: int = Field(default=0)
    es_terminal: bool = Field(default=False)


class Pedido(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuario.id", nullable=False)
    estado_codigo: str = Field(foreign_key="estadopedido.codigo", nullable=False, max_length=20)
    total: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    costo_envio: Decimal = Field(sa_column=Column(Numeric(10, 2), default=Decimal("50.00"), nullable=False))
    forma_pago_codigo: str = Field(foreign_key="formapago.codigo", nullable=False, max_length=20)
    direccion_id: Optional[int] = Field(foreign_key="direccion_entrega.id", nullable=True)
    direccion_snapshot: str = Field(sa_column=Column(Text, nullable=False))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relaciones
    usuario: Usuario = Relationship()
    estado: EstadoPedido = Relationship()
    forma_pago: FormaPago = Relationship()
    direccion: Optional[DireccionEntrega] = Relationship()

    detalles: List["DetallePedido"] = Relationship(
        back_populates="pedido",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"}
    )
    historial: List["HistorialEstadoPedido"] = Relationship(
        back_populates="pedido",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"}
    )
    pago: Optional["Pago"] = Relationship(
        back_populates="pedido",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "uselist": False, "lazy": "selectin"}
    )

    @property
    def subtotal(self) -> Decimal:
        total = self.total or Decimal("0.00")
        costo = self.costo_envio or Decimal("0.00")
        return total - costo

    @property
    def descuento(self) -> Decimal:
        return Decimal("0.00")

    @property
    def items(self) -> List["DetallePedido"]:
        return self.detalles


class DetallePedido(SQLModel, table=True):
    __tablename__ = "detalle_pedido"

    id: Optional[int] = Field(default=None, primary_key=True)
    pedido_id: int = Field(foreign_key="pedido.id", nullable=False)
    producto_id: int = Field(foreign_key="producto.id", nullable=False)
    cantidad: int = Field(sa_column=Column(Integer, CheckConstraint("cantidad > 0"), nullable=False))
    nombre_snapshot: str = Field(max_length=200, nullable=False)
    precio_snapshot: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    personalizacion: Optional[str] = Field(default=None, max_length=255)  # Comma-separated ingredient IDs (excluded)

    # Relaciones
    pedido: Pedido = Relationship(back_populates="detalles")
    producto: Producto = Relationship()


class HistorialEstadoPedido(SQLModel, table=True):
    __tablename__ = "historial_estado_pedido"

    id: Optional[int] = Field(default=None, primary_key=True)
    pedido_id: int = Field(foreign_key="pedido.id", nullable=False)
    estado_desde: Optional[str] = Field(foreign_key="estadopedido.codigo", nullable=True, max_length=20)
    estado_hasta: str = Field(foreign_key="estadopedido.codigo", nullable=False, max_length=20)
    usuario_id: int = Field(foreign_key="usuario.id", nullable=False)  # Quién ejecutó el cambio (o ID Sistema)
    motivo: Optional[str] = Field(default=None)  # Obligatorio para CANCELADO
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relaciones
    pedido: Pedido = Relationship(back_populates="historial")
    usuario: Usuario = Relationship()
