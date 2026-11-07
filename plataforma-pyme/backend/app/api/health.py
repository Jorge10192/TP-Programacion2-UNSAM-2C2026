"""Salud del proceso (liveness); no verifica aun la base de datos.

Readiness y comprobacion de PostgreSQL se agregaran en E2-0.2/0.3.
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
