"""E2-6 A: contratos estructurales de Venta, DetalleVenta y PagoDeclarado.

No se afirma que exista API POST hasta E2-6 B/C.
"""
from sqlalchemy import BigInteger, CheckConstraint, ForeignKeyConstraint, UniqueConstraint

from app.infrastructure.models import Sale, SaleLine, SalePayment, StockMovement
from app.infrastructure.models.base import Base


def checks(table):
    return {c.name: str(c.sqltext) for c in table.constraints
            if isinstance(c, CheckConstraint)}


def foreigns(table):
    return {c.name: c for c in table.constraints
            if isinstance(c, ForeignKeyConstraint)}


def uniques(table):
    return {c.name: tuple(col.name for col in c.columns)
            for c in table.constraints if isinstance(c, UniqueConstraint)}


def targets(constraint):
    return [x.target_fullname for x in constraint.elements]


def test_sale_models_are_registered_with_alembic_metadata():
    assert Base.metadata.tables["sales"] is Sale.__table__
    assert Base.metadata.tables["sale_lines"] is SaleLine.__table__
    assert Base.metadata.tables["sale_payments"] is SalePayment.__table__
    assert Base.metadata.tables["stock_movements"] is StockMovement.__table__


def test_sale_is_tenant_scoped_and_idempotent():
    t = Sale.__table__
    assert uniques(t)["uq_sales_business_request"] == ("business_id", "request_id")
    assert uniques(t)["uq_sales_business_id_id"] == ("business_id", "id")
    assert t.c.location_id.nullable  # servicios sin depósito
    assert not t.c.request_sha256.nullable
    assert not t.c.created_by_id.nullable
    assert targets(foreigns(t)["fk_sales_creator_membership_tenant"]) == [
        "memberships.business_id", "memberships.user_id",
    ]
    assert targets(foreigns(t)["fk_sales_location_tenant"]) == [
        "locations.business_id", "locations.id",
    ]
    for field in ("subtotal_cents", "discount_cents", "total_cents"):
        assert isinstance(t.c[field].type, BigInteger)
        assert not t.c[field].nullable
    c = checks(t)
    assert "CONFIRMADA" in c["ck_sales_status_confirmed"]
    assert "total_cents = subtotal_cents - discount_cents" in c[
        "ck_sales_positive_total_equals_subtotal_minus_discount"
    ]
    assert "BETWEEN 1" in c["ck_sales_positive_total_equals_subtotal_minus_discount"]


def test_sale_line_has_snapshots_and_half_up_sql():
    t = SaleLine.__table__
    assert uniques(t)["uq_sale_lines_business_sale_line_number"] == (
        "business_id", "sale_id", "line_number",
    )
    assert uniques(t)["uq_sale_lines_business_sale_id_id"] == (
        "business_id", "sale_id", "id",
    )
    assert targets(foreigns(t)["fk_sale_lines_catalog_tenant"]) == [
        "catalog_items.business_id", "catalog_items.id",
    ]
    assert targets(foreigns(t)["fk_sale_lines_sale_tenant"]) == [
        "sales.business_id", "sales.id",
    ]
    for field in ("quantity_milli", "unit_price_cents", "line_total_cents"):
        assert isinstance(t.c[field].type, BigInteger)
    c = checks(t)
    assert "quantity_milli % 1000 = 0" in c["ck_sale_lines_discrete_quantity"]
    assert "SERVICIO" in c["ck_sale_lines_kind_unit"]
    assert "BIEN" in c["ck_sale_lines_kind_unit"]
    assert "floor(" in c["ck_sale_lines_half_up_total"]
    assert "::numeric" in c["ck_sale_lines_half_up_total"]
    assert "BETWEEN 1 AND 30" in c["ck_sale_lines_number"]


def test_payment_is_declared_and_tenant_scoped_not_a_verified_settlement():
    t = SalePayment.__table__
    assert uniques(t)["uq_sale_payments_business_sale_number"] == (
        "business_id", "sale_id", "payment_number",
    )
    assert targets(foreigns(t)["fk_sale_payments_sale_tenant"]) == [
        "sales.business_id", "sales.id",
    ]
    assert "MERCADO_PAGO_DECLARADO" in checks(t)["ck_sale_payments_declared_method"]
    assert "BETWEEN 1 AND 6" in checks(t)["ck_sale_payments_number"]
    assert "BETWEEN 1 AND" in checks(t)["ck_sale_payments_positive_amount"]
    assert isinstance(t.c.amount_cents.type, BigInteger)
    assert "verified_at" not in t.c
    assert "financial_account_id" not in t.c  # RF-09 futuro


def test_sale_movement_has_one_origin_and_correct_line_tenant():
    t = StockMovement.__table__
    foreign = foreigns(t)["fk_stock_movements_sale_line_tenant"]
    assert targets(foreign) == [
        "sale_lines.business_id", "sale_lines.sale_id", "sale_lines.id",
    ]
    assert uniques(t)["uq_stock_movements_sale_line"] == (
        "business_id", "sale_id", "sale_line_id",
    )
    check = checks(t)["ck_stock_movements_origin_and_sign"]
    assert "VENTA_SALIDA" in check
    assert "sale_id IS NOT NULL" in check and "sale_line_id IS NOT NULL" in check
    assert "sale_id IS NULL AND sale_line_id IS NULL" in check
    assert "BETWEEN -999999999 AND -1" in check
    assert t.c.sale_id.nullable and t.c.sale_line_id.nullable
    assert t.c.receipt_id.nullable and t.c.inventory_operation_id.nullable
