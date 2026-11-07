"""Engine compartible; sesiones SQLAlchemy aisladas por operacion.

Esta capa NO confirma transacciones: los servicios seran responsables del commit.
"""
from contextlib import contextmanager
from functools import lru_cache
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.settings import get_settings


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    """Crea el engine bajo demanda; no conecta al importar la aplicacion."""
    return create_engine(
        get_settings().database_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        pool_timeout=10,
        connect_args={"connect_timeout": 3},
    )


@lru_cache(maxsize=1)
def get_session_factory() -> sessionmaker[Session]:
    """La factoria es compartible; las instancias Session NO lo son."""
    return sessionmaker(bind=get_engine(), expire_on_commit=False, autoflush=False)


@contextmanager
def session_scope() -> Iterator[Session]:
    """Abre y cierra una sesion; rollback ante error, sin commit implicito."""
    with get_session_factory()() as session:
        try:
            yield session
        except Exception:
            session.rollback()
            raise
