"""E2-6 B: validacion estricta de ventas y pagos declarados, sin acreditacion externa."""
from datetime import datetime
import hashlib
import json
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator, model_validator

from app.modules.catalog.schemas import clean_text
from app.modules.purchases.schemas import line_total_cents
from app.modules.purchases.receipt_schemas import BalanceAfterView

MAX_CENTS = 99_999_999_999
Cents = Annotated[StrictInt, Field(ge=0, le=MAX_CENTS)]
Milli = Annotated[StrictInt, Field(ge=1, le=999_999_999)]
PaymentMethod = Literal[
    "EFECTIVO", "TRANSFERENCIA", "CUENTA_DNI", "TARJETA", "MERCADO_PAGO_DECLARADO",
]


class SaleLineInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    catalog_item_id: UUID
    quantity_milli: Milli
    unit_price_cents: Cents

    @model_validator(mode="after")
    def validate_amount(self):
        line_total_cents(self.quantity_milli, self.unit_price_cents)
        return self


class SalePaymentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    method: PaymentMethod
    amount_cents: Annotated[StrictInt, Field(ge=1, le=MAX_CENTS)]
    reference: str = Field(default="", max_length=240)

    @field_validator("reference")
    @classmethod
    def normalize_reference(cls, value: str) -> str:
        return clean_text(value, minimum=0, maximum=120, label="reference")


class CreateSaleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    location_id: UUID | None = None
    discount_cents: Cents = 0
    notes: str = Field(default="", max_length=1000)
    lines: list[SaleLineInput] = Field(min_length=1, max_length=30)
    payments: list[SalePaymentInput] = Field(min_length=1, max_length=6)

    @field_validator("notes")
    @classmethod
    def normalize_notes(cls, value: str) -> str:
        return clean_text(value, minimum=0, maximum=500, label="notes")

    @model_validator(mode="after")
    def validate_totals(self):
        subtotal = sum(line_total_cents(x.quantity_milli, x.unit_price_cents)
                       for x in self.lines)
        if not 1 <= subtotal <= MAX_CENTS:
            raise ValueError("Subtotal fuera de rango")
        total = subtotal - self.discount_cents
        if not 1 <= total <= MAX_CENTS:
            raise ValueError("El total debe ser positivo")
        if sum(payment.amount_cents for payment in self.payments) != total:
            raise ValueError("Los pagos declarados deben sumar el total exacto")
        return self

    def payload_digest(self) -> str:
        canonical = json.dumps(self.model_dump(mode="json"), ensure_ascii=False,
                               sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class SaleLineView(BaseModel):
    id: UUID
    line_number: int
    catalog_item_id: UUID
    description_snapshot: str
    kind_snapshot: Literal["BIEN", "SERVICIO"]
    unit_snapshot: str
    sku_snapshot: str
    quantity_milli: int
    unit_price_cents: int
    line_total_cents: int

    @classmethod
    def from_record(cls, record: object) -> "SaleLineView":
        return cls.model_validate({field: getattr(record, field) for field in cls.model_fields})


class SalePaymentView(BaseModel):
    id: UUID
    payment_number: int
    method: PaymentMethod
    amount_cents: int
    reference: str

    @classmethod
    def from_record(cls, record: object) -> "SalePaymentView":
        return cls.model_validate({field: getattr(record, field) for field in cls.model_fields})


class SaleView(BaseModel):
    id: UUID
    business_id: UUID
    location_id: UUID | None
    request_id: UUID
    status: Literal["CONFIRMADA"]
    subtotal_cents: int
    discount_cents: int
    total_cents: int
    notes: str
    created_by_id: UUID
    created_at: datetime
    balances_after: list[BalanceAfterView]
    lines: list[SaleLineView]
    payments: list[SalePaymentView]

    @classmethod
    def from_records(cls, sale: object, lines: list[object],
                     payments: list[object]) -> "SaleView":
        return cls(
            id=sale.id, business_id=sale.business_id, location_id=sale.location_id,
            request_id=sale.request_id, status=sale.status,
            subtotal_cents=sale.subtotal_cents, discount_cents=sale.discount_cents,
            total_cents=sale.total_cents, notes=sale.notes,
            created_by_id=sale.created_by_id, created_at=sale.created_at,
            balances_after=sale.balances_after,
            lines=[SaleLineView.from_record(x) for x in lines],
            payments=[SalePaymentView.from_record(x) for x in payments],
        )
