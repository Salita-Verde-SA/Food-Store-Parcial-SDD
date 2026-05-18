from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


class ProductoIngrediente(SQLModel, table=True):
    __tablename__ = "producto_ingrediente"
    producto_id: int = Field(foreign_key="producto.id", primary_key=True)
    ingrediente_id: int = Field(foreign_key="ingrediente.id", primary_key=True)


class Ingrediente(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, nullable=False, unique=True)
    es_alergeno: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None)

    # Relación muchos a muchos con productos usando el link_model definido localmente
    productos: List["Producto"] = Relationship(
        back_populates="ingredientes",
        link_model=ProductoIngrediente
    )
