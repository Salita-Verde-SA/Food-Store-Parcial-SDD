from sqlmodel import Session, select, func
from typing import List, Optional
from app.core.repository import BaseRepository
from app.modules.ingredientes.model import Ingrediente


class IngredienteRepository(BaseRepository[Ingrediente]):
    def __init__(self, session: Session):
        super().__init__(Ingrediente, session)

    def get_by_nombre(self, nombre: str, include_deleted: bool = False) -> Optional[Ingrediente]:
        """Obtiene un ingrediente por su nombre (opcionalmente incluye borrados lógicos)."""
        query = select(Ingrediente).where(Ingrediente.nombre == nombre)
        if not include_deleted:
            query = query.where(Ingrediente.deleted_at == None)
        return self.session.exec(query).first()

    def list_all_paginated(
        self, 
        skip: int = 0, 
        limit: int = 100, 
        es_alergeno: Optional[bool] = None, 
        include_deleted: bool = False
    ) -> List[Ingrediente]:
        """Lista ingredientes con paginación y filtro opcional por alérgeno."""
        query = select(Ingrediente).offset(skip).limit(limit)
        if not include_deleted:
            query = query.where(Ingrediente.deleted_at == None)
        if es_alergeno is not None:
            query = query.where(Ingrediente.es_alergeno == es_alergeno)
        return self.session.exec(query).all()

    def count_ingredients(self, es_alergeno: Optional[bool] = None, include_deleted: bool = False) -> int:
        """Cuenta el total de ingredientes con filtros."""
        query = select(func.count()).select_from(Ingrediente)
        if not include_deleted:
            query = query.where(Ingrediente.deleted_at == None)
        if es_alergeno is not None:
            query = query.where(Ingrediente.es_alergeno == es_alergeno)
        return self.session.exec(query).one()
