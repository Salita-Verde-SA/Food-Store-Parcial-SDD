from datetime import datetime
from typing import List
from fastapi import HTTPException, status
from app.core.uow import UnitOfWork
from app.modules.configuracion.model import Configuracion
from app.modules.configuracion.schemas import ConfiguracionUpdate


class ConfiguracionService:
    def __init__(self):
        pass

    async def list_configuraciones(self) -> List[Configuracion]:
        """
        Retorna todas las configuraciones persistidas en el sistema.
        """
        async with UnitOfWork() as uow:
            return uow.configuraciones.list_all()

    async def get_configuracion_by_key(self, key: str) -> Configuracion:
        """
        Retorna los detalles de una configuración específica por clave.
        """
        async with UnitOfWork() as uow:
            config = uow.configuraciones.get_by_id(key)
            if not config:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Configuración '{key}' no encontrada."
                )
            return config

    async def update_configuracion(self, key: str, data: ConfiguracionUpdate) -> Configuracion:
        """
        Actualiza el valor y la descripción de un parámetro de configuración global.
        """
        async with UnitOfWork() as uow:
            config = uow.configuraciones.get_by_id(key)
            if not config:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Configuración '{key}' no encontrada."
                )
            config.value = data.value
            if data.description is not None:
                config.description = data.description
            config.updated_at = datetime.utcnow()
            return uow.configuraciones.update(config)
