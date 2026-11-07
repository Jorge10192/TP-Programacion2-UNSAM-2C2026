"""Salud del proceso (liveness); no consulta la base de datos.

Readiness y conectividad PostgreSQL se consultan mediante GET /ready.
"""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["infraestructura"])


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: Literal["asistente-pyme-api"]


@router.get("/health", response_model=HealthResponse, summary="Estado del proceso")
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="asistente-pyme-api")
