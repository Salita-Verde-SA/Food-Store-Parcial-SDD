from datetime import datetime
from typing import List, Tuple, Optional
from fastapi import HTTPException, status
from sqlmodel import select
from decimal import Decimal

from app.core.uow import UnitOfWork
from app.modules.pedidos.model import Pedido, DetallePedido, HistorialEstadoPedido
from app.modules.productos.model import Producto
from app.modules.usuarios.model import DireccionEntrega
from app.modules.pedidos.schemas import CrearPedidoRequest, AvanzarEstadoRequest


class PedidoService:
    # Definición de la máquina de estados finitos (FSM)
    FSM_TRANSITIONS = {
        "PENDIENTE": ["CONFIRMADO", "CANCELADO"],
        "CONFIRMADO": ["EN_PREP", "CANCELADO"],
        "EN_PREP": ["EN_CAMINO", "CANCELADO"],
        "EN_CAMINO": ["ENTREGADO"],
        "ENTREGADO": [],
        "CANCELADO": []
    }

    def __init__(self):
        pass

    async def list_pedidos(
        self, usuario_id: int, user_roles: List[str], page: int = 1, size: int = 20
    ) -> Tuple[List[Pedido], int]:
        """
        Lista pedidos paginados.
        - CLIENT: solo ve sus propios pedidos.
        - ADMIN/PEDIDOS: ven todos los pedidos del sistema.
        """
        is_staff = any(role in ["ADMIN", "PEDIDOS"] for role in user_roles)
        skip = (page - 1) * size

        async with UnitOfWork() as uow:
            if is_staff:
                statement = select(Pedido).order_by(Pedido.created_at.desc())
            else:
                statement = select(Pedido).where(Pedido.usuario_id == usuario_id).order_by(Pedido.created_at.desc())

            # Obtener total para paginación
            total = len(uow.session.exec(statement).all())
            
            # Obtener ítems paginados
            paginated_stmt = statement.offset(skip).limit(size)
            items = uow.session.exec(paginated_stmt).all()
            return items, total

    async def list_cocina_pedidos(self) -> List[Pedido]:
        """
        Obtiene los pedidos activos para cocina (CONFIRMADO y EN_PREP) ordenados cronológicamente.
        """
        async with UnitOfWork() as uow:
            statement = select(Pedido).where(
                Pedido.estado_codigo.in_(["CONFIRMADO", "EN_PREP"])
            ).order_by(Pedido.created_at.asc())
            return uow.session.exec(statement).all()

    async def get_pedido_by_id(self, pedido_id: int, usuario_id: int, user_roles: List[str]) -> Pedido:
        """
        Obtiene el detalle de un pedido verificando estrictamente la pertenencia (CLIENT) o permisos (staff).
        """
        is_staff = any(role in ["ADMIN", "PEDIDOS"] for role in user_roles)

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
                    detail="No tienes permiso para ver este pedido"
                )
            return pedido

    async def crear_pedido(self, usuario_id: int, data: CrearPedidoRequest) -> Pedido:
        """
        Crea un nuevo pedido asumiendo estado PENDIENTE, capturando snapshots y validando stock a nivel de lectura.
        Todo de forma atómica bajo el Unit of Work (UoW).
        """
        async with UnitOfWork() as uow:
            # 0. Validar estado del local (abierto/cerrado)
            estado_local_config = uow.configuraciones.get_by_id("estado_local")
            if estado_local_config and estado_local_config.value != "abierto":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El restaurante se encuentra cerrado temporalmente y no acepta nuevos pedidos en este momento."
                )

            # 1. Validar forma de pago
            forma_pago = uow.pagos.get_by_id(data.forma_pago_codigo)
            if not forma_pago or not forma_pago.habilitado:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Forma de pago no válida o inactiva"
                )

            # 2. Resolver Dirección y crear snapshot (RN-PE03)
            costo_envio = Decimal("0.00")
            direccion_str = "Retiro en local"
            if data.direccion_id is not None:
                direccion = uow.direcciones.get_by_id(data.direccion_id)
                if not direccion or direccion.usuario_id != usuario_id or direccion.deleted_at is not None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Dirección de entrega inválida o borrada"
                    )
                # Formar snapshot de texto de la dirección
                parts = [
                    direccion.calle,
                    direccion.numero,
                    direccion.piso_depto if direccion.piso_depto else "",
                    direccion.ciudad,
                    f"CP {direccion.codigo_postal}"
                ]
                direccion_str = ", ".join(filter(None, parts))
                
                # Obtener costo de envío dinámico de la base de datos
                costo_envio_config = uow.configuraciones.get_by_id("costo_envio")
                if costo_envio_config:
                    try:
                        costo_envio = Decimal(costo_envio_config.value)
                    except Exception:
                        costo_envio = Decimal("150.00")  # Fallback
                else:
                    costo_envio = Decimal("150.00")  # Fallback

            # 3. Inicializar Pedido
            pedido = Pedido(
                usuario_id=usuario_id,
                estado_codigo="PENDIENTE",
                costo_envio=costo_envio,
                total=Decimal("0.00"),  # Se calcula a continuación
                forma_pago_codigo=data.forma_pago_codigo,
                direccion_id=data.direccion_id,
                direccion_snapshot=direccion_str,
                notas=data.notas
            )
            # Guardamos para obtener el ID asignado
            uow.pedidos.create(pedido)

            # 4. Procesar y persistir detalles con snapshot de precio (RN-PE02)
            subtotal = Decimal("0.00")
            for item in data.items:
                # Bloqueo SELECT FOR UPDATE para verificar existencias iniciales de forma segura
                stmt_prod = select(Producto).where(Producto.id == item.producto_id).with_for_update()
                producto = uow.session.exec(stmt_prod).first()
                if not producto or producto.deleted_at is not None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"El producto con ID {item.producto_id} no existe en el catálogo"
                    )
                if not producto.disponible:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"El producto '{producto.nombre}' no está disponible para la venta"
                    )
                if producto.stock < item.cantidad:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Stock insuficiente para '{producto.nombre}'. Disponible: {producto.stock}"
                    )

                # Convertir personalizaciones (lista de IDs) a comas
                pers_str = ",".join(map(str, item.personalizacion)) if item.personalizacion else None

                detalle = DetallePedido(
                    pedido_id=pedido.id,
                    producto_id=producto.id,
                    cantidad=item.cantidad,
                    nombre_snapshot=producto.nombre,
                    precio_snapshot=producto.precio,
                    personalizacion=pers_str
                )
                uow.detalles_pedido.create(detalle)
                subtotal += producto.precio * item.cantidad

            # 5. Guardar totales consolidados
            pedido.total = subtotal + costo_envio
            uow.pedidos.update(pedido)

            # 6. Crear primer registro de historial append-only (RN-02)
            historial = HistorialEstadoPedido(
                pedido_id=pedido.id,
                estado_desde=None,
                estado_hasta="PENDIENTE",
                usuario_id=usuario_id,
                motivo="Creación inicial del pedido"
            )
            uow.historial_pedidos.create(historial)

            return pedido

    async def avanzar_estado(
        self, pedido_id: int, operador_id: int, nuevo_estado: str, motivo: Optional[str] = None, user_roles: List[str] = []
    ) -> Pedido:
        """
        Avanza el estado de un pedido validando estrictamente la FSM, controlando transiciones terminales
        y descontando/reintegrando stock concurrentemente con SELECT FOR UPDATE (RN-FS01 a RN-FS09).
        """
        is_admin = "ADMIN" in user_roles
        is_pedidos = "PEDIDOS" in user_roles
        is_cocina = "COCINA" in user_roles

        async with UnitOfWork() as uow:
            # 1. Bloqueo de fila del pedido para prevenir colisiones concurrentes
            pedido_stmt = select(Pedido).where(Pedido.id == pedido_id).with_for_update()
            pedido = uow.session.exec(pedido_stmt).first()
            if not pedido:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Pedido no encontrado"
                )

            estado_actual = pedido.estado_codigo

            # 2. Controlar si ya es un estado terminal (RN-FS06)
            stmt_est_actual = select(uow.estados.model).where(uow.estados.model.codigo == estado_actual)
            est_actual_meta = uow.session.exec(stmt_est_actual).first()
            if est_actual_meta and est_actual_meta.es_terminal:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El pedido ya se encuentra en un estado terminal ({estado_actual}) y no admite cambios"
                )

            # 3. Validar transición en el mapa de FSM (RN-FS01)
            transiciones_validas = self.FSM_TRANSITIONS.get(estado_actual, [])
            if nuevo_estado not in transiciones_validas:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Transición inválida de {estado_actual} hacia {nuevo_estado}"
                )

            # 4. Validar permisos específicos de transición (RBAC)
            # CLIENT: Solo puede avanzar PENDIENTE -> CANCELADO y CONFIRMADO -> CANCELADO.
            # SISTEMA / Webhook: Puede avanzar PENDIENTE -> CONFIRMADO.
            # STAFF (ADMIN/PEDIDOS): Puede avanzar CONFIRMADO -> EN_PREP -> EN_CAMINO -> ENTREGADO, y cancelar en EN_PREP.
            if nuevo_estado == "CANCELADO":
                if not motivo:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="El motivo de cancelación es obligatorio"
                    )

                # Si es EN_PREP, solo personal puede cancelar
                if estado_actual == "EN_PREP" and not (is_admin or is_pedidos):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Solo el personal autorizado puede cancelar pedidos en preparación"
                    )
                # Si el cliente cancela, verificar pertenencia
                if not (is_admin or is_pedidos) and pedido.usuario_id != operador_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No tienes permiso para cancelar este pedido"
                    )
            else:
                # Transiciones operativas (ej: EN_PREP, EN_CAMINO, ENTREGADO) requieren staff
                if nuevo_estado in ["EN_PREP", "EN_CAMINO", "ENTREGADO"]:
                    if nuevo_estado in ["EN_PREP", "EN_CAMINO"]:
                        if not (is_admin or is_pedidos or is_cocina):
                            raise HTTPException(
                                status_code=status.HTTP_403_FORBIDDEN,
                                detail="Acción no autorizada. Requiere rol de administración o cocina."
                            )
                    elif nuevo_estado == "ENTREGADO":
                        if not (is_admin or is_pedidos):
                            raise HTTPException(
                                status_code=status.HTTP_403_FORBIDDEN,
                                detail="Acción no autorizada. Cocina no puede entregar pedidos."
                            )
                # PENDIENTE -> CONFIRMADO: Validado externamente por webhook o ADMIN
                if nuevo_estado == "CONFIRMADO" and not (is_admin or operador_id == 0): # 0 = SISTEMA
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="La confirmación de pago debe procesarse vía pasarela"
                    )

            # 5. Efectuar operaciones atómicas de stock sobre catálogo
            # CASO A: Confirmación del pago (PENDIENTE -> CONFIRMADO) -> Descontar stock (RN-FS03)
            if nuevo_estado == "CONFIRMADO":
                for detail in pedido.detalles:
                    stmt_prod = select(Producto).where(Producto.id == detail.producto_id).with_for_update()
                    producto = uow.session.exec(stmt_prod).first()
                    if not producto or producto.deleted_at is not None or not producto.disponible:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"El producto '{detail.nombre_snapshot}' ya no está disponible en el catálogo"
                        )
                    if producto.stock < detail.cantidad:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Stock insuficiente para confirmar '{detail.nombre_snapshot}'. Disponible: {producto.stock}"
                        )
                    # Decremento
                    producto.stock -= detail.cantidad
                    uow.productos.update(producto)

            # CASO B: Cancelación de pedido previamente reservado (CONFIRMADO o EN_PREP -> CANCELADO) -> Reintegrar stock (RN-FS05)
            elif nuevo_estado == "CANCELADO" and estado_actual in ["CONFIRMADO", "EN_PREP"]:
                for detail in pedido.detalles:
                    stmt_prod = select(Producto).where(Producto.id == detail.producto_id).with_for_update()
                    producto = uow.session.exec(stmt_prod).first()
                    if producto:
                        # Reintegro
                        producto.stock += detail.cantidad
                        uow.productos.update(producto)

            # 6. Actualizar el pedido
            pedido.estado_codigo = nuevo_estado
            pedido.updated_at = datetime.utcnow()
            uow.pedidos.update(pedido)

            # 7. Registrar en Historial append-only (RN-03, RN-FS07)
            historial = HistorialEstadoPedido(
                pedido_id=pedido.id,
                estado_desde=estado_actual,
                estado_hasta=nuevo_estado,
                usuario_id=operador_id,
                motivo=motivo if motivo else f"Cambio de estado a {nuevo_estado}"
            )
            uow.historial_pedidos.create(historial)

        # Broadcast al KDS en tiempo real fuera de la transacción para seguridad
        event_map = {
            "CONFIRMADO": "PEDIDO_CONFIRMADO",
            "EN_PREP": "PEDIDO_EN_PREPARACION",
            "EN_CAMINO": "PEDIDO_EN_CAMINO",
            "ENTREGADO": "PEDIDO_ENTREGADO",
            "CANCELADO": "PEDIDO_CANCELADO"
        }
        if nuevo_estado in event_map:
            from app.modules.cocina.service import cocina_service
            payload = {
                "id": pedido.id,
                "estado_codigo": nuevo_estado,
                "notas": pedido.notas,
                "created_at": pedido.created_at.isoformat() if pedido.created_at else None,
                "total": float(pedido.total) if pedido.total else 0.0
            }
            await cocina_service.broadcast_event(event_map[nuevo_estado], payload)

        return pedido
