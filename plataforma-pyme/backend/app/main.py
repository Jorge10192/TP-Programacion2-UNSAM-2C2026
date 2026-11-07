"""Entrada ASGI de Asistente PyME.

E2-0.1 es intencionalmente independiente de PostgreSQL y del frontend.
La persistencia se agregara en los siguientes incrementos.
"""

from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.v1.router import api_v1_router


def create_app() -> FastAPI:
    """Construye la aplicacion y monta sus routers publicos."""
    application = FastAPI(
        title="Asistente PyME — API",
        description=(
            "Backend REST del sistema de gestion multiempresa. "
            "E2-0.1: infraestructura minima sin datos de negocio."
        ),
        version="0.1.0",
    )
    application.include_router(health_router)
    application.include_router(api_v1_router)
    return application


app = create_app()
