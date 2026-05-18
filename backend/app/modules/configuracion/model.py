from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Configuracion(SQLModel, table=True):
    __tablename__ = "configuracion"

    key: str = Field(primary_key=True, max_length=50)
    value: str = Field(max_length=255, nullable=False)
    description: Optional[str] = Field(default=None, max_length=255)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
