from typing import List, Dict
from pydantic import BaseModel


class TopProducto(BaseModel):
    id: int
    nombre: str
    cantidad: int
    total: float


class EvolucionVenta(BaseModel):
    fecha: str
    pedidos: int
    ventas: float


class DashboardMetrics(BaseModel):
    ingresos_totales: float
    pedidos_por_estado: Dict[str, int]
    top_productos: List[TopProducto]
    evolucion_ventas: List[EvolucionVenta]
