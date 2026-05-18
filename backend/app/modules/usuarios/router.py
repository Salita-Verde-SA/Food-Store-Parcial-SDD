from typing import List, Optional
from fastapi import APIRouter, Depends, status, Response
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.model import Usuario
from app.modules.usuarios.schemas import DireccionEntregaCreate, DireccionEntregaUpdate, DireccionEntregaRead
from app.modules.usuarios.service import DireccionService

router = APIRouter(prefix="/direcciones", tags=["Direcciones"])
direccion_service = DireccionService()


@router.get("", response_model=List[DireccionEntregaRead])
async def list_direcciones(
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtiene todas las direcciones activas (no eliminadas) del usuario autenticado.
    """
    return await direccion_service.list_direcciones(current_user.id)


@router.get("/{id}", response_model=DireccionEntregaRead)
async def get_direccion(
    id: int,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtiene el detalle de una dirección específica del usuario logueado.
    """
    return await direccion_service.get_direccion_by_id(id, current_user.id)


@router.post("", response_model=DireccionEntregaRead, status_code=status.HTTP_201_CREATED)
async def create_direccion(
    data: DireccionEntregaCreate,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Crea una nueva dirección física para el usuario autenticado.
    """
    return await direccion_service.create_direccion(current_user.id, data)


@router.put("/{id}", response_model=DireccionEntregaRead)
async def update_direccion(
    id: int,
    data: DireccionEntregaUpdate,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Actualiza los datos de una dirección existente del usuario autenticado.
    """
    return await direccion_service.update_direccion(id, current_user.id, data)


@router.patch("/{id}/principal", response_model=DireccionEntregaRead)
async def set_principal(
    id: int,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Establece una dirección específica como la predeterminada/principal del usuario.
    """
    return await direccion_service.update_direccion(
        id, current_user.id, DireccionEntregaUpdate(es_principal=True)
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_direccion(
    id: int,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Elimina de forma lógica (soft delete) una dirección física del usuario autenticado.
    """
    await direccion_service.delete_direccion(id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


from fastapi import Query
from app.modules.auth.dependencies import require_role
from app.modules.usuarios.schemas import UsuarioReadAdmin, PaginatedUsuarios, UsuarioUpdateAdmin
from app.modules.usuarios.service import UsuarioService

usuarios_admin_router = APIRouter(
    prefix="/usuarios",
    tags=["Admin - Usuarios"],
    dependencies=[require_role(["ADMIN", "STOCK", "PEDIDOS"])]
)

usuario_service = UsuarioService()


@usuarios_admin_router.get("", response_model=PaginatedUsuarios)
async def list_usuarios(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    rol: Optional[str] = Query(None),
    active: Optional[bool] = Query(None)
):
    """
    Retorna la lista de usuarios registrados con paginación, filtros de rol/estado y buscador (Sólo Admin/Staff).
    """
    items, total = await usuario_service.list_usuarios(
        page=page, limit=limit, search=search, rol=rol, active=active
    )
    return PaginatedUsuarios(items=items, total=total, page=page, limit=limit)


@usuarios_admin_router.get("/{id}", response_model=UsuarioReadAdmin)
async def get_usuario(id: int):
    """
    Obtiene el detalle administrativo de un usuario específico (Sólo Admin/Staff).
    """
    return await usuario_service.get_usuario_by_id(id)


@usuarios_admin_router.put("/{id}", response_model=UsuarioReadAdmin)
async def update_usuario(
    id: int,
    data: UsuarioUpdateAdmin,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Actualiza el rol (RBAC) o estado de cuenta de un usuario.
    Si se desactiva, de-autentica de forma atómica todas sus sesiones y revoca refresh tokens (Sólo Admin/Staff autorizado).
    """
    # 1. Obtener los roles del usuario logueado (updater)
    updater_roles = [r.codigo for r in current_user.roles]
    is_updater_admin = "ADMIN" in updater_roles

    # 2. Obtener el usuario objetivo a modificar
    target_user = await usuario_service.get_usuario_by_id(id)
    target_roles = [r.codigo for r in target_user.roles]
    is_target_admin = "ADMIN" in target_roles

    # 3. Verificar si se está intentando promover a ADMIN o modificar a un ADMIN existente
    is_new_role_admin = data.rol_codigo == "ADMIN"

    from fastapi import HTTPException
    if (is_target_admin or is_new_role_admin) and not is_updater_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar a un administrador ni asignar el rol de ADMINISTRADOR."
        )

    return await usuario_service.update_usuario_rol_y_estado(
        usuario_id=id, rol_codigo=data.rol_codigo, activo=data.activo
    )

