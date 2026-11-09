"""E2-4 E: restricciones SQL de recepción, ledger y saldos."""
from sqlalchemy import BigInteger, CheckConstraint, ForeignKeyConstraint, UniqueConstraint

from app.infrastructure.models import (
    PurchaseReceipt, StockBalance, StockMovement, Purchase, PurchaseLine,
)
from app.infrastructure.models.base import Base


def test_receipt_and_stock_are_separate_from_commercial_purchase():
    assert Base.metadata.tables["purchase_receipts"] is PurchaseReceipt.__table__
    assert Base.metadata.tables["stock_balances"] is StockBalance.__table__
    assert Base.metadata.tables["stock_movements"] is StockMovement.__table__
    assert "location_id" not in Purchase.__table__.c
    assert "receipt_id" not in PurchaseLine.__table__.c


def test_receipt_is_unique_per_purchase_and_request_per_company():
    t = PurchaseReceipt.__table__
    keys = {c.name: tuple(x.name for x in c.columns)
            for c in t.constraints if isinstance(c, UniqueConstraint)}
    assert keys["uq_purchase_receipts_business_purchase"] == ("business_id", "purchase_id")
    assert keys["uq_purchase_receipts_business_request"] == ("business_id", "request_id")
    assert keys["uq_purchase_receipts_business_id_id"] == ("business_id", "id")
    fks = {x.name: x for x in t.constraints if isinstance(x, ForeignKeyConstraint)}
    assert set(fks) == {
        "fk_purchase_receipts_business", "fk_purchase_receipts_purchase_tenant",
        "fk_purchase_receipts_location_tenant", "fk_purchase_receipts_actor_tenant",
    }
    assert all(fk.ondelete == "RESTRICT" for fk in fks.values())
    assert not t.c.request_sha256.nullable
    assert not t.c.confirmed_by_id.nullable


def test_balance_is_atomic_triplet_without_negative_amounts():
    t = StockBalance.__table__
    assert set(c.name for c in t.primary_key) == {
        "business_id", "location_id", "catalog_item_id",
    }
    assert isinstance(t.c.quantity_milli.type, BigInteger)
    assert isinstance(t.c.version.type, BigInteger)
    checks = {x.name: str(x.sqltext) for x in t.constraints if isinstance(x, CheckConstraint)}
    assert "BETWEEN 0" in checks["ck_stock_balances_quantity_nonnegative"]
    assert "BETWEEN 1" in checks["ck_stock_balances_version"]
    fks = {x.name for x in t.constraints if isinstance(x, ForeignKeyConstraint)}
    assert fks == {
        "fk_stock_balances_business", "fk_stock_balances_location_tenant",
        "fk_stock_balances_catalog_tenant",
    }


def test_receipt_movements_are_still_tenant_referenced_after_e25a():
    t = StockMovement.__table__
    fks = {x.name for x in t.constraints if isinstance(x, ForeignKeyConstraint)}
    assert fks == {
        "fk_stock_movements_business", "fk_stock_movements_location_tenant",
        "fk_stock_movements_catalog_tenant", "fk_stock_movements_receipt_tenant",
        "fk_stock_movements_line_tenant", "fk_stock_movements_actor_tenant",
        "fk_stock_movements_operation_kind_tenant",
        "fk_stock_movements_sale_line_tenant",
    }
    checks = {x.name: str(x.sqltext) for x in t.constraints if isinstance(x, CheckConstraint)}
    assert "COMPRA_RECEPCION" in checks["ck_stock_movements_origin_and_sign"]
    assert "TRASLADO_SALIDA" in checks["ck_stock_movements_origin_and_sign"]
    assert "BETWEEN -999999999 AND -1" in checks["ck_stock_movements_origin_and_sign"]
    uniques = {x.name for x in t.constraints if isinstance(x, UniqueConstraint)}
    assert "uq_stock_movements_receipt_line" in uniques
    assert t.c.receipt_id.nullable is True
    assert t.c.purchase_line_id.nullable is True
    assert t.c.inventory_operation_id.nullable is True
    assert t.c.operation_kind.nullable is True
    assert t.c.sale_id.nullable is True
    assert t.c.sale_line_id.nullable is True
    assert "VENTA_SALIDA" in checks["ck_stock_movements_origin_and_sign"]
