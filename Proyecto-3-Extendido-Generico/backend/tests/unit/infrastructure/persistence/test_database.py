import pytest

from app.infrastructure.persistence.database import (
    SYNC_POSTGRES_DRIVER,
    build_engine,
    build_session_factory,
    validate_sync_postgresql_url,
)


def test_validate_sync_postgresql_url_accepts_psycopg3_sync() -> None:
    url = "postgresql+psycopg://user:password@localhost:5432/app"

    assert validate_sync_postgresql_url(url) == url


@pytest.mark.parametrize(
    "url",
    [
        "",
        "   ",
        "postgresql+asyncpg://user:password@localhost:5432/app",
        "sqlite:///local.db",
    ],
)
def test_validate_sync_postgresql_url_rejects_noncanonical_driver(url: str) -> None:
    with pytest.raises(ValueError):
        validate_sync_postgresql_url(url)


def test_build_engine_uses_sync_psycopg_driver_without_connecting() -> None:
    database_engine = build_engine(
        "postgresql+psycopg://user:password@localhost:5432/app"
    )

    try:
        assert database_engine.url.drivername == SYNC_POSTGRES_DRIVER
    finally:
        database_engine.dispose()


def test_session_factory_keeps_transaction_boundaries_explicit() -> None:
    database_engine = build_engine(
        "postgresql+psycopg://user:password@localhost:5432/app"
    )
    factory = build_session_factory(database_engine)

    try:
        assert factory.kw["autoflush"] is False
        assert factory.kw["expire_on_commit"] is False
    finally:
        database_engine.dispose()
