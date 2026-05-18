from typing import Optional
from sqlmodel import SQLModel, Field


class EstadoPedido(SQLModel, table=True):
    codigo: str = Field(primary_key=True, max_length=20)
    descripcion: Optional[str] = None
    orden: int = Field(default=0)
    es_terminal: bool = Field(default=False)
