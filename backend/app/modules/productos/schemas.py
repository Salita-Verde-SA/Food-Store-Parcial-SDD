from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from decimal import Decimal

from app.modules.categorias.schemas import CategoriaRead
from app.modules.ingredientes.schemas import IngredienteRead


class ProductoCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre del producto")
    descripcion: Optional[str] = Field(default=None, description="Descripción opcional")
    precio: Decimal = Field(..., gt=0, description="Precio unitario (debe ser mayor a 0)")
    stock: int = Field(default=0, ge=0, description="Existencias iniciales (debe ser >= 0)")
    disponible: bool = Field(default=True, description="Disponibilidad para la venta pública")
    imagen_url: Optional[str] = Field(default=None, max_length=255, description="URL de la imagen del producto")
    categoria_ids: List[int] = Field(default_factory=list, description="Categorías asociadas")
    ingrediente_ids: List[int] = Field(default_factory=list, description="Ingredientes que lo componen")


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=100)
    descripcion: Optional[str] = Field(default=None)
    precio: Optional[Decimal] = Field(default=None, gt=0)
    stock: Optional[int] = Field(default=None, ge=0)
    disponible: Optional[bool] = Field(default=None)
    imagen_url: Optional[str] = Field(default=None, max_length=255)
    categoria_ids: Optional[List[int]] = Field(default=None)
    ingrediente_ids: Optional[List[int]] = Field(default=None)


class ProductoStockUpdate(BaseModel):
    cantidad: int = Field(..., description="Cantidad a incrementar (positivo) o decrementar (negativo)")


class ProductoRead(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    precio: Decimal
    stock: int
    disponible: bool
    imagen_url: Optional[str] = None
    categorias: List[CategoriaRead] = Field(default_factory=list)
    ingredientes: List[IngredienteRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ProductoPublicRead(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    precio: Decimal
    disponible: bool  # Disponible al público si stock > 0 y disponible es True
    imagen_url: Optional[str] = None
    categorias: List[CategoriaRead] = Field(default_factory=list)
    ingredientes: List[IngredienteRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

