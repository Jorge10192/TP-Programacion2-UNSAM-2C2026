from datetime import datetime, timezone
from uuid import UUID

from app.domain.organization.errors import (
    FechaInvalidaError,
    IdentificadorInvalidoError,
    NombreInvalidoError,
    VersionInvalidaError,
)


def require_uuid4(value: UUID, *, field_name: str) -> UUID:
    """Validate and return a UUIDv4 entity identifier."""
    if not isinstance(value, UUID) or value.version != 4:
        raise IdentificadorInvalidoError(f"{field_name} debe ser un UUIDv4.")
    return value


def normalize_required_text(value: str, *, field_name: str) -> str:
    """Trim a required text value and reject blank content."""
    if not isinstance(value, str):
        raise NombreInvalidoError(f"{field_name} debe ser texto.")

    normalized = value.strip()
    if not normalized:
        raise NombreInvalidoError(f"{field_name} no puede estar vacío.")
    return normalized


def normalize_optional_text(value: str | None, *, field_name: str) -> str | None:
    """Trim optional text and canonicalize blank content to None."""
    if value is None:
        return None
    if not isinstance(value, str):
        raise NombreInvalidoError(f"{field_name} debe ser texto o None.")

    normalized = value.strip()
    return normalized or None


def normalize_utc_datetime(value: datetime, *, field_name: str) -> datetime:
    """Require a timezone-aware instant and normalize it to UTC."""
    if not isinstance(value, datetime) or value.tzinfo is None or value.utcoffset() is None:
        raise FechaInvalidaError(f"{field_name} debe incluir zona horaria.")
    return value.astimezone(timezone.utc)


def require_version(value: int) -> int:
    """Validate an optimistic concurrency version."""
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise VersionInvalidaError("version debe ser un entero mayor o igual a 1.")
    return value
