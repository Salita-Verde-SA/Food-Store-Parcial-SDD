from typing import List
from fastapi import APIRouter, Depends, status, Response
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.model import Usuario
from app.modules.usuarios.schemas import DireccionEntregaCreate, DireccionEntregaUpdate, DireccionEntregaRead
from app.modules.usuarios.service import DireccionService

router = APIRouter(prefix="/direcciones", tags=["Direcciones"])
direccion_service = DireccionService()


@router.get("", response_model=List[DireccionEntregaRead])
async def list_direcciones(
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtiene todas las direcciones activas (no eliminadas) del usuario autenticado.
    """
    return await direccion_service.list_direcciones(current_user.id)


@router.get("/{id}", response_model=DireccionEntregaRead)
async def get_direccion(
    id: int,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtiene el detalle de una dirección específica del usuario logueado.
    """
    return await direccion_service.get_direccion_by_id(id, current_user.id)


@router.post("", response_model=DireccionEntregaRead, status_code=status.HTTP_201_CREATED)
async def create_direccion(
    data: DireccionEntregaCreate,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Crea una nueva dirección física para el usuario autenticado.
    """
    return await direccion_service.create_direccion(current_user.id, data)


@router.put("/{id}", response_model=DireccionEntregaRead)
async def update_direccion(
    id: int,
    data: DireccionEntregaUpdate,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Actualiza los datos de una dirección existente del usuario autenticado.
    """
    return await direccion_service.update_direccion(id, current_user.id, data)


@router.patch("/{id}/principal", response_model=DireccionEntregaRead)
async def set_principal(
    id: int,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Establece una dirección específica como la predeterminada/principal del usuario.
    """
    return await direccion_service.update_direccion(
        id, current_user.id, DireccionEntregaUpdate(es_principal=True)
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_direccion(
    id: int,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Elimina de forma lógica (soft delete) una dirección física del usuario autenticado.
    """
    await direccion_service.delete_direccion(id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
