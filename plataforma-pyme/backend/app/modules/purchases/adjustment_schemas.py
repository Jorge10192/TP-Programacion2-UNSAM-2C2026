"""E2-5 C CU-11: ajustes justificados y stock inicial, con versión observada."""
import hashlib
import json
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator

from app.modules.purchases.receipt_schemas import InventoryMovementView


AdjustmentKind = Literal["AJUSTE_ENTRADA", "AJUSTE_SALIDA", "STOCK_INICIAL"]


class AdjustStockRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: AdjustmentKind
    catalog_item_id: UUID
    location_id: UUID
    quantity_milli: StrictInt = Field(ge=1, le=999_999_999)
    # 0 sólo es válido cuando la proyección nunca se creó; versiones 1+ son saldos existentes.
    expected_version: StrictInt = Field(ge=0, le=9_223_372_036_854_775_806)
    reason: str = Field(min_length=3, max_length=500)

    @field_validator("reason")
    @classmethod
    def normalize_reason(cls, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        if not 3 <= len(cleaned) <= 500 or any(ord(c) < 32 for c in cleaned):
            raise ValueError("Motivo de ajuste invalido")
        return cleaned

    def payload_digest(self) -> str:
        canonical = json.dumps(
            self.model_dump(mode="json"), sort_keys=True,
            separators=(",", ":"), ensure_ascii=False,
        )
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class StockAdjustmentView(BaseModel):
    id: UUID
    business_id: UUID
    kind: AdjustmentKind
    catalog_item_id: UUID
    location_id: UUID
    unit_snapshot: str
    quantity_milli: int
    reason: str
    actor_id: UUID
    created_at: datetime
    movements: list[InventoryMovementView]

    @classmethod
    def from_records(cls, record: object, movements: list[object]) -> "StockAdjustmentView":
        location_id = record.source_location_id or record.destination_location_id
        return cls(
            id=record.id, business_id=record.business_id,
            kind=record.kind, catalog_item_id=record.catalog_item_id,
            location_id=location_id, unit_snapshot=record.unit_snapshot,
            quantity_milli=record.quantity_milli, reason=record.reason,
            actor_id=record.actor_id, created_at=record.created_at,
            movements=[InventoryMovementView.from_record(row) for row in movements],
        )
