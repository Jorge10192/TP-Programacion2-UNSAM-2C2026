"""Contrato del modelo SQLAlchemy de identidad personal global."""
from sqlalchemy import CheckConstraint, DateTime, UniqueConstraint

from app.infrastructure.models import User
from app.infrastructure.models.base import Base


def test_users_registered_in_metadata() -> None:
    assert Base.metadata.tables["users"] is User.__table__
    assert User.__tablename__ == "users"


def test_user_has_no_business_role_or_tenant_id() -> None:
    cols = set(User.__table__.columns.keys())
    assert cols == {
        "id", "email_normalizado", "password_hash", "display_name",
        "contact_phone", "status", "created_at", "updated_at",
    }
    assert "business_id" not in cols
    assert User.__table__.c.id.primary_key


def test_normalized_email_is_unique_and_hash_mandatory() -> None:
    table = User.__table__
    assert not table.c.email_normalizado.nullable
    assert not table.c.password_hash.nullable
    assert "password" not in table.c
    names = {
        c.name for c in table.constraints
        if isinstance(c, (CheckConstraint, UniqueConstraint))
    }
    assert {
        "uq_users_email_normalizado", "ck_users_email_length",
        "ck_users_email_normalized", "ck_users_display_name_length",
        "ck_users_password_hash_length", "ck_users_status",
    } <= names


def test_user_status_defaults_and_timestamps() -> None:
    table = User.__table__
    assert table.c.status.default.arg == "ACTIVO"
    assert table.c.status.server_default is not None
    assert table.c.id.default is not None
    assert isinstance(table.c.created_at.type, DateTime)
    assert table.c.created_at.type.timezone
    assert isinstance(table.c.updated_at.type, DateTime)
    assert table.c.updated_at.type.timezone
    assert table.c.updated_at.onupdate is not None
