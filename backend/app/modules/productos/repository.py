from sqlmodel import Session, select, func
from typing import List, Tuple, Optional
from sqlalchemy.orm import selectinload
from app.core.repository import BaseRepository
from app.modules.productos.model import Producto, ProductoCategoria, ProductoIngrediente


class ProductoRepository(BaseRepository[Producto]):
    def __init__(self, session: Session):
        super().__init__(Producto, session)

    def get_by_id(self, id: int) -> Optional[Producto]:
        """Obtiene un producto por ID con carga ansiosa de relaciones."""
        query = select(Producto).where(Producto.id == id).where(Producto.deleted_at == None)
        query = query.options(
            selectinload(Producto.categorias),
            selectinload(Producto.ingredientes)
        )
        return self.session.exec(query).first()

    def get_by_nombre(self, nombre: str, include_deleted: bool = False) -> Optional[Producto]:
        """Obtiene un producto por su nombre."""
        query = select(Producto).where(Producto.nombre == nombre)
        if not include_deleted:
            query = query.where(Producto.deleted_at == None)
        return self.session.exec(query).first()

    def list_active_products(
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
        Consulta avanzada del catálogo con paginación, filtros de categorías,
        búsqueda ILIKE y exclusión de alérgenos con subconsulta SQL NOT EXISTS.
        """
        query = select(Producto)
        count_query = select(func.count()).select_from(Producto)

        # Filtro de soft delete
        if not include_deleted:
            query = query.where(Producto.deleted_at == None)
            count_query = count_query.where(Producto.deleted_at == None)

        # Filtro de disponibilidad (para catálogo público)
        if solo_disponibles:
            query = query.where(Producto.disponible == True)
            count_query = count_query.where(Producto.disponible == True)

        # Filtro de categoría (cruza tabla pivote M2M)
        if category_id is not None:
            query = query.join(ProductoCategoria).where(ProductoCategoria.categoria_id == category_id)
            count_query = count_query.join(ProductoCategoria).where(ProductoCategoria.categoria_id == category_id)

        # Búsqueda por coincidencia de texto (ILIKE)
        if search_query:
            query = query.where(Producto.nombre.ilike(f"%{search_query}%"))
            count_query = count_query.where(Producto.nombre.ilike(f"%{search_query}%"))

        # Motor de exclusión de alérgenos via NOT EXISTS
        if exclude_allergens:
            subq = select(ProductoIngrediente.producto_id).where(
                ProductoIngrediente.producto_id == Producto.id,
                ProductoIngrediente.ingrediente_id.in_(exclude_allergens)
            )
            query = query.where(~subq.exists())
            count_query = count_query.where(~subq.exists())

        # Obtener total para metadatos de paginación
        total = self.session.exec(count_query).one()

        # Ordenar por nombre, paginar y ejecutar con carga ansiosa de colecciones
        query = query.order_by(Producto.nombre).offset(skip).limit(limit)
        query = query.options(
            selectinload(Producto.categorias),
            selectinload(Producto.ingredientes)
        )
        productos = self.session.exec(query).all()

        return productos, total
