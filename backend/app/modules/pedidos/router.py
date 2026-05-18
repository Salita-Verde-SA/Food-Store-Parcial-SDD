from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status, Response
from app.modules.auth.dependencies import get_current_user, require_role
from app.modules.auth.model import Usuario
from app.modules.pedidos.schemas import (
    CrearPedidoRequest,
    AvanzarEstadoRequest,
    PedidoRead,
    PedidoDetail,
    HistorialEstadoPedidoRead
)
from app.modules.pedidos.service import PedidoService
from pydantic import BaseModel, Field

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])
pedido_service = PedidoService()


class CancelarPedidoRequest(BaseModel):
    motivo: str = Field(..., min_length=1, max_length=255, description="Motivo detallado de la cancelación")


@router.get("", response_model=Dict[str, Any])
async def list_pedidos(
    page: int = 1,
    size: int = 20,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista los pedidos del sistema con paginación RFC estándar.
    - CLIENT: Solo obtiene sus propios pedidos.
    - ADMIN/PEDIDOS: Obtiene todos los pedidos del sistema.
    """
    user_roles = [r.codigo for r in current_user.roles]
    items, total = await pedido_service.list_pedidos(
        current_user.id, user_roles, page=page, size=size
    )
    
    items_read = []
    for item in items:
        detail = PedidoDetail.model_validate(item)
        for item_read, item_db in zip(detail.items, item.detalles):
            if item_db.personalizacion:
                item_read.personalizacion = [int(x) for x in item_db.personalizacion.split(",") if x]
            else:
                item_read.personalizacion = []
        items_read.append(detail)
    
    return {
        "items": items_read,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }


@router.get("/{id}", response_model=PedidoDetail)
async def get_pedido(
    id: int,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtiene el detalle completo de un pedido con líneas, historial de estados y pago.
    """
    user_roles = [r.codigo for r in current_user.roles]
    pedido = await pedido_service.get_pedido_by_id(id, current_user.id, user_roles)
    
    detail = PedidoDetail.model_validate(pedido)
    # Parseamos la personalización (comma-separated string en BD) a List[int] en la salida
    for item_read, item_db in zip(detail.items, pedido.detalles):
        if item_db.personalizacion:
            item_read.personalizacion = [int(x) for x in item_db.personalizacion.split(",") if x]
        else:
            item_read.personalizacion = []
    return detail


@router.post("", response_model=PedidoDetail, status_code=status.HTTP_201_CREATED)
async def create_pedido(
    data: CrearPedidoRequest,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Crea un nuevo pedido a partir de los productos en el carrito.
    """
    pedido = await pedido_service.crear_pedido(current_user.id, data)
    user_roles = [r.codigo for r in current_user.roles]
    pedido_full = await pedido_service.get_pedido_by_id(pedido.id, current_user.id, user_roles)
    
    detail = PedidoDetail.model_validate(pedido_full)
    for item_read, item_db in zip(detail.items, pedido_full.detalles):
        if item_db.personalizacion:
            item_read.personalizacion = [int(x) for x in item_db.personalizacion.split(",") if x]
        else:
            item_read.personalizacion = []
    return detail


@router.patch("/{id}/estado", response_model=PedidoDetail)
async def avanzar_estado(
    id: int,
    data: AvanzarEstadoRequest,
    current_user: Usuario = require_role(["ADMIN", "PEDIDOS"])
):
    """
    Avanza el estado del pedido en la FSM (ciclo operativo de preparación y logística).
    Solo accesible por roles ADMIN o PEDIDOS.
    """
    user_roles = [r.codigo for r in current_user.roles]
    pedido = await pedido_service.avanzar_estado(
        pedido_id=id,
        operador_id=current_user.id,
        nuevo_estado=data.nuevo_estado,
        motivo=data.motivo,
        user_roles=user_roles
    )
    
    detail = PedidoDetail.model_validate(pedido)
    for item_read, item_db in zip(detail.items, pedido.detalles):
        if item_db.personalizacion:
            item_read.personalizacion = [int(x) for x in item_db.personalizacion.split(",") if x]
        else:
            item_read.personalizacion = []
    return detail


@router.get("/{id}/historial", response_model=List[HistorialEstadoPedidoRead])
async def get_historial(
    id: int,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtiene la trazabilidad (timeline/audit trail) del ciclo de vida del pedido.
    """
    user_roles = [r.codigo for r in current_user.roles]
    pedido = await pedido_service.get_pedido_by_id(id, current_user.id, user_roles)
    return pedido.historial


@router.delete("/{id}", response_model=PedidoDetail)
async def cancelar_pedido(
    id: int,
    data: CancelarPedidoRequest,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Cancela un pedido (solo permitido en estados PENDIENTE, CONFIRMADO, o EN_PREPARACIÓN por staff).
    """
    user_roles = [r.codigo for r in current_user.roles]
    pedido = await pedido_service.avanzar_estado(
        pedido_id=id,
        operador_id=current_user.id,
        nuevo_estado="CANCELADO",
        motivo=data.motivo,
        user_roles=user_roles
    )
    
    detail = PedidoDetail.model_validate(pedido)
    for item_read, item_db in zip(detail.items, pedido.detalles):
        if item_db.personalizacion:
            item_read.personalizacion = [int(x) for x in item_db.personalizacion.split(",") if x]
        else:
            item_read.personalizacion = []
    return detail
