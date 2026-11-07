"""Readiness de PostgreSQL, separado de liveness (/health).

Un fallo de conexion devuelve 503 sin exponer secretos.
"""
import logging
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.infrastructure.db import get_engine


logger = logging.getLogger(__name__)
router = APIRouter(tags=["infraestructura"])


class ReadinessResponse(BaseModel):
    status: Literal["ready"]
    database: Literal["ok"]


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    responses={503: {"description": "PostgreSQL no disponible"}},
    summary="Disponibilidad de PostgreSQL",
)
def ready() -> ReadinessResponse:
    try:
        with get_engine().connect() as connection:
            if connection.execute(text("SELECT 1")).scalar_one() != 1:
                raise ValueError("Unexpected readiness result")
    except (SQLAlchemyError, OSError, ValueError) as exc:
        logger.warning("Readiness fallo: %s", type(exc).__name__)
        raise HTTPException(
            status_code=503, detail="Database unavailable"
        ) from None
    return ReadinessResponse(status="ready", database="ok")
