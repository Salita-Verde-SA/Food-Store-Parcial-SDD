from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Relationship
from app.modules.auth.model import Usuario


class DireccionEntrega(SQLModel, table=True):
    __tablename__ = "direccion_entrega"

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuario.id", nullable=False)
    alias: Optional[str] = Field(default=None, max_length=50)
    calle: str = Field(max_length=200, nullable=False)
    numero: str = Field(max_length=20, nullable=False)
    piso_depto: Optional[str] = Field(default=None, max_length=50)
    ciudad: str = Field(max_length=100, nullable=False)
    codigo_postal: str = Field(max_length=20, nullable=False)
    es_principal: bool = Field(default=False, nullable=False)
    deleted_at: Optional[datetime] = Field(default=None)

    # Relaciones
    usuario: Usuario = Relationship(sa_relationship_kwargs={"lazy": "joined"})
