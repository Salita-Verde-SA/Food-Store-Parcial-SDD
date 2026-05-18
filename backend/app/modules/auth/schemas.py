from pydantic import BaseModel, EmailStr
from typing import List, Optional


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserSummary(BaseModel):
    id: int
    email: str
    nombre: str
    apellido: str
    roles: List[str]


class LoginResponse(TokenResponse):
    user: UserSummary
