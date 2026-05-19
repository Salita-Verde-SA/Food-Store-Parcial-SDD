from decimal import Decimal
from typing import Dict, List
from sqlmodel import select, func

from app.core.uow import UnitOfWork
from app.modules.pedidos.model import Pedido, DetallePedido
from app.modules.pagos.model import Pago
from app.modules.productos.model import Producto
from app.modules.admin.schemas import DashboardMetrics, TopProducto, EvolucionVenta


class AdminService:
    def __init__(self):
        pass

    async def obtener_metricas_dashboard(self) -> DashboardMetrics:
        """
        Calcula y agrupa métricas comerciales a nivel base de datos de manera atómica y eficiente,
        soportando de forma adaptativa SQLite (desarrollo) y PostgreSQL (producción).
        """
        async with UnitOfWork() as uow:
            # 1. Ingresos Totales: Sumatoria de pagos APPROVED
            stmt_ingresos = select(func.sum(Pago.monto)).where(Pago.status == "approved")
            ingresos_raw = uow.session.exec(stmt_ingresos).first()
            ingresos_totales = float(ingresos_raw) if ingresos_raw is not None else 0.0

            # 2. Pedidos por Estado: Recuento agrupado por estado_codigo
            stmt_estados = select(Pedido.estado_codigo, func.count(Pedido.id)).group_by(Pedido.estado_codigo)
            estados_raw = uow.session.exec(stmt_estados).all()
            pedidos_por_estado: Dict[str, int] = {estado: count for estado, count in estados_raw}

            # Asegurar estados clave inicializados en 0 por consistencia si no hay pedidos
            for est in ["PENDIENTE", "CONFIRMADO", "EN_PREP", "EN_CAMINO", "ENTREGADO", "CANCELADO"]:
                if est not in pedidos_por_estado:
                    pedidos_por_estado[est] = 0

            # 3. Top 5 Productos más vendidos (excluyendo pedidos CANCELADOS)
            stmt_top = (
                select(
                    Producto.id,
                    Producto.nombre,
                    func.sum(DetallePedido.cantidad).label("cantidad"),
                    func.sum(DetallePedido.cantidad * DetallePedido.precio_snapshot).label("total")
                )
                .join(DetallePedido, DetallePedido.producto_id == Producto.id)
                .join(Pedido, Pedido.id == DetallePedido.pedido_id)
                .where(Pedido.estado_codigo != "CANCELADO")
                .group_by(Producto.id, Producto.nombre)
                .order_by(func.sum(DetallePedido.cantidad).desc())
                .limit(5)
            )
            top_raw = uow.session.exec(stmt_top).all()
            top_productos: List[TopProducto] = [
                TopProducto(
                    id=item[0],
                    nombre=item[1],
                    cantidad=int(item[2]),
                    total=float(item[3])
                )
                for item in top_raw
            ]

            # 4. Evolución Temporal de Ventas (Soporte Dual SQLite / Postgres)
            # Detectamos si es SQLite para usar strftime, de lo contrario Postgres date_trunc
            is_sqlite = "sqlite" in str(uow.session.bind.url)
            if is_sqlite:
                date_group = func.strftime("%Y-%m-%d", Pedido.created_at)
            else:
                date_group = func.date_trunc("day", Pedido.created_at)

            stmt_history = (
                select(
                    date_group.label("fecha"),
                    func.count(Pedido.id).label("pedidos"),
                    func.sum(Pedido.total).label("ventas")
                )
                .where(Pedido.estado_codigo != "CANCELADO")
                .group_by(date_group)
                .order_by(date_group.asc())
            )
            history_raw = uow.session.exec(stmt_history).all()
            
            evolucion_ventas: List[EvolucionVenta] = []
            for item in history_raw:
                # Si Postgres date_trunc retorna un objeto datetime, formatearlo
                fecha_str = item[0].strftime("%Y-%m-%d") if hasattr(item[0], "strftime") else str(item[0])
                evolucion_ventas.append(
                    EvolucionVenta(
                        fecha=fecha_str,
                        pedidos=int(item[1]),
                        ventas=float(item[2])
                    )
                )

            return DashboardMetrics(
                ingresos_totales=ingresos_totales,
                pedidos_por_estado=pedidos_por_estado,
                top_productos=top_productos,
                evolucion_ventas=evolucion_ventas
            )
