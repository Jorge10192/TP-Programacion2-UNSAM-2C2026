"""Migraciones Alembic: misma configuracion privada que FastAPI.

No usa sqlalchemy.url en alembic.ini para evitar persistir credenciales.
"""
from alembic import context
from sqlalchemy import create_engine, pool

from app.core.settings import get_settings
from app.infrastructure.models.base import Base


config = context.config
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = get_settings().database_url.render_as_string(hide_password=False)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(get_settings().database_url, poolclass=pool.NullPool)
    try:
        with engine.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
            )
            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
