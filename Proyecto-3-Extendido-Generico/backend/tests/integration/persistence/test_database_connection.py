import pytest
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.infrastructure.persistence.database import check_database_connection

pytestmark = pytest.mark.integration


def test_postgresql_connection_success(test_engine: Engine) -> None:
    assert check_database_connection(test_engine) is True


def test_db_session_fixture_executes_select(db_session: Session) -> None:
    assert db_session.execute(text("SELECT 1 AS alive")).scalar_one() == 1
