"""E2-2 D1: garantías estructurales verificables aun sin PostgreSQL."""
from sqlalchemy import CheckConstraint, ForeignKeyConstraint, Index, UniqueConstraint

from app.infrastructure.models import Location, LocationAssignment, Membership
from app.infrastructure.models.base import Base


def test_assignment_orm_is_registered_with_composite_tenant_primary_key() -> None:
    table = Base.metadata.tables["location_assignments"]
    assert table is LocationAssignment.__table__
    assert {column.name for column in table.primary_key} == {
        "business_id", "location_id", "user_id",
    }
    assert set(table.c.keys()) == {
        "business_id", "location_id", "user_id", "status",
        "created_at", "updated_at", "revoked_at",
    }


def test_assignment_foreign_keys_enforce_same_tenant() -> None:
    fks = {
        fk.name: {
            (col.parent.name, col.column.table.name, col.column.name)
            for col in fk.elements
        }
        for fk in LocationAssignment.__table__.constraints
        if isinstance(fk, ForeignKeyConstraint)
    }
    assert fks["fk_location_assignments_location_tenant"] == {
        ("business_id", "locations", "business_id"),
        ("location_id", "locations", "id"),
    }
    assert fks["fk_location_assignments_membership_tenant"] == {
        ("business_id", "memberships", "business_id"),
        ("user_id", "memberships", "user_id"),
    }


def test_membership_unique_pair_is_reused_without_changes_to_e2_1() -> None:
    keys = {
        (constraint.name, tuple(col.name for col in constraint.columns))
        for constraint in Membership.__table__.constraints
        if isinstance(constraint, UniqueConstraint)
    }
    assert ("uq_memberships_business_user", ("business_id", "user_id")) in keys


def test_location_composite_unique_key_is_available_for_fk() -> None:
    uniques = {
        (constraint.name, tuple(c.name for c in constraint.columns))
        for constraint in Location.__table__.constraints
        if isinstance(constraint, UniqueConstraint)
    }
    assert ("uq_locations_business_id_id", ("business_id", "id")) in uniques


def test_status_revocation_check_is_consistent() -> None:
    checks = {
        constraint.name: str(constraint.sqltext)
        for constraint in LocationAssignment.__table__.constraints
        if isinstance(constraint, CheckConstraint)
    }
    check = checks["ck_location_assignments_status_revocation"]
    assert "ACTIVA" in check and "REVOCADA" in check
    assert "revoked_at IS NULL" in check and "revoked_at IS NOT NULL" in check
    table = LocationAssignment.__table__
    assert table.c.status.default.arg == "ACTIVA"
    assert table.c.revoked_at.nullable


def test_assignment_index_allows_membership_scope_listing() -> None:
    indexes = {idx.name: idx for idx in LocationAssignment.__table__.indexes
               if isinstance(idx, Index)}
    assert list(indexes["ix_location_assignments_business_user"].columns.keys()) == [
        "business_id", "user_id",
    ]
