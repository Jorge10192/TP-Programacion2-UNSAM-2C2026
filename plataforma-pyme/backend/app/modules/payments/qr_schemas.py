"""E3-2B B2: contratos de intención QR DEMO, sin acreditación de fondos."""
import hashlib
import json
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator, model_validator

from app.modules.catalog.schemas import clean_text
from app.modules.purchases.schemas import line_total_cents
from app.modules.sales.schemas import MAX_CENTS, SaleLineInput

Cents = Annotated[StrictInt, Field(ge=0, le=MAX_CENTS)]
QrState = Literal[
    "ESPERANDO_PAGO", "CANCELADA", "EXPIRADA", "APROBADA_DEMO",
    "RECHAZADA", "INDETERMINADA", "REQUIERE_REVISION", "FINALIZADA",
]


class CreateQrIntentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    location_id: UUID | None = None
    lines: list[SaleLineInput] = Field(min_length=1, max_length=30)
    discount_cents: Cents = 0
    notes: str = Field(default="", max_length=1000)

    @field_validator("notes")
    @classmethod
    def normalize_notes(cls, text: str) -> str:
        return clean_text(text, minimum=0, maximum=500, label="notes")

    @model_validator(mode="after")
    def check_quote(self):
        ids = [line.catalog_item_id for line in self.lines]
        if len(set(ids)) != len(ids):
            raise ValueError("No se permiten artículos duplicados")
        subtotal = sum(line_total_cents(x.quantity_milli, x.unit_price_cents) for x in self.lines)
        if not 1 <= subtotal <= MAX_CENTS or not 1 <= subtotal - self.discount_cents <= MAX_CENTS:
            raise ValueError("El importe de cobro debe ser positivo y estar en rango")
        return self

    def payload_digest(self) -> str:
        raw = json.dumps(self.model_dump(mode="json"), sort_keys=True, ensure_ascii=False, separators=(",", ":"))
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class QrIntentLineView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    catalog_item_id: UUID
    line_number: int
    description_snapshot: str
    sku_snapshot: str
    kind_snapshot: Literal["BIEN", "SERVICIO"]
    unit_snapshot: str
    quantity_milli: int
    unit_price_cents: int
    line_total_cents: int


class QrIntentView(BaseModel):
    id: UUID
    business_id: UUID
    location_id: UUID | None
    request_id: UUID
    provider: Literal["MOCK_QA"]
    status: QrState
    currency: Literal["ARS"]
    reference: str
    subtotal_cents: int
    discount_cents: int
    total_cents: int
    notes: str
    created_at: datetime
    expires_at: datetime
    qr_png_data_uri: str
    sale_id: UUID | None = None
    lines: list[QrIntentLineView]

class QrSimulateRequest(BaseModel):
    """Acción exclusivamente ficticia, sin token de banco ni acreditación."""
    model_config = ConfigDict(extra="forbid")
    action: Literal["APROBAR", "RECHAZAR", "EXPIRAR", "INDETERMINAR"]


class QrPaymentEventView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    business_id: UUID
    intent_id: UUID
    event_key: UUID
    sequence: int
    action: Literal["CREAR", "CANCELAR", "APROBAR", "RECHAZAR", "EXPIRAR", "INDETERMINAR", "FINALIZAR", "REVISION"]
    from_status: str
    to_status: QrState
    actor_id: UUID
    created_at: datetime
