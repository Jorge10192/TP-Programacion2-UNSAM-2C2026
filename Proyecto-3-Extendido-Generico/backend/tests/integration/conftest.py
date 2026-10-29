from collections.abc import Generator

import pytest
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings
from app.infrastructure.persistence.database import (
    build_engine,
    validate_sync_postgresql_url,
)


@pytest.fixture(scope="session")
def test_database_url() -> str:
    """Return an explicit isolated PostgreSQL test URL or skip integration tests."""
    settings = get_settings()
    database_url = settings.test_database_url

    if database_url is None:
        pytest.skip(
            "TEST_DATABASE_URL no está configurada; "
            "los tests de PostgreSQL real son opt-in."
        )

    validate_sync_postgresql_url(database_url)

    if make_url(database_url) == make_url(settings.database_url):
        pytest.fail(
            "TEST_DATABASE_URL debe apuntar a una base distinta de DATABASE_URL."
        )

    return database_url


@pytest.fixture(scope="session")
def test_engine(test_database_url: str) -> Generator[Engine]:
    """Provide one synchronous Engine for the PostgreSQL integration suite."""
    database_engine = build_engine(test_database_url)

    try:
        yield database_engine
    finally:
        database_engine.dispose()


@pytest.fixture
def db_session(test_engine: Engine) -> Generator[Session]:
    """Run each integration test inside an outer transaction rolled back at the end."""
    connection = test_engine.connect()
    outer_transaction = connection.begin()
    factory = sessionmaker(
        bind=connection,
        class_=Session,
        autoflush=False,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    )

    try:
        with factory() as session:
            yield session
    finally:
        if outer_transaction.is_active:
            outer_transaction.rollback()
        connection.close()
