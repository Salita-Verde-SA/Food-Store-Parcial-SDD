from typing import Generic, TypeVar, Type, Optional, List, Any
from sqlmodel import SQLModel, Session, select, func

T = TypeVar("T", bound=SQLModel)


class BaseRepository(Generic[T]):
    def __init__(self, model: Type[T], session: Session):
        self.model = model
        self.session = session

    def get_by_id(self, id: Any) -> Optional[T]:
        """Obtiene un registro por ID. Filtra eliminados por defecto."""
        query = select(self.model).where(self.model.id == id)
        # Si el modelo tiene deleted_at, filtrar
        if hasattr(self.model, "deleted_at"):
            query = query.where(self.model.deleted_at == None)
        return self.session.exec(query).first()

    def list_all(self, skip: int = 0, limit: int = 100, include_deleted: bool = False) -> List[T]:
        """Lista registros con paginación."""
        query = select(self.model).offset(skip).limit(limit)
        if not include_deleted and hasattr(self.model, "deleted_at"):
            query = query.where(self.model.deleted_at == None)
        return self.session.exec(query).all()

    def count_total(self, include_deleted: bool = False) -> int:
        """Cuenta el total de registros."""
        query = select(func.count()).select_from(self.model)
        if not include_deleted and hasattr(self.model, "deleted_at"):
            query = query.where(self.model.deleted_at == None)
        return self.session.exec(query).one()

    def create(self, obj: T) -> T:
        """Persiste un nuevo objeto."""
        self.session.add(obj)
        self.session.flush()  # Para obtener el ID sin commitear la transacción
        self.session.refresh(obj)
        return obj

    def update(self, obj: T) -> T:
        """Actualiza un objeto existente."""
        self.session.add(obj)
        self.session.flush()
        self.session.refresh(obj)
        return obj

    def delete(self, obj: T, soft: bool = True) -> None:
        """Elimina un objeto (soft delete por defecto)."""
        if soft and hasattr(obj, "deleted_at"):
            from datetime import datetime
            setattr(obj, "deleted_at", datetime.utcnow())
            self.session.add(obj)
        else:
            self.session.delete(obj)
        self.session.flush()
