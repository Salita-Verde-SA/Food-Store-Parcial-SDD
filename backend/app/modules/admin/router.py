from fastapi import APIRouter, Depends
from app.modules.auth.dependencies import require_role
from app.modules.admin.schemas import DashboardMetrics
from app.modules.admin.service import AdminService

router = APIRouter(
    prefix="/admin/dashboard",
    tags=["Admin - Dashboard"],
    dependencies=[require_role(["ADMIN", "PEDIDOS"])]
)

admin_service = AdminService()


@router.get("", response_model=DashboardMetrics)
async def get_dashboard_metrics():
    """
    Retorna las métricas agregadas de facturación y ventas operativas del negocio (Sólo Admin y Pedidos).
    """
    return await admin_service.obtener_metricas_dashboard()
