from typing import List, Optional
from fastapi import HTTPException, status
from sqlmodel import select

from app.core.uow import UnitOfWork
from app.modules.usuarios.model import DireccionEntrega
from app.modules.usuarios.schemas import DireccionEntregaCreate, DireccionEntregaUpdate


class DireccionService:
    def __init__(self):
        pass

    async def list_direcciones(self, usuario_id: int) -> List[DireccionEntrega]:
        """
        Lista todas las direcciones activas (no eliminadas) de un usuario.
        """
        async with UnitOfWork() as uow:
            statement = select(DireccionEntrega).where(
                DireccionEntrega.usuario_id == usuario_id,
                DireccionEntrega.deleted_at == None
            )
            return uow.session.exec(statement).all()

    async def get_direccion_by_id(self, direccion_id: int, usuario_id: int) -> DireccionEntrega:
        """
        Obtiene una dirección por ID verificando la propiedad del usuario.
        """
        async with UnitOfWork() as uow:
            direccion = uow.direcciones.get_by_id(direccion_id)
            if not direccion or direccion.usuario_id != usuario_id or direccion.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dirección no encontrada"
                )
            return direccion

    async def create_direccion(self, usuario_id: int, data: DireccionEntregaCreate) -> DireccionEntrega:
        """
        Crea una dirección para el usuario, manejando la rotación de dirección principal (RN-DI01).
        """
        async with UnitOfWork() as uow:
            # Si se marca como principal, desactivar las otras principales
            if data.es_principal:
                await self._desmarcar_principales_uow(uow, usuario_id)
            else:
                # Si es la primera dirección activa del usuario, hacerla principal por defecto
                stmt_count = select(DireccionEntrega).where(
                    DireccionEntrega.usuario_id == usuario_id,
                    DireccionEntrega.deleted_at == None
                )
                count = len(uow.session.exec(stmt_count).all())
                if count == 0:
                    data.es_principal = True

            nueva_dir = DireccionEntrega(
                usuario_id=usuario_id,
                alias=data.alias,
                calle=data.calle,
                numero=data.numero,
                piso_depto=data.piso_depto,
                ciudad=data.ciudad,
                codigo_postal=data.codigo_postal,
                es_principal=data.es_principal
            )
            return uow.direcciones.create(nueva_dir)

    async def update_direccion(
        self, direccion_id: int, usuario_id: int, data: DireccionEntregaUpdate
    ) -> DireccionEntrega:
        """
        Actualiza una dirección y rota la dirección principal si corresponde (RN-DI01).
        """
        async with UnitOfWork() as uow:
            direccion = uow.direcciones.get_by_id(direccion_id)
            if not direccion or direccion.usuario_id != usuario_id or direccion.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dirección no encontrada"
                )

            # Si cambia a principal, desactivar las otras principales
            if data.es_principal is True and not direccion.es_principal:
                await self._desmarcar_principales_uow(uow, usuario_id)

            # Actualizar campos
            for field, value in data.model_dump(exclude_unset=True).items():
                setattr(direccion, field, value)

            return uow.direcciones.update(direccion)

    async def delete_direccion(self, direccion_id: int, usuario_id: int) -> None:
        """
        Elimina de forma lógica (soft delete) una dirección.
        Si la dirección eliminada era la principal, marca otra dirección activa como principal
        para evitar que el usuario se quede sin dirección principal.
        """
        async with UnitOfWork() as uow:
            direccion = uow.direcciones.get_by_id(direccion_id)
            if not direccion or direccion.usuario_id != usuario_id or direccion.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dirección no encontrada"
                )

            was_principal = direccion.es_principal
            uow.direcciones.delete(direccion, soft=True)

            # Si la eliminada era principal, buscar otra dirección activa para hacerla principal
            if was_principal:
                stmt = select(DireccionEntrega).where(
                    DireccionEntrega.usuario_id == usuario_id,
                    DireccionEntrega.deleted_at == None
                )
                active_dirs = uow.session.exec(stmt).all()
                if active_dirs:
                    first_active = active_dirs[0]
                    first_active.es_principal = True
                    uow.direcciones.update(first_active)

    async def _desmarcar_principales_uow(self, uow: UnitOfWork, usuario_id: int) -> None:
        """
        Método auxiliar para desmarcar todas las direcciones principales dentro de la transacción.
        """
        statement = select(DireccionEntrega).where(
            DireccionEntrega.usuario_id == usuario_id,
            DireccionEntrega.es_principal == True,
            DireccionEntrega.deleted_at == None
        )
        principales = uow.session.exec(statement).all()
        for dir_aux in principales:
            dir_aux.es_principal = False
            uow.direcciones.update(dir_aux)


