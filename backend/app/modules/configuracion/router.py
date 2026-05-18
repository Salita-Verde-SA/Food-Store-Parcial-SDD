from typing import List
from fastapi import APIRouter, Depends
from app.modules.auth.dependencies import require_role
from app.modules.configuracion.schemas import ConfiguracionRead, ConfiguracionUpdate
from app.modules.configuracion.service import ConfiguracionService

router = APIRouter(
    prefix="/admin/configuracion",
    tags=["Admin - Configuración Global"],
    dependencies=[require_role(["ADMIN"])]
)

configuracion_service = ConfiguracionService()


@router.get("", response_model=List[ConfiguracionRead])
async def list_configuraciones():
    """
    Lista todos los parámetros de configuración global del sistema (Sólo Admin).
    """
    return await configuracion_service.list_configuraciones()


@router.get("/{key}", response_model=ConfiguracionRead)
async def get_configuracion(key: str):
    """
    Obtiene los detalles de un parámetro de configuración específico por clave (Sólo Admin).
    """
    return await configuracion_service.get_configuracion_by_key(key)


@router.put("/{key}", response_model=ConfiguracionRead)
async def update_configuracion(key: str, data: ConfiguracionUpdate):
    """
    Actualiza el valor de una configuración global (Sólo Admin).
    """
    return await configuracion_service.update_configuracion(key, data)


# Router público para que clientes consulten costos y estado
public_router = APIRouter(
    prefix="/configuracion",
    tags=["Configuración Global"]
)


@public_router.get("", response_model=List[ConfiguracionRead])
async def list_public_configuraciones():
    """
    Lista todos los parámetros de configuración global del sistema para consumo público (clientes).
    """
    return await configuracion_service.list_configuraciones()

