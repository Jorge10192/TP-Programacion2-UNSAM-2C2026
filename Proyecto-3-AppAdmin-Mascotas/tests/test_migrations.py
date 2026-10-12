from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from src.database import session as database
from src.database.session import get_db
from src.main import app


def test_migracion_conserva_proveedores(tmp_path, monkeypatch):
    url = f"sqlite:///{(tmp_path / 'upgrade.db').as_posix()}"
    monkeypatch.setattr(database, "DATABASE_URL", url)
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(config, "ce7a018cf3a4")
    engine = create_engine(url)
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO proveedores (nombre, activo) VALUES ('Existente', 1)"))
    command.upgrade(config, "head")
    with engine.connect() as connection:
        assert connection.execute(text("SELECT nombre FROM proveedores")).scalar() == "Existente"
    assert "compras" in inspect(engine).get_table_names()
    command.check(config)
    engine.dispose()


def test_salud_no_confirma_base_sin_migrar(tmp_path):
    engine = create_engine(f"sqlite:///{(tmp_path / 'empty.db').as_posix()}", connect_args={"check_same_thread": False})
    sessions = sessionmaker(bind=engine)
    def empty_db():
        with sessions() as db:
            yield db
    app.dependency_overrides[get_db] = empty_db
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            assert client.get("/health").status_code == 503
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