class UsuarioService:
    def __init__(self):
        pass

    async def list_usuarios(
        self,
        page: int = 1,
        limit: int = 10,
        search: Optional[str] = None,
        rol: Optional[str] = None,
        active: Optional[bool] = None
    ) -> tuple[List["Usuario"], int]:
        """
        Lista usuarios registrados en el sistema de forma paginada con filtros aplicados.
        """
        from sqlmodel import or_
        from app.modules.auth.model import Usuario, UsuarioRol
        from sqlalchemy.orm import selectinload

        async with UnitOfWork() as uow:
            query = select(Usuario).where(Usuario.deleted_at == None).options(selectinload(Usuario.roles))

            if search:
                query = query.where(
                    or_(
                        Usuario.nombre.ilike(f"%{search}%"),
                        Usuario.apellido.ilike(f"%{search}%"),
                        Usuario.email.ilike(f"%{search}%")
                    )
                )

            if rol:
                query = query.join(UsuarioRol).where(UsuarioRol.rol_codigo == rol)

            if active is not None:
                query = query.where(Usuario.activo == active)

            # Obtener total de registros que coinciden con los filtros
            total = len(uow.session.exec(query).all())

            # Paginación
            query = query.order_by(Usuario.created_at.desc()).offset((page - 1) * limit).limit(limit)
            items = uow.session.exec(query).all()

            return items, total

    async def get_usuario_by_id(self, usuario_id: int) -> "Usuario":
        """
        Obtiene un usuario por ID.
        """
        from app.modules.auth.model import Usuario
        from sqlalchemy.orm import selectinload

        async with UnitOfWork() as uow:
            statement = select(Usuario).where(Usuario.id == usuario_id, Usuario.deleted_at == None).options(selectinload(Usuario.roles))
            usuario = uow.session.exec(statement).first()
            if not usuario:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado"
                )
            return usuario

    async def update_usuario_rol_y_estado(
        self,
        usuario_id: int,
        rol_codigo: Optional[str] = None,
        activo: Optional[bool] = None
    ) -> "Usuario":
        """
        Actualiza el rol o el estado (activo/inactivo) de un usuario en el sistema.
        Al desactivar la cuenta, revoca de forma atómica todas sus sesiones y refresh tokens activos.
        """
        from app.modules.auth.model import UsuarioRol, Usuario
        from app.modules.auth.repository import AuthRepository
        from sqlalchemy.orm import selectinload

        async with UnitOfWork() as uow:
            statement = select(Usuario).where(Usuario.id == usuario_id, Usuario.deleted_at == None).options(selectinload(Usuario.roles))
            usuario = uow.session.exec(statement).first()
            if not usuario:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado"
                )

            # Alternar estado activo
            if activo is not None:
                usuario.activo = activo
                # Si se desactiva, invalidar tokens
                if not activo:
                    auth_repo = AuthRepository(uow.session)
                    auth_repo.revoke_user_tokens(usuario_id)

            # Reasignación de Rol (RBAC)
            if rol_codigo is not None:
                # Validar que el rol exista
                rol = uow.roles.get_by_id(rol_codigo)
                if not rol:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"El rol '{rol_codigo}' no existe en el sistema."
                    )

                # Eliminar asignaciones de rol existentes para este usuario
                stmt_delete = select(UsuarioRol).where(UsuarioRol.usuario_id == usuario_id)
                roles_actuales = uow.session.exec(stmt_delete).all()
                for r_act in roles_actuales:
                    uow.session.delete(r_act)
                uow.session.flush()

                # Asignar el nuevo rol solicitado
                uow.session.add(UsuarioRol(usuario_id=usuario_id, rol_codigo=rol_codigo))

            uow.usuarios.update(usuario)
            
            # Recargar una copia fresca con el nuevo rol cargado ansiosamente
            stmt_fresh = select(Usuario).where(Usuario.id == usuario_id).options(selectinload(Usuario.roles))
            usuario_fresh = uow.session.exec(stmt_fresh).first()
            return usuario_fresh

