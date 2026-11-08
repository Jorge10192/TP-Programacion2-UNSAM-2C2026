"""DTO de ubicaciones; el cliente nunca elige tenant, estado ni principal."""
from datetime import datetime
from typing import Literal
from urllib.parse import parse_qs, urlsplit
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator


LocationKind = Literal["LOCAL", "FERIA", "DEPOSITO", "OFICINA", "CASA", "OTRO"]


def validate_maps_link(value: str) -> str:
    """Mismas familias HTTPS aceptadas por la DEMO; no se consulta esta URL."""
    normalized = value.strip()
    if not normalized:
        return ""
    if len(normalized) > 2048 or any(c in normalized for c in "\r\n\t"):
        raise ValueError("Enlace de Maps inválido o demasiado largo")
    try:
        parsed = urlsplit(normalized)
        host = (parsed.hostname or "").lower()
        if parsed.scheme.lower() != "https" or not parsed.netloc:
            raise ValueError("Debe ser un enlace HTTPS")
        if parsed.username is not None or parsed.password is not None or parsed.port is not None:
            raise ValueError("No se admiten credenciales ni puertos")
        permitted = (
            (host in ("google.com", "www.google.com")
             and (parsed.path == "/maps" or parsed.path.startswith("/maps/")))
            or host == "maps.app.goo.gl"
            or (host == "maps.google.com"
                and (parsed.path != "/" or "q" in parse_qs(parsed.query)))
            or (host == "goo.gl" and parsed.path.startswith("/maps/"))
        )
    except ValueError as error:
        raise ValueError("Solo se admiten enlaces HTTPS propios de Google Maps") from error
    if not permitted:
        raise ValueError("Solo se admiten enlaces HTTPS propios de Google Maps")
    return normalized


class CreateLocationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=80)
    kind: LocationKind
    address: str = Field(default="", max_length=160)
    map_url: str = Field(default="", max_length=2048)
    can_sell: StrictBool
    can_store: StrictBool

    @field_validator("name", "address")
    @classmethod
    def trim_name_and_address(cls, value: str, info) -> str:
        cleaned = value.strip()
        if info.field_name == "name" and len(cleaned) < 2:
            raise ValueError("Nombre de ubicación demasiado corto")
        return cleaned

    @field_validator("map_url")
    @classmethod
    def map_link(cls, value: str) -> str:
        return validate_maps_link(value)


class LocationView(BaseModel):
    id: UUID
    business_id: UUID
    name: str
    kind: LocationKind
    address: str
    map_url: str
    can_sell: bool
    can_store: bool
    is_primary: bool
    status: Literal["ACTIVA", "PAUSADA"]
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_record(cls, record: object) -> "LocationView":
        return cls(
            id=record.id, business_id=record.business_id,
            name=record.name, kind=record.kind,
            address=record.address, map_url=record.map_url,
            can_sell=record.can_sell, can_store=record.can_store,
            is_primary=record.is_primary, status=record.status,
            created_at=record.created_at, updated_at=record.updated_at,
        )
