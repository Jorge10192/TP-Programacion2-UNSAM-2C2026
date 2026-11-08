"""E2-4 C: contrato estructural de Compras y snapshots.

No se exige ubicación para registrar y ninguna de estas tablas crea stock.
"""
from sqlalchemy import BigInteger, CheckConstraint, ForeignKeyConstraint, UniqueConstraint

from app.infrastructure.models import Purchase, PurchaseLine
from app.infrastructure.models.base import Base


def test_purchase_models_and_separate_receipt_stock_are_registered() -> None:
    assert Base.metadata.tables["purchases"] is Purchase.__table__
    assert Base.metadata.tables["purchase_lines"] is PurchaseLine.__table__
    assert "purchase_receipts" in Base.metadata.tables
    assert "stock_balances" in Base.metadata.tables
    assert "stock_movements" in Base.metadata.tables
    assert "location_id" not in Purchase.__table__.c


def test_purchase_document_stores_business_snapshot_and_idempotency() -> None:
    t = Purchase.__table__
    assert {c.name for c in t.columns} == {
        "id", "business_id", "request_id", "request_sha256", "supplier_id", "supplier_name_snapshot",
        "purchased_on", "status", "total_cents", "reference", "notes",
        "created_by_id", "created_at",
    }
    assert t.c.supplier_id.nullable
    assert not t.c.business_id.nullable
    assert not t.c.created_by_id.nullable
    assert not t.c.request_id.nullable
    assert isinstance(t.c.total_cents.type, BigInteger)
    assert "location_id" not in t.c
    keys = {k.name: tuple(c.name for c in k.columns)
            for k in t.constraints if isinstance(k, UniqueConstraint)}
    assert keys["uq_purchases_business_request"] == ("business_id", "request_id")
    assert keys["uq_purchases_business_id_id"] == ("business_id", "id")


def test_purchase_supplier_and_author_are_tenant_constrained() -> None:
    fks = {c.name: c for c in Purchase.__table__.constraints
           if isinstance(c, ForeignKeyConstraint)}
    assert set(fks) == {
        "fk_purchases_business",
        "fk_purchases_supplier_tenant",
        "fk_purchases_creator_membership_tenant",
    }
    assert [c.target_fullname for c in fks["fk_purchases_supplier_tenant"].elements] == [
        "suppliers.business_id", "suppliers.id",
    ]
    assert [c.target_fullname for c in fks["fk_purchases_creator_membership_tenant"].elements] == [
        "memberships.business_id", "memberships.user_id",
    ]
    assert all(fk.ondelete == "RESTRICT" for fk in fks.values())


def test_purchase_line_is_ordered_historical_tenant_snapshot() -> None:
    t = PurchaseLine.__table__
    assert {c.name for c in t.columns} == {
        "id", "business_id", "purchase_id", "line_number", "catalog_item_id",
        "description_snapshot", "kind_snapshot", "unit_snapshot", "sku_snapshot",
        "quantity_milli", "unit_cost_cents", "line_total_cents",
    }
    assert t.c.catalog_item_id.nullable
    for field in ("quantity_milli", "unit_cost_cents", "line_total_cents"):
        assert isinstance(t.c[field].type, BigInteger)
        assert not t.c[field].nullable
    fks = {c.name: c for c in t.constraints if isinstance(c, ForeignKeyConstraint)}
    assert set(fks) == {
        "fk_purchase_lines_purchase_tenant", "fk_purchase_lines_catalog_tenant",
    }
    assert [c.target_fullname for c in fks["fk_purchase_lines_purchase_tenant"].elements] == [
        "purchases.business_id", "purchases.id",
    ]
    assert [c.target_fullname for c in fks["fk_purchase_lines_catalog_tenant"].elements] == [
        "catalog_items.business_id", "catalog_items.id",
    ]
    assert all(c.ondelete == "RESTRICT" for c in fks.values())


def test_purchase_lines_enforce_scale_kind_and_half_up_in_db() -> None:
    checks = {c.name: str(c.sqltext)
              for c in PurchaseLine.__table__.constraints
              if isinstance(c, CheckConstraint)}
    assert "BETWEEN 1 AND 30" in checks["ck_purchase_lines_line_number"]
    assert "CONCEPTO" in checks["ck_purchase_lines_kind_unit_catalog"]
    assert "SERVICIO" in checks["ck_purchase_lines_kind_unit_catalog"]
    assert "quantity_milli % 1000 = 0" in checks["ck_purchase_lines_discrete_quantity"]
    assert "::numeric" in checks["ck_purchase_lines_half_up_total"]
    assert "floor(" in checks["ck_purchase_lines_half_up_total"]
    purchase_checks = {c.name: str(c.sqltext)
                       for c in Purchase.__table__.constraints
                       if isinstance(c, CheckConstraint)}
    assert "CERRADA_SIN_RECEPCION" in purchase_checks["ck_purchases_status"]
    assert "supplier_name_snapshot" in purchase_checks["ck_purchases_supplier_snapshot_optional"]
    assert "request_sha256" in purchase_checks["ck_purchases_request_sha256"]
