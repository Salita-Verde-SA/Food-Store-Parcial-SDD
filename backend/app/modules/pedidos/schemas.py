from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from decimal import Decimal
from datetime import datetime


# --- REQUEST SCHEMAS ---

class ItemPedidoRequest(BaseModel):
    producto_id: int = Field(..., description="ID del producto en el catálogo")
    cantidad: int = Field(..., ge=1, description="Cantidad a ordenar (mínimo 1)")
    personalizacion: Optional[List[int]] = Field(
        default=None, description="IDs de ingredientes removidos (opcional)"
    )


class CrearPedidoRequest(BaseModel):
    items: List[ItemPedidoRequest] = Field(..., min_length=1, description="Mínimo 1 ítem requerido")
    forma_pago_codigo: str = Field(..., description="Forma de pago elegida (MERCADOPAGO, EFECTIVO, etc.)")
    direccion_id: Optional[int] = Field(
        default=None, description="ID de la dirección de entrega (None para retiro en local)"
    )
    notas: Optional[str] = Field(default=None, max_length=255, description="Notas aclaratorias adicionales")


class AvanzarEstadoRequest(BaseModel):
    nuevo_estado: str = Field(..., description="Código del nuevo estado")
    motivo: Optional[str] = Field(default=None, max_length=255, description="Motivo (obligatorio si se cancela)")


# --- RESPONSE SCHEMAS ---

class DetallePedidoRead(BaseModel):
    id: int
    producto_id: int
    nombre_snapshot: str
    precio_snapshot: Decimal
    cantidad: int
    personalizacion: Optional[List[int]] = None

    model_config = ConfigDict(from_attributes=True)


class HistorialEstadoPedidoRead(BaseModel):
    id: int
    estado_desde: Optional[str] = None
    estado_hasta: str
    motivo: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PagoRead(BaseModel):
    id: int
    mp_payment_id: Optional[int] = None
    mp_status: str
    external_reference: str
    idempotency_key: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PedidoRead(BaseModel):
    id: int
    estado_codigo: str
    total: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PedidoDetail(BaseModel):
    id: int
    usuario_id: int
    estado_codigo: str
    subtotal: Decimal
    descuento: Decimal
    costo_envio: Decimal
    total: Decimal
    notas: Optional[str] = None
    forma_pago_codigo: str
    direccion_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    items: List[DetallePedidoRead] = Field(default_factory=list)
    historial: List[HistorialEstadoPedidoRead] = Field(default_factory=list)
    pago: Optional[PagoRead] = None

    model_config = ConfigDict(from_attributes=True)
