from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class DireccionEntregaCreate(BaseModel):
    alias: Optional[str] = Field(default=None, max_length=50, description="Alias de la dirección (ej: Casa, Trabajo)")
    calle: str = Field(..., min_length=1, max_length=200, description="Calle de entrega")
    numero: str = Field(..., min_length=1, max_length=20, description="Número de puerta")
    piso_depto: Optional[str] = Field(default=None, max_length=50, description="Piso y departamento opcional")
    ciudad: str = Field(..., min_length=1, max_length=100, description="Ciudad")
    codigo_postal: str = Field(..., min_length=1, max_length=20, description="Código postal")
    es_principal: bool = Field(default=False, description="Indica si es la dirección predeterminada")


class DireccionEntregaUpdate(BaseModel):
    alias: Optional[str] = Field(default=None, max_length=50)
    calle: Optional[str] = Field(default=None, min_length=1, max_length=200)
    numero: Optional[str] = Field(default=None, min_length=1, max_length=20)
    piso_depto: Optional[str] = Field(default=None, max_length=50)
    ciudad: Optional[str] = Field(default=None, min_length=1, max_length=100)
    codigo_postal: Optional[str] = Field(default=None, min_length=1, max_length=20)
    es_principal: Optional[bool] = Field(default=None)


class DireccionEntregaRead(BaseModel):
    id: int
    usuario_id: int
    alias: Optional[str] = None
    calle: str
    numero: str
    piso_depto: Optional[str] = None
    ciudad: str
    codigo_postal: str
    es_principal: bool

    model_config = ConfigDict(from_attributes=True)
