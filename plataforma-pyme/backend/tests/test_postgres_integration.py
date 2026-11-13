"""Integración PostgreSQL opt-in: nunca se ejecuta contra una DB por accidente.

Activar RUN_DB_INTEGRATION=1 solo con una DB efimera/conocida y migrada.
No escribe ni altera registros comerciales.
"""
import os

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory
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
    expected_major = int(os.environ.get("EXPECTED_POSTGRES_MAJOR", "16"))
    with get_engine().connect() as conn:
        assert conn.execute(text("SELECT 1")).scalar_one() == 1
        server_version = int(conn.execute(text("SELECT current_setting('server_version_num')")).scalar_one())
        assert server_version // 10000 == expected_major


def test_real_postgres_has_current_alembic_revision() -> None:
    """La DB efímera debe estar en HEAD, sin fijar una migración histórica."""
    current_head = ScriptDirectory.from_config(Config("alembic.ini")).get_current_head()
    with get_engine().connect() as conn:
        version = conn.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
        assert version == current_head
