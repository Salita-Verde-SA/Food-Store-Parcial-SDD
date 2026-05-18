from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Numeric, Integer, CheckConstraint

from app.modules.categorias.model import Categoria
from app.modules.ingredientes.model import Ingrediente, ProductoIngrediente


class ProductoCategoria(SQLModel, table=True):
    __tablename__ = "producto_categoria"
    producto_id: int = Field(foreign_key="producto.id", primary_key=True)
    categoria_id: int = Field(foreign_key="categoria.id", primary_key=True)


class Producto(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, nullable=False)
    descripcion: Optional[str] = Field(default=None)
    precio: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    stock: int = Field(sa_column=Column(Integer, CheckConstraint("stock >= 0"), default=0, nullable=False))
    disponible: bool = Field(default=True, nullable=False)
    imagen_url: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None)

    # Relaciones multidimensionales M2M
    categorias: List[Categoria] = Relationship(link_model=ProductoCategoria)
    ingredientes: List[Ingrediente] = Relationship(
        back_populates="productos",
        link_model=ProductoIngrediente
    )
