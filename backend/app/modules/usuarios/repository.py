from typing import Optional
from sqlmodel import select
from app.core.repository import BaseRepository
from app.modules.auth.model import Usuario


class UsuarioRepository(BaseRepository[Usuario]):
    def __init__(self, session):
        super().__init__(Usuario, session)

    def get_by_email(self, email: str) -> Optional[Usuario]:
        statement = select(Usuario).where(Usuario.email == email)
        return self.session.exec(statement).first()
