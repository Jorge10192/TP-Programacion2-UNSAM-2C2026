"""Configuracion PostgreSQL desde plataforma-pyme/.env (archivo privado).

No requiere un .env para importar la API: se lee al solicitar DB.
"""
from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL, make_url


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class DatabaseSettings(BaseSettings):
    """Parametros de conexion sin concatenar passwords en la URI."""

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    postgres_password: SecretStr | None = Field(default=None, validation_alias="POSTGRES_PASSWORD")
    database_dsn: SecretStr | None = Field(default=None, validation_alias="DATABASE_URL")
    postgres_host_port: int = Field(
        default=55432, ge=1, le=65535, validation_alias="POSTGRES_HOST_PORT"
    )
    db_host: str = Field(default="127.0.0.1", validation_alias="DB_HOST")
    db_port: int | None = Field(
        default=None, ge=1, le=65535, validation_alias="DB_PORT"
    )
    db_user: str = Field(default="pyme", validation_alias="DB_USER")
    db_name: str = Field(default="asistente_pyme", validation_alias="DB_NAME")

    @model_validator(mode='after')
    def database_credentials(self):
        if self.database_dsn:
            try:
                url = make_url(self.database_dsn.get_secret_value())
                if url.get_backend_name() != 'postgresql' or not url.host or not url.database:
                    raise ValueError()
            except Exception:
                raise ValueError('DATABASE_URL debe ser una conexión PostgreSQL válida') from None
        elif not self.postgres_password:
            raise ValueError('Definí POSTGRES_PASSWORD o DATABASE_URL en el entorno privado')
        return self

    @property
    def database_url(self) -> URL:
        """URL segura para passwords con caracteres especiales."""
        if self.database_dsn:
            return make_url(self.database_dsn.get_secret_value()).set(drivername='postgresql+psycopg')
        return URL.create(
            drivername="postgresql+psycopg",
            username=self.db_user,
            password=self.postgres_password.get_secret_value() if self.postgres_password else None,
            host=self.db_host,
            port=self.db_port or self.postgres_host_port,
            database=self.db_name,
        )


@lru_cache(maxsize=1)
def get_settings() -> DatabaseSettings:
    """Una instancia de configuracion por proceso."""
    return DatabaseSettings()
