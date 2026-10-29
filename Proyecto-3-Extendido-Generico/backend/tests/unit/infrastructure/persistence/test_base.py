from app.infrastructure.persistence.models.base import (
    POSTGRES_NAMING_CONVENTION,
    Base,
)


def test_base_uses_deterministic_postgresql_naming_convention() -> None:
    assert Base.metadata.naming_convention == POSTGRES_NAMING_CONVENTION
