"""Shared domain primitives and validation helpers."""

from app.domain.common.exceptions import (
    DomainError,
    FechaInvalidaError,
    IdentificadorInvalidoError,
    NombreInvalidoError,
    VersionInvalidaError,
)

__all__ = [
    "DomainError",
    "FechaInvalidaError",
    "IdentificadorInvalidoError",
    "NombreInvalidoError",
    "VersionInvalidaError",
]
