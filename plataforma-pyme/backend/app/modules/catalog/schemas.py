"""Contratos estrictos RF-04, compatibles con la DEMO pero protegidos por servidor."""
from datetime import datetime
import re
import unicodedata
from typing import Annotated, Literal
from uuid import UUID

from pydantic import (
    BaseModel, ConfigDict, Field, StrictBool, StrictInt,
    field_validator, model_validator,
)

CatalogKind = Literal["ELABORADO", "REVENTA", "INSUMO", "SERVICIO"]
CatalogUnit = Literal[
    "UNIDAD", "GRAMO", "KILOGRAMO", "MILILITRO", "LITRO",
    "PAQUETE", "CAJA", "SERVICIO",
]
MoneyCents = Annotated[StrictInt, Field(ge=0, le=99_999_999_999)]


def clean_text(value: str, *, minimum: int, maximum: int, label: str) -> str:
    """Evita variantes Unicode triviales y espacios duplicados en las fichas."""
    normalized = " ".join(unicodedata.normalize("NFKC", value).split())
    if len(normalized) < minimum or len(normalized) > maximum:
        raise ValueError(f"{label} debe tener entre {minimum} y {maximum} caracteres")
    if any(unicodedata.category(char).startswith("C") for char in normalized):
        raise ValueError(f"{label} contiene caracteres de control")
    return normalized


def normalized_name_key(name: str) -> str:
    key = clean_text(name, minimum=2, maximum=90, label="Nombre").casefold()
    if len(key) > 90:
        raise ValueError("Nombre normalizado supera 90 caracteres")
    return key


def normalized_sku(value: str | None) -> str | None:
    """Vacío o null equivalen a SKU ausente (permite varios sin SKU por tenant)."""
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("El SKU debe ser texto o null")
    sku = unicodedata.normalize("NFKC", value).strip().upper()
    if not sku:
        return None
    if not re.fullmatch(r"[A-Z0-9._-]{1,32}", sku):
        raise ValueError("SKU: máximo 32 caracteres ASCII, letras, números, . _ -")
    return sku


def ensure_kind_unit(kind: str, unit: str) -> None:
    if (kind == "SERVICIO") != (unit == "SERVICIO"):
        raise ValueError("La unidad SERVICIO es exclusiva de los artículos SERVICIO")


class CreateCatalogItemRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=180)
    kind: CatalogKind
    category: str = Field(default="General", max_length=120)
    sku: str | None = None
    unit: CatalogUnit
    description: str = Field(default="", max_length=900)
    observations: str = Field(default="", max_length=1200)
    sellable: StrictBool
    price_cents: MoneyCents | None = None
    reference_cost_cents: MoneyCents | None = None

    @field_validator("name", "category", "description", "observations")
    @classmethod
    def clean_strings(cls, value: str, info) -> str:
        limits = {
            "name": (2, 90), "category": (2, 60),
            "description": (0, 450), "observations": (0, 600),
        }
        a, b = limits[info.field_name]
        return clean_text(value, minimum=a, maximum=b, label=info.field_name)

    @field_validator("sku")
    @classmethod
    def clean_sku(cls, value: str | None) -> str | None:
        return normalized_sku(value)

    @model_validator(mode="after")
    def kind_matches_unit(self):
        ensure_kind_unit(self.kind, self.unit)
        normalized_name_key(self.name)
        return self


class UpdateCatalogItemRequest(BaseModel):
    """PATCH parcial: estado se administra por /status, nunca por esta ruta."""
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, max_length=180)
    kind: CatalogKind | None = None
    category: str | None = Field(default=None, max_length=120)
    sku: str | None = None
    unit: CatalogUnit | None = None
    description: str | None = Field(default=None, max_length=900)
    observations: str | None = Field(default=None, max_length=1200)
    sellable: StrictBool | None = None
    price_cents: MoneyCents | None = None
    reference_cost_cents: MoneyCents | None = None

    @field_validator("name", "category", "description", "observations")
    @classmethod
    def clean_strings(cls, value: str | None, info) -> str | None:
        if value is None:
            return value
        limits = {
            "name": (2, 90), "category": (2, 60),
            "description": (0, 450), "observations": (0, 600),
        }
        a, b = limits[info.field_name]
        return clean_text(value, minimum=a, maximum=b, label=info.field_name)

    @field_validator("sku")
    @classmethod
    def clean_sku(cls, value: str | None) -> str | None:
        return normalized_sku(value)

    @model_validator(mode="after")
    def nonempty_no_null_required(self):
        if not self.model_fields_set:
            raise ValueError("La edición debe tener al menos un campo")
        nullable = {"sku", "price_cents", "reference_cost_cents"}
        for field in self.model_fields_set:
            if field not in nullable and getattr(self, field) is None:
                raise ValueError(f"{field} no puede ser null")
        if "name" in self.model_fields_set:
            normalized_name_key(self.name)
        return self


class ChangeCatalogStatusRequest(BaseModel):
    """Cambio explícito de estado, sin mutación de SKU ni de atributos protegidos."""
    model_config = ConfigDict(extra="forbid")
    status: Literal["ACTIVO", "INACTIVO"]


class CatalogItemView(BaseModel):
    id: UUID
    business_id: UUID
    name: str
    kind: CatalogKind
    item_type: Literal["BIEN", "SERVICIO"]
    category: str
    sku: str | None
    unit: CatalogUnit
    description: str
    observations: str
    sellable: bool
    price_cents: int | None
    reference_cost_cents: int | None
    status: Literal["ACTIVO", "INACTIVO"]
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_record(cls, row: object) -> "CatalogItemView":
        return cls(
            id=row.id, business_id=row.business_id, name=row.name,
            kind=row.kind, item_type=row.item_type,
            category=row.category, sku=row.sku, unit=row.unit,
            description=row.description, observations=row.observations,
            sellable=row.sellable, price_cents=row.price_cents,
            reference_cost_cents=row.reference_cost_cents,
            status=row.status, created_at=row.created_at,
            updated_at=row.updated_at,
        )
