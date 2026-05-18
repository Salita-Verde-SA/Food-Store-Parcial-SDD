from fastapi import APIRouter, Depends, status, Query, HTTPException
from typing import List, Optional
from pydantic import BaseModel

from app.modules.auth.dependencies import require_role
from app.modules.productos.schemas import (
    ProductoCreate, ProductoUpdate, ProductoRead, ProductoPublicRead, ProductoStockUpdate
)
from app.modules.productos.service import ProductoService
from app.modules.productos.model import Producto

router = APIRouter(prefix="/productos", tags=["Productos"])


def get_producto_service() -> ProductoService:
    return ProductoService()


class ProductoPaginatedRead(BaseModel):
    items: List[ProductoPublicRead]
    total: int
    skip: int
    limit: int


def map_to_public_read(p: Producto) -> ProductoPublicRead:
    """
    Función helper para mapear un Producto persistido al esquema de cara al cliente público.
    Oculta el stock físico cuantitativo y computa la disponibilidad según existencias.
    """
    return ProductoPublicRead(
        id=p.id,
        nombre=p.nombre,
        descripcion=p.descripcion,
        precio=p.precio,
        disponible=p.disponible and p.stock > 0,
        imagen_url=p.imagen_url,
        categorias=p.categorias,
        ingredientes=p.ingredientes
    )


# =========================================================================
# ENDPOINTS PUBLICOS (CATALOGO DE CLIENTES)
# =========================================================================

@router.get("", response_model=ProductoPaginatedRead)
async def get_productos_catalogo(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=12, ge=1, le=100),
    category_id: Optional[int] = Query(default=None),
    search: Optional[str] = Query(default=None),
    excluirAlergenos: Optional[str] = Query(default=None, description="IDs de ingredientes alérgenos separados por comas (ej: 1,3)"),
    service: ProductoService = Depends(get_producto_service)
):
    """
    Endpoint público de catálogo para clientes.
    Retorna productos activos de forma paginada y filtrada, ocultando el stock cuantitativo exacto.
    Soporta exclusión avanzada de alérgenos.
    """
    exclude_list = []
    if excluirAlergenos:
        try:
            exclude_list = [int(x.strip()) for x in excluirAlergenos.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El parámetro 'excluirAlergenos' debe contener IDs de ingredientes separados por comas."
            )

    items, total = await service.list_products(
        skip=skip,
        limit=limit,
        category_id=category_id,
        search_query=search,
        exclude_allergens=exclude_list,
        include_deleted=False,
        solo_disponibles=True
    )

    public_items = [map_to_public_read(p) for p in items]

    return ProductoPaginatedRead(
        items=public_items,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{id}", response_model=ProductoPublicRead)
async def get_producto_detalle(
    id: int,
    service: ProductoService = Depends(get_producto_service)
):
    """
    Endpoint público para visualizar el detalle completo de un producto.
    Oculta el stock cuantitativo exacto para resguardar información comercial sensible.
    """
    producto = await service.get_producto_by_id(id)
    return map_to_public_read(producto)


# =========================================================================
# ENDPOINTS ADMINISTRATIVOS (GESTION DE STOCK Y DASHBOARD)
# =========================================================================

@router.get("/admin/all", response_model=List[ProductoRead])
async def list_productos_admin(
    include_deleted: bool = Query(default=False),
    service: ProductoService = Depends(get_producto_service),
    current_user = require_role(["ADMIN", "STOCK"])
):
    """
    Endpoint administrativo para listar todos los productos detallando stock cuantitativo exacto.
    Requiere rol ADMIN o STOCK.
    """
    items, _ = await service.list_products(
        skip=0,
        limit=1000,  # Retorna lista extendida para el panel de control
        include_deleted=include_deleted,
        solo_disponibles=False
    )
    return items


@router.get("/{id}/admin", response_model=ProductoRead)
async def get_producto_detalle_admin(
    id: int,
    service: ProductoService = Depends(get_producto_service),
    current_user = require_role(["ADMIN", "STOCK"])
):
    """
    Endpoint administrativo para obtener el detalle de edición de un producto incluyendo stock cuantitativo.
    Requiere rol ADMIN o STOCK.
    """
    return await service.get_producto_by_id(id)


@router.post("", response_model=ProductoRead, status_code=status.HTTP_201_CREATED)
async def create_producto(
    data: ProductoCreate,
    service: ProductoService = Depends(get_producto_service),
    current_user = require_role(["ADMIN", "STOCK"])
):
    """
    Crea un nuevo producto en el catálogo.
    Requiere rol ADMIN o STOCK.
    """
    return await service.create_producto(data)


@router.put("/{id}", response_model=ProductoRead)
async def update_producto(
    id: int,
    data: ProductoUpdate,
    service: ProductoService = Depends(get_producto_service),
    current_user = require_role(["ADMIN", "STOCK"])
):
    """
    Actualiza los datos básicos y relaciones multidimensionales de un producto.
    Requiere rol ADMIN o STOCK.
    """
    return await service.update_producto(id, data)


@router.patch("/{id}/stock", response_model=ProductoRead)
async def patch_producto_stock(
    id: int,
    data: ProductoStockUpdate,
    service: ProductoService = Depends(get_producto_service),
    current_user = require_role(["ADMIN", "STOCK"])
):
    """
    Realiza un ajuste físico atómico del stock. Valida que el stock resultante no sea negativo.
    Requiere rol ADMIN o STOCK.
    """
    return await service.patch_stock(id, data.cantidad)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_producto(
    id: int,
    service: ProductoService = Depends(get_producto_service),
    current_user = require_role(["ADMIN"])
):
    """
    Aplica soft delete lógico a un producto del catálogo.
    Requiere rol ADMIN.
    """
    await service.delete_producto(id)
    return None
