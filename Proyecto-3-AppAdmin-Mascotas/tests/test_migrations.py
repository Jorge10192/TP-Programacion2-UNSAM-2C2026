from pathlib import Path
from datetime import date, timedelta
import hashlib
import json

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import MetaData, create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from src.database import session as database
from src.database.session import get_db
from src.main import app
from src.auth.security import ahora


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


def test_actualizar_main_conserva_login_compras_y_stock(tmp_path, monkeypatch, password_hash):
    url = f"sqlite:///{(tmp_path / 'main-existente.db').as_posix()}"
    monkeypatch.setattr(database, "DATABASE_URL", url)
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(config, "8ad65c3a4412")
    engine = create_engine(url, connect_args={"check_same_thread": False})
    old = MetaData()
    old.reflect(engine)
    token = "sesion-main-existente"
    solicitud = {"referencia": "main-compra-001", "proveedor_id": 1, "fecha": "2026-10-12", "observaciones": None,
                 "items": [{"insumo_id": 1, "cantidad": "10", "unidad_compra_id": 1, "contenido_por_unidad": None,
                            "unidad_contenido_id": None, "precio_total": "1500.25", "lote": None, "vencimiento": None}]}
    huella = hashlib.sha256(json.dumps(solicitud, sort_keys=True).encode()).hexdigest()
    with engine.begin() as connection:
        def insert(tabla, **datos):
            connection.execute(old.tables[tabla].insert().values(**datos))
        insert("usuarios", id=1, nombre="existente", password_hash=password_hash, rol="administrador", activo=True, intentos=0)
        insert("sesiones", token_hash=hashlib.sha256(token.encode()).hexdigest(), usuario_id=1, vence=ahora() + timedelta(hours=1))
        insert("proveedores", id=1, nombre="Distribuidora", activo=True)
        insert("categorias_insumo", id=1, nombre="Ingredientes", activo=True)
        insert("unidades_medida", id=1, nombre="Kilogramo", dimension="masa", factor=1000, activo=True)
        insert("insumos", id=1, nombre="Harina", categoria_id=1, unidad_stock_id=1, activo=True)
        insert("compras", id=1, proveedor_id=1, usuario_id=1, referencia="main-compra-001", huella=huella,
               fecha=date(2026, 10, 12), estado="CONFIRMADA")
        insert("items_compra", id=1, compra_id=1, insumo_id=1, cantidad=10, unidad_compra_id=1,
               unidad_stock_id=1, cantidad_micro=10_000_000, precio_centavos=150025)
        insert("existencias", insumo_id=1, cantidad_micro=10_000_000)
        insert("movimientos_stock", insumo_id=1, usuario_id=1, compra_id=1, clave="compra:1:1",
               tipo="COMPRA", cantidad_micro=10_000_000, motivo="Recepción confirmada")
        insert("comprobantes", id=1, compra_id=1, usuario_id=1, tipo="application/pdf", huella="b" * 64, contenido=b"%PDF-1.7 anterior")
    command.upgrade(config, "head")
    command.check(config)
    with engine.connect() as connection:
        assert connection.execute(text("PRAGMA foreign_key_check")).all() == []
        assert connection.execute(text("SELECT controla_vencimiento FROM insumos")).scalar() == 0
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    def test_db():
        with sessions() as db:
            try:
                yield db
            except Exception:
                db.rollback()
                raise
    app.dependency_overrides[get_db] = test_db
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            client.headers["Authorization"] = f"Bearer {token}"
            assert client.get("/health").status_code == 200
            assert client.get("/auth/me").json()["nombre"] == "existente"
            assert client.post("/auth/login", json={"nombre": "existente", "password": "Walos-prueba-2026"}).status_code == 200
            assert client.get("/stock").json()[0]["cantidad"] == "10"
            assert client.get("/compras/1").json()["items"][0]["precio_total"] == "1500.25"
            retry = client.post("/compras", json=solicitud)
            assert retry.status_code == 201, retry.text
            assert retry.json()["id"] == 1
            assert client.post("/compras/1/confirmar").status_code == 200
            assert len(client.get("/stock/movimientos").json()) == 1
            assert client.get("/compras/1/comprobantes/1").content == b"%PDF-1.7 anterior"
            assert client.post("/compras/1/anular", json={"motivo": "Prueba de migración"}).status_code == 200
            assert client.get("/stock").json()[0]["cantidad"] == "0"
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
