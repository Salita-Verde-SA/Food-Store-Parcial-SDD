from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List


class CategoriaCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre de la categoría")
    descripcion: Optional[str] = Field(default=None, description="Descripción opcional de la categoría")
    parent_id: Optional[int] = Field(default=None, description="ID de la categoría padre (NULL si es raíz)")


class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=100, description="Nuevo nombre")
    descripcion: Optional[str] = Field(default=None, description="Nueva descripción")
    parent_id: Optional[int] = Field(default=None, description="Nuevo ID de la categoría padre")


class CategoriaRead(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    parent_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class CategoriaTreeRead(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    parent_id: Optional[int] = None
    nivel: int
    children: List["CategoriaTreeRead"] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# Reconstruye los modelos recursivos autorreferenciales en Pydantic v2 (reemplaza a update_forward_refs)
CategoriaTreeRead.model_rebuild()
