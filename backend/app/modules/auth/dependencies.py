from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError
from sqlmodel import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import ALGORITHM
from app.modules.auth.model import Usuario
from app.modules.usuarios.repository import UsuarioRepository

from fastapi import Query

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False
)


def get_current_user(
    session: Session = Depends(get_db),
    token: Optional[str] = Depends(reusable_oauth2),
    token_query: Optional[str] = Query(default=None, alias="token")
) -> Usuario:
    resolved_token = token or token_query
    if not resolved_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no proporcionado",
        )
    try:
        payload = jwt.decode(
            resolved_token, settings.SECRET_KEY, algorithms=[ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: falta subject",
            )
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )
    
    usuario_repo = UsuarioRepository(session)
    user = usuario_repo.get_by_id(int(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo",
        )
    return user


class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: Usuario = Depends(get_current_user)) -> Usuario:
        user_roles = [r.codigo for r in user.roles]
        # Si no hay roles permitidos, se asume que solo requiere estar autenticado
        if not self.allowed_roles:
            return user
            
        # Verificar si el usuario tiene al menos uno de los roles requeridos
        if not any(role in self.allowed_roles for role in user_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos suficientes para realizar esta acción",
            )
        return user


def require_role(roles: List[str]):
    return Depends(RoleChecker(roles))
