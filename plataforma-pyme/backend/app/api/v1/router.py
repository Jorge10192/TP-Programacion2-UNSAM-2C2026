"""Punto de montaje para los recursos de negocio de la API v1.

Los endpoints del dominio se incorporan desde E2-1, sin crear recursos
ficticios ni mezclar la ruta tecnica /health con /api/v1.
"""

from fastapi import APIRouter

from app.modules.auth.router import router as auth_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth_router)
