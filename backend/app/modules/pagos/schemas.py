from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from decimal import Decimal
from datetime import datetime


class CrearPagoRequest(BaseModel):
    pedido_id: int = Field(..., description="ID del pedido a abonar")


class PagoResponse(BaseModel):
    id: int
    pedido_id: int
    external_reference: str
    payment_id: Optional[str] = None
    status: str
    monto: Decimal
    idempotency_key: str
    preference_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WebhookNotification(BaseModel):
    action: Optional[str] = None
    api_version: Optional[str] = None
    data: Optional[dict] = None
    id: Optional[str] = None
    type: Optional[str] = None
