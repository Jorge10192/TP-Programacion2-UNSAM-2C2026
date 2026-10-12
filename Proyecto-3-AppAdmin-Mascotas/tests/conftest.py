from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from src.auth.models import Usuario
from src.auth.security import hash_password
from src.database import session as database
from src.database.session import get_db
from src.main import app

PASSWORD = "Walos-prueba-2026"
PROJECT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def password_hash():
    return hash_password(PASSWORD)


@pytest.fixture
def client(tmp_path, monkeypatch, password_hash):
    url = f"sqlite:///{(tmp_path / 'test.db').as_posix()}"
    monkeypatch.setattr(database, "DATABASE_URL", url)
    command.upgrade(Config(str(PROJECT / "alembic.ini")), "head")
    engine = create_engine(url, connect_args={"check_same_thread": False, "timeout": 30})

    @event.listens_for(engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    with sessions() as db:
        db.add_all([Usuario(nombre="admin", password_hash=password_hash, rol="administrador"),
                    Usuario(nombre="operador", password_hash=password_hash, rol="operador")])
        db.commit()

    def test_db():
        with sessions() as db:
            try:
                yield db
            except Exception:
                db.rollback()
                raise

    app.dependency_overrides[get_db] = test_db
    with TestClient(app, raise_server_exceptions=False) as test_client:
        test_client.sessions = sessions
        yield test_client
    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture
def api(client):
    result = client.post("/auth/login", json={"nombre": "admin", "password": PASSWORD})
    assert result.status_code == 200, result.text
    client.headers["Authorization"] = f"Bearer {result.json()['access_token']}"
    return client


@pytest.fixture
def catalogo(api):
    def create(url, body):
        response = api.post(url, json=body)
        assert response.status_code == 201, response.text
        return response.json()["id"]

    proveedor = create("/proveedores", {"nombre": "Distribuidora"})
    categoria = create("/categorias", {"nombre": "Materia prima"})
    kg = create("/unidades", {"nombre": "Kilogramo", "dimension": "masa", "factor": "1000"})
    g = create("/unidades", {"nombre": "Gramo", "dimension": "masa", "factor": "1"})
    bolsa = create("/unidades", {"nombre": "Bolsa", "dimension": "comercial", "factor": "1"})
    insumo = create("/insumos", {"nombre": "Harina", "categoria_id": categoria, "unidad_stock_id": kg})
    return {"proveedor": proveedor, "categoria": categoria, "kg": kg, "g": g, "bolsa": bolsa, "insumo": insumo}


@pytest.fixture
def compra(catalogo):
    return {"referencia": "compra-prueba-001", "proveedor_id": catalogo["proveedor"], "fecha": "2026-10-12",
            "items": [{"insumo_id": catalogo["insumo"], "cantidad": "2", "unidad_compra_id": catalogo["bolsa"],
                       "contenido_por_unidad": "5", "unidad_contenido_id": catalogo["kg"], "precio_total": "2000.50"}]}
