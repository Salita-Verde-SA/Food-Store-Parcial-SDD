from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ConfiguracionRead(BaseModel):
    key: str = Field(..., max_length=50)
    value: str = Field(..., max_length=255)
    description: Optional[str] = Field(None, max_length=255)
    updated_at: datetime

    class Config:
        from_attributes = True


class ConfiguracionUpdate(BaseModel):
    value: str = Field(..., max_length=255)
    description: Optional[str] = Field(None, max_length=255)
