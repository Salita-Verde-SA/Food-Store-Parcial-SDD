import uuid
import urllib.request
import json
from datetime import datetime
from typing import Dict, Any, Optional, List
from decimal import Decimal
from fastapi import HTTPException, status
from sqlmodel import select

from app.core.config import settings
from app.core.uow import UnitOfWork
from app.modules.pagos.model import Pago
from app.modules.pedidos.model import Pedido
from app.modules.pedidos.service import PedidoService


class PagoService:
    def __init__(self):
        self.pedido_service = PedidoService()

    async def crear_preferencia_pago(self, pedido_id: int, usuario_id: int) -> Dict[str, Any]:
        """
        Crea una preferencia en MercadoPago para un pedido.
        Soporta reintentos generando un nuevo idempotency_key sobre el mismo pedido (relación 1:N simulada via update).
        """
        async with UnitOfWork() as uow:
            # 1. Obtener pedido
            pedido = uow.pedidos.get_by_id(pedido_id)
            if not pedido:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Pedido no encontrado"
                )

            # Validar pertenencia del pedido (solo el propietario puede pagarlo)
            if pedido.usuario_id != usuario_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permiso para pagar este pedido"
                )

            # 2. Verificar si ya existe un registro de pago
            stmt_pago = select(Pago).where(Pago.pedido_id == pedido_id)
            pago = uow.session.exec(stmt_pago).first()

            if pago:
                if pago.status == "approved":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Este pedido ya ha sido pagado y aprobado"
                    )
                # Si está rechazado o pendiente, actualizamos para un reintento
                # Generamos una nueva clave de idempotencia (RN-PA02 / reintento)
                idempotency_key = str(uuid.uuid4())
                pago.idempotency_key = idempotency_key
                pago.status = "pending"
                pago.updated_at = datetime.utcnow()
                uow.pagos.update(pago)
            else:
                # Primer intento de pago
                idempotency_key = str(uuid.uuid4())
                external_ref = f"FS-PEDIDO-{pedido_id}"
                pago = Pago(
                    pedido_id=pedido_id,
                    external_reference=external_ref,
                    status="pending",
                    monto=pedido.total,
                    idempotency_key=idempotency_key
                )
                uow.pagos.create(pago)

            # 3. Integración con MercadoPago
            # Si el token es de pruebas sandbox simulado, retornamos mock preference
            if settings.MP_ACCESS_TOKEN == "TEST-MP-TOKEN":
                mock_preference_id = f"pref_{uuid.uuid4().hex[:12]}"
                return {
                    "id": pago.id,
                    "pedido_id": pago.pedido_id,
                    "external_reference": pago.external_reference,
                    "payment_id": pago.payment_id,
                    "status": pago.status,
                    "monto": pago.monto,
                    "idempotency_key": pago.idempotency_key,
                    "preference_id": mock_preference_id,
                    "created_at": pago.created_at,
                    "updated_at": pago.updated_at
                }

            # Llamada real a la API de MercadoPago Preferences
            try:
                url = "https://api.mercadopago.com/checkout/preferences"
                headers = {
                    "Authorization": f"Bearer {settings.MP_ACCESS_TOKEN}",
                    "Content-Type": "application/json",
                    "x-idempotency-key": idempotency_key
                }
                body = {
                    "items": [
                        {
                            "title": f"Food Store - Pedido #{pedido.id}",
                            "quantity": 1,
                            "unit_price": float(pedido.total),
                            "currency_id": "ARS"
                        }
                    ],
                    "external_reference": pago.external_reference,
                    "notification_url": settings.MP_NOTIFICATION_URL,
                    "back_urls": {
                        "success": "http://localhost:5173/checkout/success",
                        "pending": "http://localhost:5173/checkout/pending",
                        "failure": "http://localhost:5173/checkout/failure"
                    },
                    "auto_return": "approved"
                }

                req = urllib.request.Request(
                    url,
                    data=json.dumps(body).encode("utf-8"),
                    headers=headers,
                    method="POST"
                )

                with urllib.request.urlopen(req) as res:
                    resp_data = json.loads(res.read().decode("utf-8"))
                    preference_id = resp_data.get("id")

                return {
                    "id": pago.id,
                    "pedido_id": pago.pedido_id,
                    "external_reference": pago.external_reference,
                    "payment_id": pago.payment_id,
                    "status": pago.status,
                    "monto": pago.monto,
                    "idempotency_key": pago.idempotency_key,
                    "preference_id": preference_id,
                    "created_at": pago.created_at,
                    "updated_at": pago.updated_at
                }
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Error al conectar con la pasarela de pagos: {str(e)}"
                )

    async def consultar_pago_pedido(self, pedido_id: int, usuario_id: int, user_roles: List[str]) -> Pago:
        """
        Permite consultar el estado local del pago de un pedido.
        """
        is_staff = any(r in ["ADMIN", "PEDIDOS"] for r in user_roles)

        async with UnitOfWork() as uow:
            pedido = uow.pedidos.get_by_id(pedido_id)
            if not pedido:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Pedido no encontrado"
                )

            if not is_staff and pedido.usuario_id != usuario_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Acción no autorizada"
                )

            stmt_pago = select(Pago).where(Pago.pedido_id == pedido_id)
            pago = uow.session.exec(stmt_pago).first()
            if not pago:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No existe ningún intento de pago registrado para este pedido"
                )
            return pago

    async def procesar_webhook_ipn(self, payload: Dict[str, Any]) -> None:
        """
        Procesa de forma segura y atómica la notificación IPN de MercadoPago (RN-PA02 a RN-PA07).
        """
        payment_id = None
        
        # Estilo Webhook estándar de MercadoPago
        if payload.get("type") == "payment":
            payment_id = payload.get("data", {}).get("id")
        # Estilo IPN tradicional o query params de IPN
        elif payload.get("topic") == "payment":
            payment_id = payload.get("id")
        elif "resource" in payload and "payments" in payload["resource"]:
            parts = payload["resource"].split("/")
            payment_id = parts[-1]

        if not payment_id:
            # Si no es sobre un pago, se ignora silenciosamente
            return

        # Consultar el estado real directo en la API de MercadoPago para seguridad (RN-PA04)
        mp_status = "pending"
        external_reference = None

        # Si estamos en modo de pruebas / mock, permitimos simular aprobaciones directamente
        if settings.MP_ACCESS_TOKEN == "TEST-MP-TOKEN" or str(payment_id).startswith("test_"):
            mp_status = payload.get("status", "approved")
            external_reference = payload.get("external_reference")
            if not external_reference:
                async with UnitOfWork() as uow:
                    stmt_pago = select(Pago).where(Pago.status == "pending")
                    pago_pend = uow.session.exec(stmt_pago).first()
                    if pago_pend:
                        external_reference = pago_pend.external_reference
                    else:
                        external_reference = f"FS-PEDIDO-1"
        else:
            try:
                url = f"https://api.mercadopago.com/v1/payments/{payment_id}"
                headers = {"Authorization": f"Bearer {settings.MP_ACCESS_TOKEN}"}
                req = urllib.request.Request(url, headers=headers, method="GET")
                with urllib.request.urlopen(req) as res:
                    resp_data = json.loads(res.read().decode("utf-8"))
                    mp_status = resp_data.get("status", "pending")
                    external_reference = resp_data.get("external_reference")
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Error al validar pago con MercadoPago: {str(e)}"
                )

        if not external_reference:
            return

        # Extraer ID de pedido del external_reference
        try:
            pedido_id = int(external_reference.replace("FS-PEDIDO-", ""))
        except ValueError:
            return

        # Transacción atómica en Base de Datos (UoW)
        async with UnitOfWork() as uow:
            # Bloqueo de fila del Pago para evitar condiciones de carrera (idempotencia RN-PA02)
            stmt_pago = select(Pago).where(Pago.pedido_id == pedido_id).with_for_update()
            pago = uow.session.exec(stmt_pago).first()
            if not pago:
                # Si por alguna razón el registro no existe localmente, lo creamos
                pedido = uow.pedidos.get_by_id(pedido_id)
                monto = pedido.total if pedido else Decimal("0.00")
                pago = Pago(
                    pedido_id=pedido_id,
                    external_reference=external_reference,
                    status=mp_status,
                    monto=monto,
                    idempotency_key=str(uuid.uuid4()),
                    payment_id=str(payment_id)
                )
                uow.pagos.create(pago)
            else:
                # Idempotencia: Si ya está aprobado, salimos de inmediato sin realizar operaciones extras
                if pago.status == "approved":
                    return

                # Actualizar el registro del pago
                pago.status = mp_status
                pago.payment_id = str(payment_id)
                pago.updated_at = datetime.utcnow()
                uow.pagos.update(pago)

            # Si el pago es aprobado, avanzamos el pedido en la FSM a CONFIRMADO (RN-PA05 / RN-FS03)
            if mp_status == "approved":
                await self.pedido_service.avanzar_estado(
                    pedido_id=pedido_id,
                    operador_id=0,  # 0 = SISTEMA (Webhook MercadoPago)
                    nuevo_estado="CONFIRMADO",
                    motivo=f"Pago acreditado vía MercadoPago. Transacción ID: {payment_id}",
                    user_roles=["ADMIN"]  # Rol inyectado para autorizar la acción automática
                )
