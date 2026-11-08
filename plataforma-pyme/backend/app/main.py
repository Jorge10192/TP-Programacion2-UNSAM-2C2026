"""API multiempresa y frontend opcional del mismo origen."""

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from app.api.health import router as health_router
from app.api.readiness import router as readiness_router
from app.api.v1.router import api_v1_router
from app.frontend import mount_frontend


def create_app() -> FastAPI:
    """Construye la aplicacion y monta sus routers publicos."""
    application = FastAPI(
        title="Asistente PyME — API",
        description=(
            "Backend REST del sistema de gestion multiempresa. "
            "Identidad global, membresías y operaciones comerciales aisladas por empresa."
        ),
        version="0.2.0",
    )
    application.include_router(health_router)
    application.include_router(readiness_router)
    application.include_router(api_v1_router)
    mount_frontend(application)

    @application.exception_handler(RequestValidationError)
    async def invalid_request(request, error):
        # Pydantic's input/ctx may contain submitted passwords or other private data.
        return JSONResponse(status_code=422, content={'detail':[
            {key:value for key,value in item.items() if key in {'loc','msg','type'}}
            for item in error.errors()]})

    @application.exception_handler(OperationalError)
    async def database_unavailable(request, error):
        return JSONResponse(status_code=503,content={'detail':'Base de datos no disponible'})

    @application.middleware('http')
    async def response_headers(request, call_next):
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'same-origin'
        if request.url.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'
        return response
    return application


app = create_app()
