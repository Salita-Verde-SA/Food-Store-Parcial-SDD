from datetime import datetime, timedelta
from typing import Optional, Tuple
from fastapi import HTTPException, status
from app.core.security import (
    verify_password, 
    create_access_token, 
    create_refresh_token,
    get_password_hash
)
from app.modules.auth.repository import AuthRepository
from app.modules.usuarios.repository import UsuarioRepository
from app.modules.auth.model import RefreshToken, Usuario
from app.modules.auth.schemas import LoginRequest, TokenResponse, LoginResponse, UserSummary


class AuthService:
    def __init__(self, auth_repo: AuthRepository, usuario_repo: UsuarioRepository):
        self.auth_repo = auth_repo
        self.usuario_repo = usuario_repo

    def authenticate_user(self, login_data: LoginRequest) -> Usuario:
        user = self.usuario_repo.get_by_email(login_data.email)
        if not user or not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email o contraseña incorrectos",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.activo:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario inactivo",
            )
        return user

    def create_session(self, user: Usuario) -> LoginResponse:
        access_token = create_access_token(subject=user.id)
        refresh_token_raw = create_refresh_token(subject=user.id)
        
        # Guardar refresh token en BD
        # Por simplicidad, guardamos el hash del token o el token directo
        # En una implementación real, se recomienda guardar el hash
        expires_at = datetime.utcnow() + timedelta(days=7) # TODO: usar config
        new_token = RefreshToken(
            usuario_id=user.id,
            token_hash=refresh_token_raw, # En producción usaría hash
            expires_at=expires_at
        )
        self.auth_repo.create(new_token)
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token_raw,
            user=UserSummary(
                id=user.id,
                email=user.email,
                nombre=user.nombre,
                apellido=user.apellido,
                roles=[r.codigo for r in user.roles]
            )
        )

    def refresh_session(self, refresh_token: str) -> TokenResponse:
        token_record = self.auth_repo.get_by_hash(refresh_token)
        if not token_record or token_record.revoked or token_record.expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido o expirado",
            )
        
        # Opcional: Rotación de refresh token
        # Por ahora solo emitimos nuevo access token
        new_access = create_access_token(subject=token_record.usuario_id)
        return TokenResponse(
            access_token=new_access,
            refresh_token=refresh_token
        )

    def logout(self, refresh_token: str):
        token_record = self.auth_repo.get_by_hash(refresh_token)
        if token_record:
            token_record.revoked = True
            self.auth_repo.session.add(token_record)
            self.auth_repo.session.commit()
