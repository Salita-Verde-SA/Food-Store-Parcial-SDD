from typing import Dict, Any
from fastapi import APIRouter, Depends, status, BackgroundTasks
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.model import Usuario
from app.modules.pagos.schemas import CrearPagoRequest, PagoResponse
from app.modules.pagos.service import PagoService

router = APIRouter(prefix="/pagos", tags=["Pagos"])
pago_service = PagoService()


@router.post("/crear", response_model=PagoResponse, status_code=status.HTTP_201_CREATED)
async def crear_pago(
    data: CrearPagoRequest,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Crea o reintenta un intento de pago generando una preferencia de MercadoPago
    asociada al pedido dado.
    """
    resp = await pago_service.crear_preferencia_pago(
        pedido_id=data.pedido_id,
        usuario_id=current_user.id
    )
    return resp


@router.post("/webhook")
async def webhook_mercadopago(
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks
):
    """
    Endpoint público que recibe las notificaciones de MercadoPago (Webhooks / IPN).
    - Sandbox/test: Procesa de forma síncrona para que el frontend pueda esperar la confirmación.
    - Producción: Responde HTTP 200 inmediatamente y procesa en segundo plano.
    """
    # Detectar si es una simulación de sandbox (payment_id empieza con "test_")
    payment_id = payload.get("data", {}).get("id", "")
    is_sandbox = str(payment_id).startswith("test_")

    if is_sandbox:
        # Ejecutar de forma síncrona para que el pedido transite a CONFIRMADO
        # antes de que el frontend continúe con el flujo de éxito
        await pago_service.procesar_webhook_ipn(payload)
    else:
        # Producción: responder rápido a MercadoPago para evitar reintentos
        background_tasks.add_task(pago_service.procesar_webhook_ipn, payload)

    return {"status": "ok"}


@router.get("/{pedido_id}", response_model=PagoResponse)
async def consultar_pago(
    pedido_id: int,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtiene el estado local del pago registrado para un pedido específico.
    """
    user_roles = [r.codigo for r in current_user.roles]
    pago = await pago_service.consultar_pago_pedido(
        pedido_id=pedido_id,
        usuario_id=current_user.id,
        user_roles=user_roles
    )
    return pago
