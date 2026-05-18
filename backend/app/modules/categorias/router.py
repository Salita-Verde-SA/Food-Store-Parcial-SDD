from fastapi import APIRouter, Depends, status
from typing import List

from app.modules.auth.dependencies import require_role
from app.modules.categorias.schemas import (
    CategoriaCreate, CategoriaUpdate, CategoriaRead, CategoriaTreeRead
)
from app.modules.categorias.service import CategoriaService

router = APIRouter(prefix="/categorias", tags=["Categorías"])


def get_categoria_service() -> CategoriaService:
    return CategoriaService()


@router.get("", response_model=List[CategoriaTreeRead])
async def get_categorias_tree(
    service: CategoriaService = Depends(get_categoria_service)
):
    """
    Retorna el catálogo de categorías completo estructurado como un árbol anidado recursivo.
    Endpoint público accesible por clientes anónimos.
    """
    return await service.get_tree()


@router.post("", response_model=CategoriaRead, status_code=status.HTTP_201_CREATED)
async def create_categoria(
    data: CategoriaCreate,
    service: CategoriaService = Depends(get_categoria_service),
    current_user = require_role(["ADMIN", "STOCK"])
):
    """
    Crea una nueva categoría.
    Requiere rol ADMIN o STOCK.
    """
    return await service.create_categoria(data)


@router.put("/{id}", response_model=CategoriaRead)
async def update_categoria(
    id: int,
    data: CategoriaUpdate,
    service: CategoriaService = Depends(get_categoria_service),
    current_user = require_role(["ADMIN", "STOCK"])
):
    """
    Actualiza una categoría existente.
    Requiere rol ADMIN o STOCK. Previene dependencias circulares (ciclos).
    """
    return await service.update_categoria(id, data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_categoria(
    id: int,
    service: CategoriaService = Depends(get_categoria_service),
    current_user = require_role(["ADMIN"])
):
    """
    Elimina lógicamente una categoría (Soft Delete).
    Requiere rol ADMIN. Desasocia categorías hijas asignando parent_id = NULL.
    """
    await service.delete_categoria(id)
    return None
