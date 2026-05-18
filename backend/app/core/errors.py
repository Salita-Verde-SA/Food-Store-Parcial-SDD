from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR


def setup_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "type": f"https://httpstatuses.com/{exc.status_code}",
                "title": exc.detail if isinstance(exc.detail, str) else "HTTP Exception",
                "status": exc.status_code,
                "detail": str(exc.detail),
                "instance": request.url.path,
            },
            headers=exc.headers,
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "type": "https://httpstatuses.com/500",
                "title": "Internal Server Error",
                "status": HTTP_500_INTERNAL_SERVER_ERROR,
                "detail": str(exc),
                "instance": request.url.path,
            },
        )
