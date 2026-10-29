from alembic import context
from sqlalchemy import pool

from app.config import get_settings
from app.infrastructure.persistence.database import build_engine
from app.infrastructure.persistence.models import Base

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Configure Alembic without creating a DB connection."""
    settings = get_settings()

    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations through the synchronous PostgreSQL engine."""
    settings = get_settings()
    connectable = build_engine(settings.database_url, poolclass=pool.NullPool)

    try:
        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
                compare_server_default=True,
            )

            with context.begin_transaction():
                context.run_migrations()
    finally:
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
