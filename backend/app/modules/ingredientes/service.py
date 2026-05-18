from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, status
from sqlmodel import select

from app.core.uow import UnitOfWork
from app.modules.ingredientes.model import Ingrediente
from app.modules.ingredientes.schemas import IngredienteCreate, IngredienteUpdate


class IngredienteService:
    def __init__(self):
        pass

    async def list_ingredientes(
        self, 
        skip: int = 0, 
        limit: int = 100, 
        es_alergeno: Optional[bool] = None
    ) -> List[Ingrediente]:
        """
        Lista ingredientes activos con filtros opcionales de alérgenos y paginación.
        """
        async with UnitOfWork() as uow:
            return uow.ingredientes.list_all_paginated(
                skip=skip, 
                limit=limit, 
                es_alergeno=es_alergeno, 
                include_deleted=False
            )

    async def get_ingrediente_by_id(self, ingrediente_id: int) -> Ingrediente:
        """
        Obtiene un ingrediente específico por ID.
        """
        async with UnitOfWork() as uow:
            ingrediente = uow.ingredientes.get_by_id(ingrediente_id)
            if not ingrediente or ingrediente.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Ingrediente no encontrado"
                )
            return ingrediente

    async def create_ingrediente(self, data: IngredienteCreate) -> Ingrediente:
        """
        Crea un nuevo ingrediente validando la unicidad del nombre.
        """
        async with UnitOfWork() as uow:
            # Validar unicidad del nombre (case-insensitive)
            existing = uow.ingredientes.get_by_nombre(data.nombre, include_deleted=False)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya existe un ingrediente activo con este nombre"
                )

            nuevo_ing = Ingrediente(
                nombre=data.nombre,
                es_alergeno=data.es_alergeno
            )
            created = uow.ingredientes.create(nuevo_ing)
            return created

    async def update_ingrediente(self, ingrediente_id: int, data: IngredienteUpdate) -> Ingrediente:
        """
        Actualiza un ingrediente existente validando la unicidad del nuevo nombre.
        """
        async with UnitOfWork() as uow:
            ingrediente = uow.ingredientes.get_by_id(ingrediente_id)
            if not ingrediente or ingrediente.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Ingrediente no encontrado"
                )

            # Validar nuevo nombre (si cambió)
            if data.nombre is not None and data.nombre != ingrediente.nombre:
                existing = uow.ingredientes.get_by_nombre(data.nombre, include_deleted=False)
                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Ya existe otro ingrediente activo con este nombre"
                    )
                ingrediente.nombre = data.nombre

            if data.es_alergeno is not None:
                ingrediente.es_alergeno = data.es_alergeno

            ingrediente.updated_at = datetime.utcnow()
            updated = uow.ingredientes.update(ingrediente)
            return updated

    async def delete_ingrediente(self, ingrediente_id: int) -> None:
        """
        Aplica soft delete desasociando de productos y verificando integridad relacional.
        """
        async with UnitOfWork() as uow:
            ingrediente = uow.ingredientes.get_by_id(ingrediente_id)
            if not ingrediente or ingrediente.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Ingrediente no encontrado"
                )

            # Validar integridad: evitar eliminación si está asociado a productos activos
            from app.modules.productos.model import Producto, ProductoIngrediente
            statement = select(Producto).join(ProductoIngrediente).where(
                ProductoIngrediente.ingrediente_id == ingrediente_id,
                Producto.deleted_at == None
            )
            product_using_it = uow.session.exec(statement).first()
            if product_using_it:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No se puede eliminar el ingrediente '{ingrediente.nombre}' porque está asociado al producto activo '{product_using_it.nombre}'"
                )

            # Aplicar soft delete
            uow.ingredientes.delete(ingrediente, soft=True)
