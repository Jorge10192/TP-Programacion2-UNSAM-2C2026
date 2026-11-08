"""E2-2 A: contrato estructural y metadatos ORM de ubicaciones."""
from sqlalchemy import CheckConstraint, Index

from app.infrastructure.models import Business, Location
from app.infrastructure.models.base import Base


def test_location_registered_without_changing_business_schema() -> None:
    assert Base.metadata.tables["locations"] is Location.__table__
    assert Base.metadata.tables["businesses"] is Business.__table__
    assert "primary_location_id" not in Business.__table__.columns


def test_location_belongs_to_exactly_one_business() -> None:
    t = Location.__table__
    assert set(t.columns.keys()) == {
        "id", "business_id", "name", "kind", "address", "map_url",
        "can_sell", "can_store", "is_primary", "status",
        "created_at", "updated_at",
    }
    fk = next(iter(t.c.business_id.foreign_keys))
    assert fk.target_fullname == "businesses.id"
    assert fk.ondelete == "RESTRICT"
    assert not t.c.business_id.nullable


def test_location_caps_are_explicit_independent_booleans() -> None:
    t = Location.__table__
    assert t.c.can_sell.type.python_type is bool
    assert t.c.can_store.type.python_type is bool
    assert t.c.can_sell.default is None
    assert t.c.can_store.default is None
    assert not t.c.can_sell.nullable and not t.c.can_store.nullable


def test_location_status_kind_name_and_primary_guards() -> None:
    t = Location.__table__
    checks = {
        c.name: str(c.sqltext) for c in t.constraints
        if isinstance(c, CheckConstraint)
    }
    assert {
        "ck_locations_name_length", "ck_locations_kind",
        "ck_locations_status", "ck_locations_primary_active",
    } <= set(checks)
    assert "PAUSADA" in checks["ck_locations_status"]
    assert "is_primary" in checks["ck_locations_primary_active"]
    assert t.c.status.default.arg == "ACTIVA"
    assert t.c.is_primary.default.arg is False


def test_primary_unique_only_within_business() -> None:
    indexes = {
        c.name: c for c in Location.__table__.indexes
        if isinstance(c, Index)
    }
    assert set(indexes) == {
        "ix_locations_business_id", "uq_locations_one_active_primary",
    }
    unique = indexes["uq_locations_one_active_primary"]
    assert unique.unique
    assert [c.name for c in unique.columns] == ["business_id"]
    where = str(unique.dialect_options["postgresql"]["where"])
    assert "is_primary" in where and "ACTIVA" in where


def test_location_accepts_casa_kind_in_sql_model() -> None:
    """CASA debe ser una opción real de la restricción, no solo del frontend."""
    checks = {
        constraint.name: str(constraint.sqltext)
        for constraint in Location.__table__.constraints
        if isinstance(constraint, CheckConstraint)
    }
    assert "'CASA'" in checks["ck_locations_kind"]


def test_location_metadata_defaults_match_optional_demo_fields() -> None:
    t = Location.__table__
    assert t.c.address.default.arg == ""
    assert t.c.map_url.default.arg == ""
    assert t.c.name.type.length == 80
    assert t.c.address.type.length == 160
    assert t.c.map_url.type.length == 2048
