from fastapi import APIRouter, Depends, status, Query
from typing import List, Optional

from app.modules.auth.dependencies import require_role
from app.modules.ingredientes.schemas import IngredienteCreate, IngredienteUpdate, IngredienteRead
from app.modules.ingredientes.service import IngredienteService

router = APIRouter(prefix="/ingredientes", tags=["Ingredientes"])


def get_ingrediente_service() -> IngredienteService:
    return IngredienteService()


@router.get("", response_model=List[IngredienteRead])
async def get_ingredientes(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    es_alergeno: Optional[bool] = Query(default=None),
    service: IngredienteService = Depends(get_ingrediente_service)
):
    """
    Lista todos los ingredientes registrados de forma pública (útil para filtros de alérgenos).
    """
    return await service.list_ingredientes(skip=skip, limit=limit, es_alergeno=es_alergeno)


@router.get("/{id}", response_model=IngredienteRead)
async def get_ingrediente(
    id: int,
    service: IngredienteService = Depends(get_ingrediente_service),
    current_user = require_role(["ADMIN", "STOCK"])
):
    """
    Obtiene un ingrediente por su ID.
    Requiere rol ADMIN o STOCK.
    """
    return await service.get_ingrediente_by_id(id)


@router.post("", response_model=IngredienteRead, status_code=status.HTTP_201_CREATED)
async def create_ingrediente(
    data: IngredienteCreate,
    service: IngredienteService = Depends(get_ingrediente_service),
    current_user = require_role(["ADMIN", "STOCK"])
):
    """
    Crea un nuevo ingrediente.
    Requiere rol ADMIN o STOCK.
    """
    return await service.create_ingrediente(data)


@router.put("/{id}", response_model=IngredienteRead)
async def update_ingrediente(
    id: int,
    data: IngredienteUpdate,
    service: IngredienteService = Depends(get_ingrediente_service),
    current_user = require_role(["ADMIN", "STOCK"])
):
    """
    Actualiza un ingrediente existente.
    Requiere rol ADMIN o STOCK.
    """
    return await service.update_ingrediente(id, data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ingrediente(
    id: int,
    service: IngredienteService = Depends(get_ingrediente_service),
    current_user = require_role(["ADMIN", "STOCK"])
):
    """
    Aplica soft delete a un ingrediente.
    Requiere rol ADMIN o STOCK. Bloquea si está asociado a productos activos.
    """
    await service.delete_ingrediente(id)
    return None
