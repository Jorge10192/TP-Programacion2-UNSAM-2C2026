import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.auth.models import Usuario
from src.database import session as database
from src.database.session import get_db
from src.main import app


def test_flujo_postgresql_ci(monkeypatch, password_hash):
    url = os.getenv("WALOS_TEST_POSTGRES_URL")
    if not url:
        pytest.skip("PostgreSQL se verifica en GitHub Actions")
    # Only the disposable database provisioned by this project's CI is accepted.
    if not url.endswith("/walos_ci_test"):
        raise ValueError("La prueba requiere la base temporal walos_ci_test")
    monkeypatch.setattr(database, "DATABASE_URL", url)
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(config, "head")
    command.check(config)
    engine = create_engine(url)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    with sessions() as db:
        db.add(Usuario(nombre="admin", password_hash=password_hash, rol="administrador"))
        db.commit()

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
            assert client.get("/health").status_code == 200
            assert client.get("/proveedores").status_code == 401
            token = client.post("/auth/login", json={"nombre": "admin", "password": "Walos-prueba-2026"}).json()["access_token"]
            client.headers["Authorization"] = f"Bearer {token}"
            def create(path, data):
                response = client.post(path, json=data)
                assert response.status_code == 201, response.text
                return response.json()["id"]
            supplier = create("/proveedores", {"nombre": "Proveedor PG"})
            category = create("/categorias", {"nombre": "Materia prima"})
            unit = create("/unidades", {"nombre": "Kilogramo", "dimension": "masa", "factor": "1000"})
            insumo = create("/insumos", {"nombre": "Harina", "categoria_id": category, "unidad_stock_id": unit})
            purchase = create("/compras", {"referencia": "compra-postgres-001", "proveedor_id": supplier, "fecha": "2026-10-12",
                              "items": [{"insumo_id": insumo, "cantidad": "10", "unidad_compra_id": unit, "precio_total": "1500.25"}]})
            for _ in range(2):
                assert client.post(f"/compras/{purchase}/confirmar").status_code == 200
            assert client.get("/stock").json()[0]["cantidad"] == "10"
            assert len(client.get("/stock/movimientos").json()) == 1
            assert client.post(f"/compras/{purchase}/anular", json={"motivo": "Prueba PostgreSQL"}).status_code == 200
            assert client.get("/stock").json()[0]["cantidad"] == "0"
            presentacion = create("/presentaciones-insumos", {"insumo_id": insumo, "nombre": "Paquete",
                                  "unidad_compra_id": unit})
            draft = create("/compras", {"referencia": "borrador-postgres-001"})
            assert client.put(f"/compras/{draft}", json={"proveedor_id": supplier, "fecha_compra": "2026-10-24"}).status_code == 200
            item = {"insumo_id": insumo, "presentacion_id": presentacion, "cantidad": "2", "precio_total": "25.50"}
            result = client.post(f"/compras/{draft}/items", json=item)
            assert result.status_code == 201, result.text
            item["cantidad"] = "3"
            item_id = result.json()["items"][0]["id"]
            assert client.put(f"/compras/{draft}/items/{item_id}", json=item).status_code == 200
            for _ in range(2):
                assert client.post(f"/compras/{draft}/confirmar").status_code == 200
            assert client.get("/stock").json()[0]["cantidad"] == "3"
            assert client.put(f"/compras/{draft}/items/{item_id}", json=item).status_code == 409
            history = client.get(f"/compras/{draft}/historial").json()
            assert [row["tipo"] for row in history] == ["CREACION", "EDICION", "EDICION", "EDICION", "CONFIRMACION"]
            create("/imagenes-insumos", {"insumo_id": insumo, "archivo": "harina.png", "principal": True})
            assert client.get("/imagenes-insumos").json()[0]["principal"] is True
            assert client.post(f"/compras/{draft}/anular", json={"motivo": "Prueba de integración"}).status_code == 200
            assert client.get("/stock").json()[0]["cantidad"] == "0"
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
