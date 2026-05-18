from typing import List, Union
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Food Store API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # DATABASE
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/foodstore"

    # SECURITY
    SECRET_KEY: str = "CHANGE_ME_SECRET_KEY_FOR_JWT_SIGNING"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    BACKEND_CORS_ORIGINS: str = ""

    # MERCADO PAGO
    MP_ACCESS_TOKEN: str = "TEST-MP-TOKEN"
    MP_NOTIFICATION_URL: str = "http://localhost:8000/api/v1/pagos/webhook"

    # SEED DATA
    ADMIN_EMAIL: str = "admin@foodstore.com"
    ADMIN_PASSWORD: str = "Admin1234!"

    model_config = SettingsConfigDict(
        case_sensitive=True, 
        env_file=".env",
        extra="ignore"
    )


settings = Settings()
