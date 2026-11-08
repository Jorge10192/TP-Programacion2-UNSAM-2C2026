"""E2-4 A: contrato de metadatos SQLAlchemy de proveedores."""
from sqlalchemy import CheckConstraint, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB

from app.infrastructure.models import Supplier
from app.infrastructure.models.base import Base


def test_supplier_is_registered_without_purchases_or_stock() -> None:
    assert Base.metadata.tables["suppliers"] is Supplier.__table__
    assert "purchases" not in Base.metadata.tables
    assert "purchase_receipts" not in Base.metadata.tables
    assert "stock_balances" not in Base.metadata.tables


def test_supplier_columns_and_tenant_fk_are_explicit() -> None:
    table = Supplier.__table__
    assert set(table.c.keys()) == {
        "id", "business_id", "name", "name_key", "offerings", "contact_person",
        "phone", "whatsapp", "email", "address", "maps_url", "website",
        "instagram", "notes", "payment_methods", "promotions", "status",
        "created_at", "updated_at",
    }
    assert {c.name for c in table.primary_key} == {"id"}
    fk = next(iter(table.c.business_id.foreign_keys))
    assert fk.target_fullname == "businesses.id"
    assert fk.ondelete == "RESTRICT"
    assert table.c.business_id.nullable is False


def test_name_unique_only_inside_business_even_when_inactive() -> None:
    uniques = {
        c.name: tuple(column.name for column in c.columns)
        for c in Supplier.__table__.constraints if isinstance(c, UniqueConstraint)
    }
    assert uniques["uq_suppliers_business_id_id"] == ("business_id", "id")
    assert uniques["uq_suppliers_business_name"] == ("business_id", "name_key")
    indexes = {
        index.name: index for index in Supplier.__table__.indexes
        if isinstance(index, Index)
    }
    assert set(indexes) == {"ix_suppliers_business_id"}
    assert [c.name for c in indexes["ix_suppliers_business_id"].columns] == ["business_id"]


def test_name_status_and_json_array_guards() -> None:
    checks = {
        check.name: str(check.sqltext)
        for check in Supplier.__table__.constraints
        if isinstance(check, CheckConstraint)
    }
    assert {"ck_suppliers_name_length", "ck_suppliers_name_key_length",
            "ck_suppliers_status", "ck_suppliers_payment_methods_array",
            "ck_suppliers_promotions_array"} == set(checks)
    assert "INACTIVO" in checks["ck_suppliers_status"]
    assert "jsonb_typeof(payment_methods)" in checks["ck_suppliers_payment_methods_array"]
    assert "<= 7" in checks["ck_suppliers_payment_methods_array"]
    assert "<= 8" in checks["ck_suppliers_promotions_array"]
    assert Supplier.__table__.c.status.default.arg == "ACTIVO"


def test_optional_text_defaults_and_jsonb_are_not_null() -> None:
    table = Supplier.__table__
    sizes = {
        "name": 90, "name_key": 90, "offerings": 240,
        "contact_person": 100, "phone": 35, "whatsapp": 35,
        "email": 120, "address": 160, "maps_url": 2048,
        "website": 2048, "instagram": 31, "notes": 650,
    }
    for field, size in sizes.items():
        assert table.c[field].type.length == size
        assert table.c[field].nullable is False
    for field in sizes.keys() - {"name", "name_key"}:
        assert table.c[field].default.arg == ""
    for field in ("payment_methods", "promotions"):
        assert isinstance(table.c[field].type, JSONB)
        assert table.c[field].nullable is False
        assert table.c[field].default.is_callable
        assert "[]" in str(table.c[field].server_default.arg)
