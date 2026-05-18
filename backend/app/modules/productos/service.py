from datetime import datetime
from typing import List, Tuple, Optional
from fastapi import HTTPException, status
from decimal import Decimal
from sqlmodel import select

from app.core.uow import UnitOfWork
from app.modules.productos.model import Producto
from app.modules.categorias.model import Categoria
from app.modules.ingredientes.model import Ingrediente
from app.modules.productos.schemas import ProductoCreate, ProductoUpdate


class ProductoService:
    def __init__(self):
        pass

    async def list_products(
        self,
        skip: int = 0,
        limit: int = 12,
        category_id: Optional[int] = None,
        search_query: Optional[str] = None,
        exclude_allergens: Optional[List[int]] = None,
        include_deleted: bool = False,
        solo_disponibles: bool = True
    ) -> Tuple[List[Producto], int]:
        """
        Lista productos con filtros avanzados de catálogo, búsqueda y exclusión de alérgenos.
        """
        async with UnitOfWork() as uow:
            return uow.productos.list_active_products(
                skip=skip,
                limit=limit,
                category_id=category_id,
                search_query=search_query,
                exclude_allergens=exclude_allergens,
                include_deleted=include_deleted,
                solo_disponibles=solo_disponibles
            )

    async def get_producto_by_id(self, producto_id: int) -> Producto:
        """
        Obtiene un producto por ID con sus relaciones.
        """
        async with UnitOfWork() as uow:
            producto = uow.productos.get_by_id(producto_id)
            if not producto or producto.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Producto no encontrado"
                )
            return producto

    async def create_producto(self, data: ProductoCreate) -> Producto:
        """
        Crea un nuevo producto resolviendo atómicamente sus relaciones con categorías e ingredientes.
        """
        async with UnitOfWork() as uow:
            # 1. Validar unicidad del nombre
            existing = uow.productos.get_by_nombre(data.nombre, include_deleted=False)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya existe un producto activo con este nombre"
                )

            # 2. Inicializar producto
            nuevo_prod = Producto(
                nombre=data.nombre,
                descripcion=data.descripcion,
                precio=data.precio,
                stock=data.stock,
                disponible=data.disponible,
                imagen_url=data.imagen_url
            )

            # 3. Resolver categorías M2M
            if data.categoria_ids:
                for cat_id in data.categoria_ids:
                    cat = uow.session.get(Categoria, cat_id)
                    if not cat or cat.deleted_at is not None:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"La categoría con ID {cat_id} no existe o está eliminada"
                        )
                    nuevo_prod.categorias.append(cat)

            # 4. Resolver ingredientes M2M
            if data.ingrediente_ids:
                for ing_id in data.ingrediente_ids:
                    ing = uow.session.get(Ingrediente, ing_id)
                    if not ing or ing.deleted_at is not None:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"El ingrediente con ID {ing_id} no existe o está eliminado"
                        )
                    nuevo_prod.ingredientes.append(ing)

            created = uow.productos.create(nuevo_prod)
            return created

    async def update_producto(self, producto_id: int, data: ProductoUpdate) -> Producto:
        """
        Actualiza un producto y re-asocia relaciones multidimensionales M2M.
        """
        async with UnitOfWork() as uow:
            # 1. Obtener producto existente
            producto = uow.productos.get_by_id(producto_id)
            if not producto or producto.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Producto no encontrado"
                )

            # 2. Validar nombre modificado
            if data.nombre is not None and data.nombre != producto.nombre:
                existing = uow.productos.get_by_nombre(data.nombre, include_deleted=False)
                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Ya existe otro producto activo con este nombre"
                    )
                producto.nombre = data.nombre

            # 3. Campos básicos
            if data.descripcion is not None:
                producto.descripcion = data.descripcion
            if data.precio is not None:
                producto.precio = data.precio
            if data.stock is not None:
                producto.stock = data.stock
            if data.disponible is not None:
                producto.disponible = data.disponible
            if data.imagen_url is not None:
                producto.imagen_url = data.imagen_url

            # 4. Re-asociar categorías M2M
            if data.categoria_ids is not None:
                producto.categorias.clear()
                for cat_id in data.categoria_ids:
                    cat = uow.session.get(Categoria, cat_id)
                    if not cat or cat.deleted_at is not None:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"La categoría con ID {cat_id} no existe o está eliminada"
                        )
                    producto.categorias.append(cat)

            # 5. Re-asociar ingredientes M2M
            if data.ingrediente_ids is not None:
                producto.ingredientes.clear()
                for ing_id in data.ingrediente_ids:
                    ing = uow.session.get(Ingrediente, ing_id)
                    if not ing or ing.deleted_at is not None:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"El ingrediente con ID {ing_id} no existe o está eliminado"
                        )
                    producto.ingredientes.append(ing)

            producto.updated_at = datetime.utcnow()
            updated = uow.productos.update(producto)
            return updated

    async def patch_stock(self, producto_id: int, cantidad: int) -> Producto:
        """
        Ajuste atómico de existencias de stock, garantizando integridad física stock >= 0.
        """
        async with UnitOfWork() as uow:
            producto = uow.productos.get_by_id(producto_id)
            if not producto or producto.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Producto no encontrado"
                )

            # Validar no negatividad de stock (RN-CA05)
            nuevo_stock = producto.stock + cantidad
            if nuevo_stock < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Operación inválida: El stock resultante de '{producto.nombre}' no puede ser negativo (Stock actual: {producto.stock}, Ajuste solicitado: {cantidad})"
                )

            producto.stock = nuevo_stock
            producto.updated_at = datetime.utcnow()
            updated = uow.productos.update(producto)
            return updated

    async def delete_producto(self, producto_id: int) -> None:
        """
        Aplica soft delete al producto.
        """
        async with UnitOfWork() as uow:
            producto = uow.productos.get_by_id(producto_id)
            if not producto or producto.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Producto no encontrado"
                )

            uow.productos.delete(producto, soft=True)
