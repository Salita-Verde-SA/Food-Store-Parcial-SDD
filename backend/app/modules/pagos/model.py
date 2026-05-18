from datetime import datetime
from typing import Optional
from decimal import Decimal
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Numeric


class FormaPago(SQLModel, table=True):
    codigo: str = Field(primary_key=True, max_length=20)
    nombre: str = Field(max_length=100)
    habilitado: bool = Field(default=True)


class Pago(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    pedido_id: int = Field(foreign_key="pedido.id", nullable=False, unique=True)
    external_reference: str = Field(max_length=100, nullable=False, unique=True)
    payment_id: Optional[str] = Field(default=None, max_length=100)
    status: str = Field(max_length=50, nullable=False)
    monto: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    idempotency_key: str = Field(max_length=100, nullable=False, unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relaciones
    pedido: "Pedido" = Relationship(back_populates="pago")
