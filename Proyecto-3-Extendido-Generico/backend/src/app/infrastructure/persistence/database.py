from collections.abc import Generator
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

SYNC_POSTGRES_DRIVER = "postgresql+psycopg"


def validate_sync_postgresql_url(database_url: str) -> str:
    """Reject persistence URLs that violate the synchronous PostgreSQL decision."""
    if not isinstance(database_url, str) or not database_url.strip():
        raise ValueError("database_url debe ser un string no vacío.")

    parsed_url = make_url(database_url)
    if parsed_url.drivername != SYNC_POSTGRES_DRIVER:
        raise ValueError(
            "La persistencia de Bloque 1 requiere una URL postgresql+psycopg:// síncrona."
        )

    return database_url


def build_engine(database_url: str, **engine_options: Any) -> Engine:
    """Build a synchronous SQLAlchemy engine without opening a connection yet."""
    validated_url = validate_sync_postgresql_url(database_url)
    options: dict[str, Any] = {"pool_pre_ping": True}
    options.update(engine_options)
    return create_engine(validated_url, **options)


def build_session_factory(bind: Engine) -> sessionmaker[Session]:
    """Build the process/session factory without hiding transaction boundaries."""
    return sessionmaker(
        bind=bind,
        class_=Session,
        autoflush=False,
        expire_on_commit=False,
    )


settings = get_settings()
engine = build_engine(settings.database_url, echo=settings.sql_echo)
SessionFactory = build_session_factory(engine)


def get_db_session() -> Generator[Session, None, None]:
    """Yield one synchronous Session; callers own commit/rollback semantics."""
    with SessionFactory() as session:
        yield session


def check_database_connection(database_engine: Engine = engine) -> bool:
    """Run the smallest useful connectivity probe against PostgreSQL."""
    with database_engine.connect() as connection:
        return connection.execute(text("SELECT 1")).scalar_one() == 1
