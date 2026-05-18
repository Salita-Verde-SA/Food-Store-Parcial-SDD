from sqlmodel import SQLModel, Field


class FormaPago(SQLModel, table=True):
    codigo: str = Field(primary_key=True, max_length=20)
    nombre: str = Field(max_length=100)
    habilitado: bool = Field(default=True)
