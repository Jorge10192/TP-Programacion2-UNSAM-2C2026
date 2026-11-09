"""CU-07: comando sin cantidades manuales; recepción siempre completa y de un solo destino."""
import hashlib
import json
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ReceivePurchaseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    location_id: UUID

    def digest_for(self, purchase_id: UUID) -> str:
        canonical = json.dumps(
            {"purchase_id": str(purchase_id), **self.model_dump(mode="json")},
            sort_keys=True, ensure_ascii=False, separators=(",", ":"),
        )
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class BalanceAfterView(BaseModel):
    catalog_item_id: UUID
    quantity_milli: int = Field(ge=0)
    version: int = Field(ge=1)


class StockBalanceView(BaseModel):
    business_id: UUID
    location_id: UUID
    catalog_item_id: UUID
    quantity_milli: int
    version: int
    updated_at: datetime

    @classmethod
    def from_record(cls, row: object) -> "StockBalanceView":
        return cls.model_validate({name: getattr(row, name) for name in cls.model_fields})


class StockMovementView(BaseModel):
    id: UUID
    business_id: UUID
    location_id: UUID
    catalog_item_id: UUID
    receipt_id: UUID
    purchase_line_id: UUID
    actor_id: UUID
    event_type: Literal["COMPRA_RECEPCION"]
    delta_milli: int = Field(gt=0)
    occurred_at: datetime

    @classmethod
    def from_record(cls, row: object) -> "StockMovementView":
        return cls.model_validate({name: getattr(row, name) for name in cls.model_fields})


class InventoryMovementView(BaseModel):
    """Lectura general del ledger. Los campos NULL se omiten en HTTP.

    StockMovementView continua reservado al comprobante de compra E2-4,
    conservando su forma original y los tests de compatibilidad.
    """
    id: UUID
    business_id: UUID
    location_id: UUID
    catalog_item_id: UUID
    receipt_id: UUID | None
    purchase_line_id: UUID | None
    inventory_operation_id: UUID | None
    operation_kind: str | None
    sale_id: UUID | None
    sale_line_id: UUID | None
    actor_id: UUID
    event_type: Literal[
        "COMPRA_RECEPCION", "TRASLADO_ENTRADA", "TRASLADO_SALIDA",
        "AJUSTE_ENTRADA", "AJUSTE_SALIDA", "STOCK_INICIAL",
        "VENTA_SALIDA",
    ]
    delta_milli: int
    occurred_at: datetime

    @classmethod
    def from_record(cls, row: object) -> "InventoryMovementView":
        return cls.model_validate({name: getattr(row, name) for name in cls.model_fields})


class PurchaseReceiptView(BaseModel):
    id: UUID
    business_id: UUID
    purchase_id: UUID
    location_id: UUID
    request_id: UUID
    confirmed_by_id: UUID
    confirmed_at: datetime
    purchase_status: Literal["RECIBIDA"] = "RECIBIDA"
    movements: list[StockMovementView]
    balances_after: list[BalanceAfterView]

    @classmethod
    def from_records(cls, receipt: object, movements: list[object]) -> "PurchaseReceiptView":
        return cls(
            id=receipt.id, business_id=receipt.business_id,
            purchase_id=receipt.purchase_id, location_id=receipt.location_id,
            request_id=receipt.request_id, confirmed_by_id=receipt.confirmed_by_id,
            confirmed_at=receipt.confirmed_at,
            movements=[StockMovementView.from_record(x) for x in movements],
            balances_after=[BalanceAfterView.model_validate(x) for x in receipt.balances_after],
        )
