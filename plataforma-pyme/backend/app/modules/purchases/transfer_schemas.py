"""E2-5 B (CU-09): contrato estricto de traslado, sin intervención directa del saldo."""
from datetime import datetime
import hashlib
import json
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator, model_validator

from app.modules.purchases.receipt_schemas import InventoryMovementView


class TransferStockRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    catalog_item_id: UUID
    source_location_id: UUID
    destination_location_id: UUID
    quantity_milli: StrictInt = Field(ge=1, le=999_999_999)
    reason: str = Field(min_length=3, max_length=500)

    @field_validator("reason")
    @classmethod
    def normalize_reason(cls, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        if not 3 <= len(cleaned) <= 500 or any(ord(c) < 32 for c in cleaned):
            raise ValueError("Motivo de traslado invalido")
        return cleaned

    @model_validator(mode="after")
    def distinct_locations(self):
        if self.source_location_id == self.destination_location_id:
            raise ValueError("Origen y destino deben ser distintos")
        return self

    def payload_digest(self) -> str:
        canonical = json.dumps(
            self.model_dump(mode="json"), sort_keys=True,
            separators=(",", ":"), ensure_ascii=False,
        )
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class StockTransferView(BaseModel):
    id: UUID
    business_id: UUID
    catalog_item_id: UUID
    unit_snapshot: str
    quantity_milli: int
    source_location_id: UUID
    destination_location_id: UUID
    reason: str
    actor_id: UUID
    created_at: datetime
    movements: list[InventoryMovementView]

    @classmethod
    def from_records(cls, operation: object, movements: list[object]) -> "StockTransferView":
        return cls(
            id=operation.id,
            business_id=operation.business_id,
            catalog_item_id=operation.catalog_item_id,
            unit_snapshot=operation.unit_snapshot,
            quantity_milli=operation.quantity_milli,
            source_location_id=operation.source_location_id,
            destination_location_id=operation.destination_location_id,
            reason=operation.reason,
            actor_id=operation.actor_id,
            created_at=operation.created_at,
            movements=[InventoryMovementView.from_record(row) for row in movements],
        )
