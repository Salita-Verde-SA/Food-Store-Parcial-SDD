from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


class UsuarioRol(SQLModel, table=True):
    usuario_id: int = Field(foreign_key="usuario.id", primary_key=True)
    rol_codigo: str = Field(foreign_key="rol.codigo", primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UsuarioBase(SQLModel):
    nombre: str = Field(max_length=80)
    apellido: str = Field(max_length=80)
    email: str = Field(unique=True, index=True, max_length=254)
    activo: bool = Field(default=True)


class Usuario(UsuarioBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    password_hash: str = Field(max_length=60)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None)

    # Relaciones
    roles: List["Rol"] = Relationship(back_populates="usuarios", link_model=UsuarioRol)


class Rol(SQLModel, table=True):
    codigo: str = Field(primary_key=True, max_length=20)  # ADMIN, STOCK, PEDIDOS, CLIENT
    descripcion: Optional[str] = None
    
    # Relaciones
    usuarios: List["Usuario"] = Relationship(back_populates="roles", link_model=UsuarioRol)


class RefreshToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuario.id")
    token_hash: str = Field(index=True)
    expires_at: datetime
    revoked: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relaciones
    usuario: Usuario = Relationship()
