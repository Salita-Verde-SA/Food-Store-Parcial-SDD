from fastapi import APIRouter, Depends, status
from app.core.database import get_db
from app.modules.auth.repository import AuthRepository
from app.modules.usuarios.repository import UsuarioRepository
from app.modules.auth.service import AuthService
from app.modules.auth.schemas import LoginRequest, LoginResponse, TokenResponse, UserSummary
from sqlmodel import Session
from app.core.limiter import limiter
from fastapi import Request
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.model import Usuario

router = APIRouter(prefix="/auth", tags=["Autenticación"])


def get_auth_service(session: Session = Depends(get_db)) -> AuthService:
    auth_repo = AuthRepository(session)
    usuario_repo = UsuarioRepository(session)
    return AuthService(auth_repo, usuario_repo)


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/15 minutes")
def login(
    request: Request,
    login_data: LoginRequest,
    service: AuthService = Depends(get_auth_service)
):
    user = service.authenticate_user(login_data)
    return service.create_session(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    refresh_token: str,
    service: AuthService = Depends(get_auth_service)
):
    return service.refresh_session(refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    refresh_token: str,
    service: AuthService = Depends(get_auth_service)
):
    service.logout(refresh_token)
    return None


@router.get("/me", response_model=UserSummary)
def get_me(
    current_user: Usuario = Depends(get_current_user)
):
    return UserSummary(
        id=current_user.id,
        email=current_user.email,
        nombre=current_user.nombre,
        apellido=current_user.apellido,
        roles=[r.codigo for r in current_user.roles]
    )
