"""Configuracion y URLs seguras."""
import pytest
from pydantic import ValidationError

from app.core.settings import DatabaseSettings


def test_database_url_handles_reserved_password_characters(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # El entorno de CI define DB_PORT=5432 para PostgreSQL efimero.
    # Esta prueba verifica el fallback POSTGRES_HOST_PORT sin overrides.
    monkeypatch.delenv("DB_HOST", raising=False)
    monkeypatch.delenv("DB_PORT", raising=False)
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


def test_supabase_ssl_required_only_when_explicitly_configured() -> None:
    local = DatabaseSettings(_env_file=None, POSTGRES_PASSWORD="pw")
    assert not local.database_url.query.get("sslmode")
    hosted = DatabaseSettings(
        _env_file=None,
        POSTGRES_PASSWORD="pw",
        DB_HOST="pooler.example.supabase.com",
        DB_PORT=5432,
        DB_USER="postgres.sample-ref",
        DB_NAME="postgres",
        DB_SSLMODE="require",
    )
    assert hosted.database_url.query["sslmode"] == "require"
    assert hosted.database_url.username == "postgres.sample-ref"
