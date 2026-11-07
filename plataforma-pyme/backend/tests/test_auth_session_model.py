"""Contrato ORM: no guarda tokens ni roles de empresa."""
from sqlalchemy import CheckConstraint, UniqueConstraint
from app.infrastructure.models import AuthSession
from app.infrastructure.models.base import Base


def test_session_is_registered_with_global_user_fk() -> None:
    assert Base.metadata.tables["auth_sessions"] is AuthSession.__table__
    assert "business_id" not in AuthSession.__table__.c
    fk = next(iter(AuthSession.__table__.c.user_id.foreign_keys))
    assert fk.target_fullname == "users.id"
    assert fk.ondelete == "RESTRICT"


def test_session_rejects_bad_digest_and_expiration() -> None:
    constraints = {
        c.name for c in AuthSession.__table__.constraints
        if isinstance(c, (CheckConstraint, UniqueConstraint))
    }
    assert {
        "uq_auth_sessions_token_hash", "ck_auth_sessions_token_length",
        "ck_auth_sessions_expiration",
    } <= constraints
    assert AuthSession.__table__.c.revoked_at.nullable
