from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class IngredienteCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre del ingrediente")
    es_alergeno: bool = Field(default=False, description="Indica si el ingrediente es alérgeno")


class IngredienteUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=100, description="Nombre modificado")
    es_alergeno: Optional[bool] = Field(default=None, description="Marca de alérgeno modificada")


class IngredienteRead(BaseModel):
    id: int
    nombre: str
    es_alergeno: bool

    model_config = ConfigDict(from_attributes=True)
