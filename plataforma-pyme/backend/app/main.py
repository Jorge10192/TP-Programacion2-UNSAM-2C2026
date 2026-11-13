"""Entrada ASGI de la API multiempresa; el frontend se publica por separado."""

from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.readiness import router as readiness_router
from app.api.v1.router import api_v1_router


def create_app() -> FastAPI:
    """Construye la aplicacion y monta sus routers publicos."""
    application = FastAPI(
        title="Asistente PyME — API",
        description=(
            "API REST de gestion multiempresa: usuarios, equipos, ubicaciones, "
            "catalogo, proveedores, compras, inventario y ventas con pagos declarados."
        ),
        version="0.1.0",
    )
    application.include_router(health_router)
    application.include_router(readiness_router)
    application.include_router(api_v1_router)
    return application


app = create_app()
