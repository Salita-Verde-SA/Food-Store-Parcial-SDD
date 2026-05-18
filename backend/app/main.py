from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.errors import setup_error_handlers
from app.core.limiter import limiter
from app.modules.auth.router import router as auth_router
from app.modules.categorias.router import router as categorias_router
from app.modules.productos.router import router as productos_router
from app.modules.ingredientes.router import router as ingredientes_router
from app.modules.usuarios.router import router as usuarios_router
from app.modules.pedidos.router import router as pedidos_router
from app.modules.pagos.router import router as pagos_router

def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json"
    )

    # CORS - Soporte para puertos típicos en desarrollo local (5173 al 5176)
    origins = [
      "http://localhost:5173", "http://127.0.0.1:5173",
      "http://localhost:5174", "http://127.0.0.1:5174",
      "http://localhost:5175", "http://127.0.0.1:5175",
      "http://localhost:5176", "http://127.0.0.1:5176"
    ]
    if settings.BACKEND_CORS_ORIGINS:
        origins.extend([i.strip() for i in settings.BACKEND_CORS_ORIGINS.split(",") if i.strip()])
    
    # Eliminar duplicados de forma segura
    origins = list(set(origins))

    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Rate Limiting
    application.state.limiter = limiter
    application.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Global Error Handlers (RFC 7807)
    setup_error_handlers(application)

    # Routers
    application.include_router(auth_router, prefix=settings.API_V1_STR)
    application.include_router(categorias_router, prefix=settings.API_V1_STR)
    application.include_router(productos_router, prefix=settings.API_V1_STR)
    application.include_router(ingredientes_router, prefix=settings.API_V1_STR)
    application.include_router(usuarios_router, prefix=settings.API_V1_STR)
    application.include_router(pedidos_router, prefix=settings.API_V1_STR)
    application.include_router(pagos_router, prefix=settings.API_V1_STR)

    # Base Root
    @application.get("/")
    async def root():
        return {"message": "Welcome to Food Store API", "docs": "/docs"}

    return application


app = create_application()
