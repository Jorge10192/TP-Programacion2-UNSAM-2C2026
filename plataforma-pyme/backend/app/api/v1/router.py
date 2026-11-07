"""Punto de montaje para los recursos de negocio de la API v1.

Los endpoints del dominio se incorporan desde E2-1, sin crear recursos
ficticios ni mezclar la ruta tecnica /health con /api/v1.
"""

from fastapi import APIRouter

api_v1_router = APIRouter(prefix="/api/v1")
