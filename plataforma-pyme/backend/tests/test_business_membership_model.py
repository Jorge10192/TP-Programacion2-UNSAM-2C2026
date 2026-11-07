"""Relaciones e invariantes SQLAlchemy de empresas y membresías."""
from sqlalchemy import CheckConstraint, Index, UniqueConstraint

from app.infrastructure.models import Business, Membership, User
from app.infrastructure.models.base import Base


def test_tenant_and_membership_are_registered() -> None:
    assert Base.metadata.tables["businesses"] is Business.__table__
    assert Base.metadata.tables["memberships"] is Membership.__table__


def test_business_founder_references_global_user() -> None:
    table = Business.__table__
    assert set(table.columns.keys()) == {
        "id", "name", "category", "activity_kind", "founder_user_id",
        "status", "created_at", "updated_at",
    }
    fk = next(iter(table.c.founder_user_id.foreign_keys))
    assert fk.target_fullname == "users.id"
    assert fk.ondelete == "RESTRICT"
    assert "administrative_owner_user_id" not in table.c


def test_membership_is_per_business_not_global_role() -> None:
    table = Membership.__table__
    assert {"business_id", "user_id", "role", "status"} <= set(table.columns.keys())
    foreign_targets = {
        fk.target_fullname for col in table.columns for fk in col.foreign_keys
    }
    assert foreign_targets == {"users.id", "businesses.id"}
    assert "role" not in User.__table__.columns


def test_unique_membership_and_one_active_owner_index() -> None:
    table = Membership.__table__
    uniques = {
        c.name for c in table.constraints if isinstance(c, UniqueConstraint)
    }
    checks = {
        c.name for c in table.constraints if isinstance(c, CheckConstraint)
    }
    assert "uq_memberships_business_user" in uniques
    assert {"ck_memberships_status", "ck_memberships_role"} <= checks
    owner_index = next(
        index for index in table.indexes
        if index.name == "uq_memberships_one_active_owner"
    )
    assert owner_index.unique
    assert "TITULAR_ADMINISTRATIVO" in str(owner_index.dialect_options["postgresql"]["where"])
    assert {"ix_memberships_user_id", "uq_memberships_one_active_owner"} == {
        index.name for index in table.indexes
    }


def test_initial_business_and_membership_states() -> None:
    assert Business.__table__.c.status.default.arg == "ACTIVA"
    assert Membership.__table__.c.status.default.arg == "ACTIVA"
    assert Membership.__table__.c.business_id.nullable is False
    assert Membership.__table__.c.user_id.nullable is False
