from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import Session, create_engine as sqlmodel_create_engine

from app.core.config import settings

# engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = sqlmodel_create_engine(settings.DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)


def get_db() -> Generator:
    with Session(engine) as session:
        yield session
