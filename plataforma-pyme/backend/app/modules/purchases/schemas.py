"""E2-4 D: contratos estrictos del documento Compra, sin recepción/stock."""
from datetime import date, datetime
import hashlib
import json
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator, model_validator

from app.modules.catalog.schemas import clean_text

PurchaseUnit = Literal[
    "UNIDAD", "GRAMO", "KILOGRAMO", "MILILITRO", "LITRO",
    "PAQUETE", "CAJA", "SERVICIO", "CONCEPTO",
]
PurchaseKind = Literal["BIEN", "SERVICIO", "CONCEPTO"]
PurchaseStatus = Literal["REGISTRADA", "RECIBIDA", "CERRADA_SIN_RECEPCION", "CANCELADA"]
Cents = Annotated[StrictInt, Field(ge=0, le=99_999_999_999)]
Milli = Annotated[StrictInt, Field(ge=1, le=999_999_999)]
DISCRETE = frozenset(("UNIDAD", "PAQUETE", "CAJA", "SERVICIO", "CONCEPTO"))
MAX_CENTS = 99_999_999_999


def line_total_cents(quantity_milli: int, unit_cost_cents: int) -> int:
    """HALF_UP al centavo POR LÍNEA con enteros, incluso para 0,5 × $0,03."""
    total = (quantity_milli * unit_cost_cents + 500) // 1000
    if total > MAX_CENTS:
        raise ValueError("Total de renglón excede el máximo permitido")
    return total


class PurchaseLineInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    catalog_item_id: UUID | None = None
    description: str = Field(min_length=2, max_length=280)
    unit: PurchaseUnit
    quantity_milli: Milli
    unit_cost_cents: Cents

    @field_validator("description")
    @classmethod
    def clean_description(cls, value: str) -> str:
        return clean_text(value, minimum=2, maximum=140, label="description")

    @model_validator(mode="after")
    def valid_unit_and_kind(self):
        if (self.catalog_item_id is None) != (self.unit == "CONCEPTO"):
            raise ValueError("Concepto libre exige unit CONCEPTO; artículos requieren su unidad")
        if self.unit in DISCRETE and self.quantity_milli % 1000:
            raise ValueError("La unidad requiere cantidades enteras (milésimas múltiplos de 1000)")
        line_total_cents(self.quantity_milli, self.unit_cost_cents)
        return self


class CreatePurchaseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    purchased_on: date
    supplier_id: UUID | None = None
    reference: str = Field(default="", max_length=140)
    notes: str = Field(default="", max_length=1000)
    lines: list[PurchaseLineInput] = Field(min_length=1, max_length=30)

    @field_validator("reference", "notes")
    @classmethod
    def clean_optional(cls, value: str, info) -> str:
        return clean_text(
            value, minimum=0,
            maximum=70 if info.field_name == "reference" else 500,
            label=info.field_name,
        )

    @model_validator(mode="after")
    def validate_date_and_total(self):
        if not date(2000, 1, 1) <= self.purchased_on <= date(2100, 12, 31):
            raise ValueError("La fecha de compra debe estar entre 2000 y 2100")
        total = sum(line_total_cents(l.quantity_milli, l.unit_cost_cents)
                    for l in self.lines)
        if total > MAX_CENTS:
            raise ValueError("Total de compra excede el máximo permitido")
        return self

    def payload_digest(self) -> str:
        canonical = json.dumps(
            self.model_dump(mode="json"), ensure_ascii=False, sort_keys=True,
            separators=(",", ":"),
        )
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class PurchaseLineView(BaseModel):
    id: UUID
    line_number: int
    catalog_item_id: UUID | None
    description_snapshot: str
    kind_snapshot: PurchaseKind
    unit_snapshot: PurchaseUnit
    sku_snapshot: str
    quantity_milli: int
    unit_cost_cents: int
    line_total_cents: int

    @classmethod
    def from_row(cls, row: object) -> "PurchaseLineView":
        return cls.model_validate({
            key: getattr(row, key)
            for key in cls.model_fields
        })


class PurchaseView(BaseModel):
    id: UUID
    business_id: UUID
    request_id: UUID
    supplier_id: UUID | None
    supplier_name_snapshot: str
    purchased_on: date
    status: PurchaseStatus
    total_cents: int
    reference: str
    notes: str
    created_by_id: UUID
    created_at: datetime
    lines: list[PurchaseLineView]

    @classmethod
    def from_records(cls, document: object, rows: list[object]) -> "PurchaseView":
        return cls(
            id=document.id, business_id=document.business_id,
            request_id=document.request_id,
            supplier_id=document.supplier_id,
            supplier_name_snapshot=document.supplier_name_snapshot,
            purchased_on=document.purchased_on, status=document.status,
            total_cents=document.total_cents, reference=document.reference,
            notes=document.notes, created_by_id=document.created_by_id,
            created_at=document.created_at,
            lines=[PurchaseLineView.from_row(row) for row in rows],
        )
