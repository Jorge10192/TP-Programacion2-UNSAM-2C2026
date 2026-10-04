from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

from src.database.base import Base
from src.database.session import DATABASE_URL
from src.compras.models import CategoriaInsumo, Insumo, Proveedor

# Objeto de configuración de Alembic
config = context.config

# Le indicamos a Alembic qué URL de base de datos debe usar
config.set_main_option("sqlalchemy.url", DATABASE_URL)


# Configuración de logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# Metadata de SQLAlchemy que Alembic observará
# para detectar cambios en los modelos
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Ejecuta migraciones en modo offline.

    En este modo Alembic trabaja con la URL de conexión
    sin abrir una conexión real a la base de datos.
    """

    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Ejecuta migraciones en modo online.

    En este modo Alembic crea una conexión real
    con la base de datos.
    """

    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()