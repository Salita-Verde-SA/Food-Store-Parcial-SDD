import asyncio
import json
from typing import List
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from app.modules.auth.dependencies import get_current_user, require_role
from app.modules.auth.model import Usuario
from app.modules.pedidos.service import PedidoService
from app.modules.pedidos.schemas import PedidoDetail
from app.modules.cocina.service import cocina_service

router = APIRouter(prefix="/cocina", tags=["Cocina"])
pedido_service = PedidoService()

@router.get("/pedidos", response_model=List[PedidoDetail])
async def list_cocina_pedidos(
    current_user: Usuario = require_role(["ADMIN", "PEDIDOS", "COCINA"])
):
    """
    Obtiene todos los pedidos activos para cocina (estados CONFIRMADO y EN_PREP) ordenados de forma cronológica.
    """
    pedidos = await pedido_service.list_cocina_pedidos()
    
    items_read = []
    for pedido in pedidos:
        detail = PedidoDetail.model_validate(pedido)
        for item_read, item_db in zip(detail.items, pedido.detalles):
            if item_db.personalizacion:
                item_read.personalizacion = [int(x) for x in item_db.personalizacion.split(",") if x]
            else:
                item_read.personalizacion = []
        items_read.append(detail)
    
    return items_read

@router.get("/events")
async def sse_events(
    current_user: Usuario = require_role(["ADMIN", "PEDIDOS", "COCINA"])
):
    """
    Establece un canal SSE (Server-Sent Events) unidireccional en tiempo real para cocina.
    """
    async def event_generator():
        # Registrar la cola de este cliente
        queue = await cocina_service.register_client()
        try:
            # Enviar evento de bienvenida inicial para confirmar conexión exitosa
            yield "event: connected\ndata: {\"status\": \"ok\"}\n\n"
            
            while True:
                try:
                    # Esperar con timeout para poder enviar eventos keep-alive de forma periódica
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"event: {event['event']}\ndata: {json.dumps(event['data'])}\n\n"
                except asyncio.TimeoutError:
                    # Enviar ping / keep-alive comment para evitar timeouts de red o proxies
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            # Captura desconexiones normales del cliente
            pass
        finally:
            # Desregistrar la cola al desconectarse
            await cocina_service.unregister_client(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
