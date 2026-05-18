from typing import Optional
from sqlmodel import select
from app.core.repository import BaseRepository
from app.modules.auth.model import RefreshToken


class AuthRepository(BaseRepository[RefreshToken]):
    def __init__(self, session):
        super().__init__(RefreshToken, session)

    def get_by_hash(self, token_hash: str) -> Optional[RefreshToken]:
        statement = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        return self.session.exec(statement).first()

    def revoke_user_tokens(self, usuario_id: int):
        statement = select(RefreshToken).where(
            RefreshToken.usuario_id == usuario_id,
            RefreshToken.revoked == False
        )
        tokens = self.session.exec(statement).all()
        for token in tokens:
            token.revoked = True
        self.session.add_all(tokens)
