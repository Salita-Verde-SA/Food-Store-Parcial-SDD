from typing import List, Optional
from fastapi import Depends, HTTPException, status
from app.core.uow import UnitOfWork
from app.modules.auth.model import Usuario


async def get_current_user(
    # token: str = Depends(oauth2_scheme), 
    # uow: UnitOfWork = Depends(get_uow)
) -> Usuario:
    """
    Dependencia para obtener el usuario actual. 
    En us-000-setup es un STUB que devuelve 401 si no hay token (simulado).
    Será implementado en us-001-auth.
    """
    # TODO: Implementar validación JWT real
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated (Stub us-000)",
    )


def require_role(roles: List[str]):
    """
    Dependencia para verificar roles del usuario.
    """
    async def role_checker(current_user: Usuario = Depends(get_current_user)):
        user_roles = [r.codigo for r in current_user.roles]
        if not any(role in user_roles for role in roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {roles} required",
            )
        return current_user
    return role_checker
