"""Integración PostgreSQL opt-in: nunca se ejecuta contra una DB por accidente.

Activar RUN_DB_INTEGRATION=1 solo con una DB efimera/conocida y migrada.
No escribe ni altera registros comerciales.
"""
import os

import pytest
from sqlalchemy import text

from app.infrastructure.db import get_engine


pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere RUN_DB_INTEGRATION=1 y PostgreSQL disponible",
    ),
]


def test_real_postgres_accepts_queries() -> None:
    with get_engine().connect() as conn:
        assert conn.execute(text("SELECT 1")).scalar_one() == 1
        assert conn.execute(text("SELECT current_setting('server_version_num')")).scalar_one().startswith("16")


def test_real_postgres_has_initial_alembic_revision() -> None:
    with get_engine().connect() as conn:
        version = conn.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
        assert version == "e23a_catalog"
