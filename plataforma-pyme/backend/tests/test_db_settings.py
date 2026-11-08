"""Configuracion y URLs seguras."""
import pytest
from pydantic import ValidationError

from app.core.settings import DatabaseSettings


def test_database_url_handles_reserved_password_characters() -> None:
    settings = DatabaseSettings(
        _env_file=None,
        POSTGRES_PASSWORD="pass:@/% with spaces",
        POSTGRES_HOST_PORT=55432,
    )
    url = settings.database_url
    assert url.drivername == "postgresql+psycopg"
    assert url.password == "pass:@/% with spaces"
    assert url.host == "127.0.0.1"
    assert url.port == 55432


def test_password_hidden_in_repr_and_string_url() -> None:
    settings = DatabaseSettings(_env_file=None, POSTGRES_PASSWORD="private-db-pass")
    assert "private-db-pass" not in repr(settings)
    assert "private-db-pass" not in str(settings.database_url)


def test_invalid_port_fails_validation() -> None:
    with pytest.raises(ValidationError):
        DatabaseSettings(_env_file=None, POSTGRES_PASSWORD="pw", POSTGRES_HOST_PORT=0)


def test_db_port_override_for_future_docker_api() -> None:
    settings = DatabaseSettings(
        _env_file=None,
        POSTGRES_PASSWORD="pw",
        POSTGRES_HOST_PORT=55432,
        DB_HOST="db",
        DB_PORT=5432,
    )
    assert settings.database_url.host == "db"
    assert settings.database_url.port == 5432


def test_private_postgres_dsn_for_deploy_keeps_driver_and_password_redacted():
    settings = DatabaseSettings(_env_file=None, DATABASE_URL='postgresql://pyme:private-test-pass@db.example.com/pyme')
    assert settings.database_url.drivername == 'postgresql+psycopg'
    assert settings.database_url.database == 'pyme'
    assert 'private-test-pass' not in repr(settings)
    assert 'private-test-pass' not in str(settings.database_url)


def test_deploy_dsn_rejects_other_database_engines():
    with pytest.raises(ValidationError):
        DatabaseSettings(_env_file=None, DATABASE_URL='sqlite:///demo.db')
