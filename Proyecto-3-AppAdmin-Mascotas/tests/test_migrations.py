from pathlib import Path
from datetime import date, timedelta
import hashlib
import json
import os

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import MetaData, create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from src.database import session as database
from src.database.session import get_db
from src.main import app
from src.auth.security import ahora
from src.compras.schemas import CompraCreate
from src.compras.services import huella
from postgres_support import reset_postgres


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


@pytest.mark.parametrize('backend', ['sqlite', 'postgresql'])
def test_upgrade_online_conserva_datos_precision_y_login(backend, tmp_path, monkeypatch, password_hash):
    if backend == 'postgresql':
        url = os.getenv('WALOS_TEST_POSTGRES_URL')
        if not url:
            pytest.skip('PostgreSQL temporal no configurado')
        reset_postgres(url)
    else:
        url = f"sqlite:///{(tmp_path / 'legacy-8ad.db').as_posix()}"
    monkeypatch.setattr(database, 'DATABASE_URL', url)
    config = Config(str(Path(__file__).resolve().parents[1] / 'alembic.ini'))
    command.upgrade(config, '8ad65c3a4412')
    engine = create_engine(url, connect_args={'check_same_thread': False} if backend == 'sqlite' else {})
    old = MetaData()
    old.reflect(engine)
    token = 'legacy-session-qa'
    with engine.begin() as connection:
        def insert(table, **values):
            return connection.execute(old.tables[table].insert().values(**values)).inserted_primary_key[0]
        user = insert('usuarios', nombre='legacy', password_hash=password_hash, rol='administrador', activo=True, intentos=0)
        insert('sesiones', token_hash=hashlib.sha256(token.encode()).hexdigest(), usuario_id=user,
               vence=ahora() + timedelta(hours=1))
        provider = insert('proveedores', nombre='Proveedor anterior', activo=True)
        category = insert('categorias_insumo', nombre='Materia anterior', activo=True)
        kg = insert('unidades_medida', nombre='Kilogramo anterior', dimension='masa', factor=1000, activo=True)
        bag = insert('unidades_medida', nombre='Bolsa anterior', dimension='comercial', factor=1, activo=True)
        item = insert('insumos', nombre='Harina anterior', categoria_id=category, unidad_stock_id=kg, activo=True)
        payload = {'referencia': 'legacy-00001', 'proveedor_id': provider, 'fecha': '2026-10-12',
                   'items': [{'insumo_id': item, 'cantidad': '2', 'unidad_compra_id': bag,
                              'contenido_por_unidad': '5', 'unidad_contenido_id': kg, 'precio_total': '2000.50'}]}
        purchase = insert('compras', proveedor_id=provider, usuario_id=user, referencia=payload['referencia'],
                          huella=huella(CompraCreate.model_validate(payload)), fecha=date(2026, 10, 12), estado='CONFIRMADA')
        insert('items_compra', compra_id=purchase, insumo_id=item, cantidad=2, unidad_compra_id=bag,
               contenido_por_unidad=5, unidad_contenido_id=kg, unidad_stock_id=kg,
               cantidad_micro=10_000_000, precio_centavos=200050)
        insert('existencias', insumo_id=item, cantidad_micro=10_000_001)
        insert('movimientos_stock', insumo_id=item, usuario_id=user, compra_id=purchase,
               clave=f'compra:{purchase}:{item}', tipo='COMPRA', cantidad_micro=10_000_000, motivo='Recepción anterior')
        insert('movimientos_stock', insumo_id=item, usuario_id=user, clave='legacy-micro',
               tipo='AJUSTE', cantidad_micro=1, motivo='Precisión histórica')
        insert('comprobantes', compra_id=purchase, usuario_id=user, tipo='application/pdf',
               huella='a' * 64, contenido=b'%PDF-1.7 QA anterior')
    command.upgrade(config, 'head')
    command.check(config)
    if backend == 'sqlite':
        with engine.connect() as connection:
            assert connection.execute(text('PRAGMA foreign_key_check')).all() == []
    sessions = sessionmaker(bind=engine, expire_on_commit=False)

    def override():
        with sessions() as db:
            try:
                yield db
            except Exception:
                db.rollback()
                raise
    previous = dict(app.dependency_overrides)
    app.dependency_overrides[get_db] = override
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            client.headers['Authorization'] = 'Bearer ' + token
            assert client.get('/auth/me').json()['nombre'] == 'legacy'
            response = client.get('/api/v1/snapshot')
            assert response.status_code == 200, response.text
            snapshot = response.json()
            target = os.getenv('WALOS_TEST_LEGACY_SNAPSHOT_FIXTURE')
            if target and backend == 'sqlite':
                Path(target).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            assert snapshot['stock'][0]['cantidad'] == '10.000001'
            assert snapshot['stock'][0]['version'] == 0
            assert snapshot['stock'][0]['legacy_readonly']
            assert snapshot['catalogo'][0]['unidad']['codigo_ui'] is None
            assert snapshot['catalogo'][0]['vendible'] is False
            original = snapshot['compras'][0]
            assert original['id'] == purchase and original['estado'] == 'CONFIRMADA'
            assert original['nombre_proveedor_snapshot'] is None and original['request_id'] is None
            line = original['items'][0]
            assert line['cantidad'] == '2.000000' and line['cantidad_stock'] == '10.000000'
            assert line['unidad_compra']['id'] == bag and line['unidad_stock']['id'] == kg
            assert line['nombre_snapshot'] is None and line['costo_unitario_centavos'] is None
            assert line['total_centavos'] == 200050 and original['legacy_readonly']
            retry = client.post('/compras', json=payload)
            assert retry.status_code == 201 and retry.json()['id'] == purchase
            assert client.post(f'/compras/{purchase}/confirmar').status_code == 200
            assert len(client.get('/api/v1/snapshot').json()['movimientos']) == 2
            assert client.get(f'/compras/{purchase}/comprobantes/1').content == b'%PDF-1.7 QA anterior'
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)
        engine.dispose()
