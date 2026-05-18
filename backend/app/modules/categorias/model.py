from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import UniqueConstraint


class Categoria(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, nullable=False)
    descripcion: Optional[str] = Field(default=None)
    parent_id: Optional[int] = Field(default=None, foreign_key="categoria.id", nullable=True)
    deleted_at: Optional[datetime] = Field(default=None)

    # Relaciones jerárquicas en SQLModel
    parent: Optional["Categoria"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "Categoria.id"}
    )
    children: List["Categoria"] = Relationship(back_populates="parent")

    __table_args__ = (
        UniqueConstraint("nombre", "parent_id", name="uq_categoria_nombre_parent"),
    )
