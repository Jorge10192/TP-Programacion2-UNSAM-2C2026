"""Restricciones del registro idempotente y enlaces con el tenant."""
from sqlalchemy import CheckConstraint, UniqueConstraint

from app.infrastructure.models import BusinessCreationRequest
from app.infrastructure.models.base import Base


def test_business_request_is_registered_in_metadata() -> None:
    assert Base.metadata.tables["business_creation_requests"] is BusinessCreationRequest.__table__


def test_idempotency_scope_is_actor_and_key_not_business() -> None:
    table = BusinessCreationRequest.__table__
    assert {col.name for col in table.primary_key.columns} == {
        "actor_user_id", "idempotency_key"
    }
    constraints = {
        c.name for c in table.constraints
        if isinstance(c, (CheckConstraint, UniqueConstraint))
    }
    assert {
        "uq_business_creation_actor_key", "uq_business_creation_business",
        "ck_business_creation_request_digest",
    } <= constraints
    assert {f.target_fullname for col in table.columns for f in col.foreign_keys} == {
        "users.id", "businesses.id"
    }
