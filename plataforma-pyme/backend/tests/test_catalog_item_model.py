"""E2-3 A: metadata del Catálogo: FK tenant, SKU/nombre únicos y centavos."""
from sqlalchemy import BigInteger, CheckConstraint, Index, UniqueConstraint

from app.infrastructure.models import CatalogItem
from app.infrastructure.models.base import Base


def test_catalog_registered_independently_from_stock_and_sale_documents() -> None:
    assert Base.metadata.tables["catalog_items"] is CatalogItem.__table__
    assert "stock_balances" in Base.metadata.tables
    # E2-6 A incorporó ventas sin añadirles stock/venta mutable al catálogo.
    assert "sales" in Base.metadata.tables
    assert "sale_id" not in CatalogItem.__table__.c
    assert "stock_quantity" not in CatalogItem.__table__.c


def test_catalog_business_fk_and_immutable_id_scope() -> None:
    table = CatalogItem.__table__
    assert {c.name for c in table.primary_key} == {"id"}
    assert set(table.c.keys()) == {
        "id", "business_id", "name", "name_key", "kind", "category",
        "sku", "unit", "description", "observations", "sellable",
        "price_cents", "reference_cost_cents", "status", "created_at", "updated_at",
    }
    fk = next(iter(table.c.business_id.foreign_keys))
    assert fk.target_fullname == "businesses.id" and fk.ondelete == "RESTRICT"
    assert table.c.business_id.nullable is False


def test_catalog_unique_keys_are_tenant_scoped_including_inactive() -> None:
    uniques = {
        c.name: [col.name for col in c.columns]
        for c in CatalogItem.__table__.constraints
        if isinstance(c, UniqueConstraint)
    }
    assert uniques["uq_catalog_items_business_id_id"] == ["business_id", "id"]
    assert uniques["uq_catalog_items_business_name"] == ["business_id", "name_key"]
    indexes = {c.name: c for c in CatalogItem.__table__.indexes if isinstance(c, Index)}
    assert set(indexes) == {"ix_catalog_items_business_id", "uq_catalog_items_business_sku"}
    idx = indexes["uq_catalog_items_business_sku"]
    assert idx.unique
    assert [col.name for col in idx.columns] == ["business_id", "sku"]
    assert "sku IS NOT NULL" in str(idx.dialect_options["postgresql"]["where"])


def test_catalog_kind_unit_and_status_rules_match_demo() -> None:
    checks = {
        c.name: str(c.sqltext)
        for c in CatalogItem.__table__.constraints
        if isinstance(c, CheckConstraint)
    }
    assert {"ELABORADO", "REVENTA", "INSUMO", "SERVICIO"} <= {
        kind for kind in ["ELABORADO", "REVENTA", "INSUMO", "SERVICIO"]
        if kind in checks["ck_catalog_items_kind"]
    }
    for unit in ("UNIDAD", "GRAMO", "KILOGRAMO", "MILILITRO", "LITRO",
                 "PAQUETE", "CAJA", "SERVICIO"):
        assert unit in checks["ck_catalog_items_unit"]
    assert "kind = 'SERVICIO'" in checks["ck_catalog_items_kind_unit"]
    assert "unit = 'SERVICIO'" in checks["ck_catalog_items_kind_unit"]
    assert "INACTIVO" in checks["ck_catalog_items_status"]
    assert CatalogItem.__table__.c.status.default.arg == "ACTIVO"


def test_money_values_are_nullable_big_integers_never_floats() -> None:
    table = CatalogItem.__table__
    assert isinstance(table.c.price_cents.type, BigInteger)
    assert isinstance(table.c.reference_cost_cents.type, BigInteger)
    assert table.c.price_cents.nullable and table.c.reference_cost_cents.nullable
    checks = {c.name: str(c.sqltext) for c in table.constraints
              if isinstance(c, CheckConstraint)}
    for name in ("ck_catalog_items_price_cents", "ck_catalog_items_reference_cost_cents"):
        assert "BETWEEN 0 AND 99999999999" in checks[name]


def test_optional_sku_and_fields_without_implicit_stock_or_price() -> None:
    table = CatalogItem.__table__
    assert table.c.sku.nullable and table.c.sku.default is None
    assert table.c.description.default.arg == ""
    assert table.c.observations.default.arg == ""
    assert table.c.category.default.arg == "General"
    assert table.c.sellable.default is None and not table.c.sellable.nullable
    assert table.c.name.type.length == 90
    assert table.c.description.type.length == 450
    assert table.c.observations.type.length == 600


def test_item_type_is_derived_not_extra_mutable_column() -> None:
    assert "item_type" not in CatalogItem.__table__.columns
    a = CatalogItem(kind="SERVICIO")
    b = CatalogItem(kind="INSUMO")
    assert a.item_type == "SERVICIO"
    assert b.item_type == "BIEN"
