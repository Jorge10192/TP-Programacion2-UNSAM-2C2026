from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
from threading import Event, Thread
from uuid import uuid4

from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

from src.auth.models import Usuario
from src.auth.routes import router as auth_router
from src.compras.models import Compra, Insumo
from src.compras.routes import router as purchases_router
from src.database import session as database
from src.database.session import get_db
from src.inventario.models import Existencia, MovimientoStock
from src.inventario.routes import router as inventory_router
from src.inventario.services import mover_stock
from src.operacion.routes import router
from postgres_support import reset_postgres

PROJECT = Path(__file__).resolve().parents[1]
PASSWORD = 'Walos-prueba-2026'


def fresh_app(override):
    app = FastAPI()
    for included in (auth_router, purchases_router, inventory_router, router):
        app.include_router(included)
    app.dependency_overrides[get_db] = override
    return app


def request_id():
    return str(uuid4())


class Case:
    def __init__(self, client, sessions, override):
        self.client, self.sessions, self.override = client, sessions, override
        self.records = []
        initial = self.snapshot()
        assert any(row['activo'] for row in initial['categorias'])
        assert all(not initial[key] for key in ('catalogo', 'proveedores', 'compras', 'stock', 'movimientos',
                                               'conteos', 'ventas', 'gastos', 'jornadas'))
        prepared = {row['codigo_ui']: row for row in initial['unidades'] if row['codigo_ui']}
        assert prepared['UNIDAD']['factor'] == '1.000000'
        assert prepared['KILOGRAMO']['factor'] == '1000.000000'
        self.provider = self.post('/api/v1/proveedores', {
            'request_id': request_id(), 'nombre': 'Proveedor QA', 'observaciones': ''})['id']
        self.category = self.post('/categorias', {'nombre': 'QA'})['id']
        self.kg, self.unit = prepared['KILOGRAMO']['id'], prepared['UNIDAD']['id']
        self.flour = self.catalog('Harina QA', 'QA-HAR', 'INSUMO', self.kg, False, None)
        self.bags = self.catalog('Bocaditos QA', 'QA-BOC', 'ELABORADO', self.unit, True, 250050)

    def post(self, path, body, record=False):
        result = self.client.post(path, json=body)
        assert result.status_code in (200, 201), result.text
        if record:
            self.records.append((path, deepcopy(body), deepcopy(result.json())))
        return result.json()

    def catalog(self, name, sku, kind, unit, sellable, price):
        return self.post('/api/v1/catalogo', {'request_id': request_id(), 'nombre': name,
            'sku': sku, 'tipo': kind, 'categoria_id': self.category, 'unidad_stock_id': unit,
            'vendible': sellable, 'precio_centavos': price, 'costo_referencia_centavos': 120000,
            'descripcion': '', 'observaciones': ''})['id']

    def snapshot(self):
        response = self.client.get('/api/v1/snapshot')
        assert response.status_code == 200, response.text
        assert response.headers['cache-control'] == 'no-store'
        result = response.json()
        assert result['schema_version'] == 1 and result['complete'] is True
        result.pop('as_of')
        return result

    def stock(self, identifier):
        return next(row for row in self.snapshot()['stock'] if row['insumo_id'] == identifier)

    def purchase(self, reference, amount, record=True):
        return self.post('/api/v1/compras', {'request_id': request_id(), 'proveedor_id': self.provider,
            'fecha': '2026-11-07', 'referencia_comercial': reference, 'observaciones': '',
            'items': [{'insumo_id': self.flour, 'cantidad': amount, 'unidad_compra_id': self.kg,
                       'costo_unitario_centavos': 120000}]}, record)

    def count(self, counted, reason='Carga QA de producto terminado', record=True, include_flour=False):
        rows = []
        for identifier, target in [(self.bags, counted)] + ([(self.flour, self.stock(self.flour)['cantidad'])] if include_flour else []):
            stock = self.stock(identifier)
            rows.append({'insumo_id': identifier, 'cantidad_esperada': stock['cantidad'],
                         'cantidad_contada': target, 'expected_version': stock['version']})
        return self.post('/api/v1/stock/conteos', {'request_id': request_id(),
            'ubicacion_id': 'principal', 'motivo': reason, 'items': rows}, record)

    def open(self, fund, record=True):
        return self.post('/api/v1/jornadas', {'request_id': request_id(), 'ubicacion_id': 'principal',
                                            'fondo_centavos': fund}, record)

    def sale_body(self, session_id, quantity, cents, method='EFECTIVO', label='', discount=0, payments=None):
        return {'request_id': request_id(), 'jornada_id': session_id, 'ubicacion_id': 'principal',
            'items': [{'insumo_id': self.bags, 'cantidad': quantity, 'precio_unitario_centavos': 250050}],
            'descuento_centavos': discount, 'pagos': payments or [{'medio': method, 'importe_centavos': cents}],
            'observaciones': label}

    def expense(self, session_id, amount, category='TRANSPORTE', record=True):
        return self.post('/api/v1/gastos', {'request_id': request_id(), 'jornada_id': session_id,
            'ubicacion_id': 'principal', 'fecha': '2026-11-07', 'categoria': category,
            'concepto': 'Gasto QA', 'importe_centavos': amount, 'medio': 'EFECTIVO', 'observaciones': ''}, record)

    def session(self, identifier):
        return next(row for row in self.snapshot()['jornadas'] if row['id'] == identifier)

    def close_body(self, identifier, amount, reason=''):
        return {'request_id': request_id(), 'expected_version': self.session(identifier)['version'],
                'contado_centavos': amount, 'motivo': reason}

    def reject(self, path, body, status):
        before = self.snapshot()
        result = self.client.post(path, json=body)
        assert result.status_code == status, result.text
        assert self.snapshot() == before, 'rejected command changed persisted state'

    def reload_and_replay(self):
        before = self.snapshot()
        with TestClient(fresh_app(self.override), raise_server_exceptions=False) as restarted:
            restarted.headers.update(self.client.headers)
            previous, self.client = self.client, restarted
            try:
                assert self.snapshot() == before
                maps = {'compras': 'compras', 'jornadas': 'jornadas', 'ventas': 'ventas',
                        'gastos': 'gastos', 'conteos': 'conteos'}
                for path, body, original in self.records:
                    result = restarted.post(path, json=deepcopy(body))
                    assert result.status_code == 200, result.text
                    actual = result.json()
                    assert actual['id'] == original['id']
                    if path.endswith('/recibir'):
                        expected = next(p['recepcion'] for p in before['compras'] if p['id'] == original['compra_id'])
                    else:
                        group = maps['jornadas' if '/cerrar' in path else path.split('/')[-1]]
                        expected = next(row for row in before[group] if row['id'] == original['id'])
                    assert actual == expected
                    assert self.snapshot() == before
            finally:
                self.client = previous


@pytest.fixture(params=['sqlite', 'postgresql'])
def online(request, client, password_hash, monkeypatch):
    engine = None
    if request.param == 'sqlite':
        sessions = client.sessions
        override = client.app.dependency_overrides[get_db]
    else:
        url = os.getenv('WALOS_TEST_POSTGRES_URL')
        if not url:
            pytest.skip('PostgreSQL temporal no configurado')
        reset_postgres(url)
        monkeypatch.setattr(database, 'DATABASE_URL', url)
        command.upgrade(Config(str(PROJECT / 'alembic.ini')), 'head')
        command.check(Config(str(PROJECT / 'alembic.ini')))
        engine = create_engine(url)
        sessions = sessionmaker(bind=engine, expire_on_commit=False)
        with sessions() as db:
            db.add_all([Usuario(nombre='admin', password_hash=password_hash, rol='administrador'),
                        Usuario(nombre='operador', password_hash=password_hash, rol='operador')])
            db.commit()

        def override():
            with sessions() as db:
                try:
                    yield db
                except Exception:
                    db.rollback()
                    raise
    try:
        with TestClient(fresh_app(override), raise_server_exceptions=False) as api:
            response = api.post('/auth/login', json={'nombre': 'admin', 'password': PASSWORD})
            assert response.status_code == 200, response.text
            api.headers['Authorization'] = 'Bearer ' + response.json()['access_token']
            yield Case(api, sessions, override)
    finally:
        if engine:
            engine.dispose()


def test_tres_jornadas_persistentes(online):
    case = online
    closed = {}
    days = [
        ('5', '12', 1000000, [('3', 750150, 'EFECTIVO')], 150000, 1600150, 1600150, '', 5, 9, [1, 1, 1, 1, 1, 1, 3]),
        ('2', '15', 500000, [('4', 1000200, 'TRANSFERENCIA'), ('2', 500100, 'EFECTIVO')],
         50000, 950100, 940100, 'Faltante ficticio QA de 100 pesos', 7, 9, [2, 2, 2, 3, 2, 2, 7]),
        ('1', None, 200000, [('9', 2250450, 'EFECTIVO')], 450450, 2000000, 2000000, '', 8, 0, [3, 3, 2, 4, 3, 3, 9]),
    ]
    for number, (qty, count, fund, sales, expense, expected, counted, reason, flour, bags, counts) in enumerate(days, 1):
        before = case.snapshot()
        purchase = case.purchase(f'QA-C0{number}', qty)
        assert purchase['recepcion'] is None
        assert purchase['total_centavos'] == int(qty) * 120000
        assert case.snapshot()['stock'] == before['stock']
        receipt = case.post(f"/api/v1/compras/{purchase['id']}/recibir", {'ubicacion_id': 'principal'}, True)
        assert receipt['movimientos'][0]['cantidad'] == f'{int(qty):.6f}'
        assert case.snapshot()['jornadas'] == before['jornadas']
        assert case.snapshot()['gastos'] == before['gastos']
        if count:
            adjustment = case.count(count)
            assert adjustment['items'][0]['delta'] == ('12.000000' if number == 1 else '6.000000')
        session = case.open(fund)
        assert session['totales']['esperado_centavos'] == fund
        if number == 3:
            case.reject('/api/v1/ventas', case.sale_body(session['id'], '10', 2500500), 409)
        for sale_number, (quantity, amount, method) in enumerate(sales, 1):
            sold = case.post('/api/v1/ventas', case.sale_body(session['id'], quantity, amount, method,
                             f'QA-J{number}-V{sale_number}'), True)
            assert sold['total_centavos'] == amount
            assert case.stock(case.flour)['cantidad'] == f'{flour:.6f}'
            if number == 2 and sale_number == 1:
                assert case.session(session['id'])['totales']['esperado_centavos'] == fund
                assert case.stock(case.bags)['cantidad'] == '11.000000'
        case.expense(session['id'], expense, 'ALQUILER' if number == 2 else 'TRANSPORTE')
        assert case.session(session['id'])['totales']['esperado_centavos'] == expected
        body = case.close_body(session['id'], counted, reason)
        if number == 2:
            case.reject(f"/api/v1/jornadas/{session['id']}/cerrar", {**body, 'motivo': ''}, 422)
            assert case.session(session['id'])['cierre'] is None
        result = case.post(f"/api/v1/jornadas/{session['id']}/cerrar", body, True)
        assert result['cierre']['esperado_centavos'] == expected
        assert result['cierre']['contado_centavos'] == counted
        assert result['cierre']['diferencia_centavos'] == counted - expected
        assert result['cierre']['motivo'] == reason
        closed[result['id']] = result
        snapshot = case.snapshot()
        assert [len(snapshot['compras']), sum(p['recepcion'] is not None for p in snapshot['compras']),
                len(snapshot['conteos']), len(snapshot['ventas']), len(snapshot['gastos']),
                sum(j['estado'] == 'CERRADA' for j in snapshot['jornadas']), len(snapshot['movimientos'])] == counts
        assert case.stock(case.flour)['cantidad'] == f'{flour:.6f}'
        assert case.stock(case.bags)['cantidad'] == f'{bags:.6f}'
        case.reload_and_replay()
        case.reject(f"/api/v1/jornadas/{session['id']}/cerrar", {**body, 'request_id': request_id()}, 409)
        for identifier, original in closed.items():
            assert case.session(identifier) == original


def test_pagos_descuento_batch_y_fixture(online):
    case = online
    purchase = case.purchase('QA-C01', '5')
    case.post(f"/api/v1/compras/{purchase['id']}/recibir", {'ubicacion_id': 'principal'}, True)
    count = case.count('12', include_flour=True)
    assert len(count['items']) == 2 and count['items'][1]['movimiento_id'] is None
    assert len(case.snapshot()['movimientos']) == 2
    session = case.open(1000000)
    body = case.sale_body(session['id'], '3', 750000, discount=150,
                         payments=[{'medio': 'EFECTIVO', 'importe_centavos': 250000},
                                   {'medio': 'TRANSFERENCIA', 'importe_centavos': 500000}])
    sold = case.post('/api/v1/ventas', body, True)
    assert sold['subtotal_centavos'] == 750150 and sold['total_centavos'] == 750000
    assert len(sold['pagos']) == 2 and len({p['id'] for p in sold['pagos']}) == 2
    assert case.session(session['id'])['totales']['esperado_centavos'] == 1250000
    case.expense(session['id'], 150000)
    closed = case.post(f"/api/v1/jornadas/{session['id']}/cerrar", case.close_body(session['id'], 1100000), True)
    assert closed['cierre']['venta_ids'] == [sold['id']]
    opened = case.open(500000)
    case.reload_and_replay()
    assert case.session(closed['id']) == closed and case.session(opened['id']) == opened
    target = os.getenv('WALOS_TEST_SNAPSHOT_FIXTURE')
    if target and case.sessions.kw['bind'].dialect.name == 'sqlite':
        response = case.client.get('/api/v1/snapshot')
        Path(target).write_text(json.dumps(response.json(), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def test_batch_rechazo_completo_y_control_sin_diferencias(online):
    case = online
    case.count('12')
    stocks = {row['insumo_id']: row for row in case.snapshot()['stock']}
    body = {'request_id': request_id(), 'ubicacion_id': 'principal', 'motivo': 'Control QA completo',
            'items': [{'insumo_id': case.bags, 'cantidad_esperada': '12', 'cantidad_contada': '15',
                       'expected_version': stocks[case.bags]['version']},
                      {'insumo_id': case.flour, 'cantidad_esperada': '0', 'cantidad_contada': '1',
                       'expected_version': 999}]}
    case.reject('/api/v1/stock/conteos', body, 409)
    body['items'][1]['expected_version'] = stocks[case.flour]['version']
    body['items'][1]['cantidad_contada'] = '0.0000001'
    case.reject('/api/v1/stock/conteos', body, 422)
    body['items'] = [{'insumo_id': item, 'cantidad_esperada': row['cantidad'],
                     'cantidad_contada': row['cantidad'], 'expected_version': row['version']}
                    for item, row in stocks.items()]
    before = case.snapshot()
    confirmed = case.post('/api/v1/stock/conteos', body, True)
    after = case.snapshot()
    assert after['stock'] == before['stock'] and after['movimientos'] == before['movimientos']
    assert all(row['movimiento_id'] is None for row in confirmed['items'])
    assert len(after['conteos']) == len(before['conteos']) + 1
    case.reload_and_replay()


def test_ventas_invalidas_reintentos_y_efectivo_duplicado(online):
    case = online
    case.count('12')
    session = case.open(1000000)
    base = case.sale_body(session['id'], '3', 750150)
    for changed in [
        {**base, 'descuento_centavos': 750150},
        {**base, 'pagos': [{'medio': 'EFECTIVO', 'importe_centavos': 750149}]},
        {**base, 'pagos': [{'medio': 'EFECTIVO', 'importe_centavos': 750151}]},
        {**base, 'pagos': [{'medio': 'EFECTIVO', 'importe_centavos': 1}] * 7},
        {**base, 'pagos': [{'medio': 'EFECTIVO', 'importe_centavos': 750150, 'cuenta_financiera_id': 'demo-no'}]},
    ]:
        case.reject('/api/v1/ventas', changed, 422)
    base['pagos'] = [{'medio': 'EFECTIVO', 'importe_centavos': 250000},
                     {'medio': 'EFECTIVO', 'importe_centavos': 500150}]
    sold = case.post('/api/v1/ventas', base, True)
    totals = case.session(session['id'])['totales']
    assert totals['ventas_efectivo_centavos'] == 750150 and totals['venta_ids'] == [sold['id']]
    case.reject('/api/v1/ventas', {**base, 'descuento_centavos': 1}, 409)
    case.reload_and_replay()


def test_roles_y_jornada_obligatoria(online):
    case = online
    case.count('12')
    case.reject('/api/v1/ventas', case.sale_body(9999, '1', 250050, 'TRANSFERENCIA'), 404)
    assert case.client.get('/api/v1/snapshot', headers={'Authorization': 'Bearer invalido'}).status_code == 401
    operator = case.client.post('/auth/login', json={'nombre': 'operador', 'password': PASSWORD}).json()['access_token']
    response = case.client.post('/api/v1/jornadas', headers={'Authorization': 'Bearer ' + operator},
                               json={'request_id': request_id(), 'ubicacion_id': 'principal', 'fondo_centavos': 0})
    assert response.status_code == 403
    case.reject('/api/v1/jornadas', {'request_id': request_id(), 'ubicacion_id': 'otra', 'fondo_centavos': 0}, 404)
    session = case.open(1000000)
    case.reject('/api/v1/jornadas', {'request_id': request_id(), 'ubicacion_id': 'principal', 'fondo_centavos': 0}, 409)
    case.post(f"/api/v1/jornadas/{session['id']}/cerrar", case.close_body(session['id'], 1000000))
    case.reject('/api/v1/ventas', case.sale_body(session['id'], '1', 250050, 'TRANSFERENCIA'), 409)


def test_linea_precio_cero_con_otra_linea_positiva(online):
    case = online
    purchase = case.purchase('Compra para obsequio QA', '1')
    case.post(f"/api/v1/compras/{purchase['id']}/recibir", {'ubicacion_id': 'principal'})
    # A second sellable catalog item is loaded explicitly, never inferred from flour.
    gift = case.catalog('Obsequio QA', 'QA-GIFT', 'REVENTA', case.unit, True, 0)
    stock = case.stock(gift)
    case.post('/api/v1/stock/conteos', {'request_id': request_id(), 'ubicacion_id': 'principal',
        'motivo': 'Carga QA de obsequio terminado', 'items': [{'insumo_id': gift, 'cantidad_esperada': stock['cantidad'],
            'cantidad_contada': '1', 'expected_version': stock['version']}]})
    case.count('1')
    session = case.open(0)
    body = case.sale_body(session['id'], '1', 250050)
    body['items'].append({'insumo_id': gift, 'cantidad': '1', 'precio_unitario_centavos': 0})
    sold = case.post('/api/v1/ventas', body)
    assert sold['total_centavos'] == 250050 and sold['items'][1]['total_centavos'] == 0
    assert case.stock(gift)['cantidad'] == '0.000000'


def test_concurrencia_ultimo_stock_y_cierre(online):
    case = online
    case.count('1')
    session = case.open(0)
    requests = [case.sale_body(session['id'], '1', 250050) for _ in range(2)]
    with ThreadPoolExecutor(max_workers=2) as workers:
        responses = list(workers.map(lambda body: case.client.post('/api/v1/ventas', json=body), requests))
    assert sorted(row.status_code for row in responses) == [201, 409]
    assert case.stock(case.bags)['cantidad'] == '0.000000'
    assert len(case.snapshot()['ventas']) == 1
    body = case.close_body(session['id'], 250050)
    with ThreadPoolExecutor(max_workers=2) as workers:
        responses = list(workers.map(lambda _: case.client.post(f"/api/v1/jornadas/{session['id']}/cerrar", json=body), range(2)))
    assert [row.status_code for row in responses] == [200, 200]
    assert responses[0].json() == responses[1].json()
    opened = case.open(1000)
    close = case.close_body(opened['id'], 1000)
    expense = {'request_id': request_id(), 'jornada_id': opened['id'], 'ubicacion_id': 'principal',
        'fecha': '2026-11-07', 'categoria': 'OTROS', 'concepto': 'Gasto concurrente QA',
        'importe_centavos': 100, 'medio': 'EFECTIVO', 'observaciones': ''}
    with ThreadPoolExecutor(max_workers=2) as workers:
        closing = workers.submit(case.client.post, f"/api/v1/jornadas/{opened['id']}/cerrar", json=close)
        spending = workers.submit(case.client.post, '/api/v1/gastos', json=expense)
        statuses = (closing.result().status_code, spending.result().status_code)
    assert statuses in {(200, 409), (409, 201)}


def test_snapshot_completo_y_consistente(online):
    case = online
    case.count('1')
    with case.sessions() as db:
        for i in range(105):
            row = Insumo(nombre=f'Histórico QA {i}', categoria_id=case.category, unidad_stock_id=case.unit)
            db.add(row)
            db.flush()
            db.add(Existencia(insumo_id=row.id, cantidad_micro=0))
        db.commit()
    before = case.snapshot()
    assert len(before['catalogo']) == 107 and len(before['stock']) == 107
    engine = case.sessions.kw['bind']
    started, finished = Event(), Event()
    failures = []

    def writer():
        try:
            assert started.wait(10)
            with case.sessions() as db:
                mover_stock(db, case.bags, 1_000_000, 1, 'AJUSTE', 'snapshot:' + request_id(), 'Prueba snapshot QA')
                db.commit()
        except Exception as exc:
            failures.append(exc)
        finally:
            finished.set()

    def halfway(connection, cursor, statement, parameters, context, many):
        if not started.is_set() and 'FROM unidades_medida' in statement:
            started.set()
            if engine.dialect.name == 'postgresql':
                assert finished.wait(10), 'writer did not commit during the snapshot read'

    event.listen(engine, 'after_cursor_execute', halfway)
    thread = Thread(target=writer)
    thread.start()
    try:
        snapshot = case.snapshot()
    finally:
        event.remove(engine, 'after_cursor_execute', halfway)
        thread.join(15)
    assert finished.is_set() and not failures
    assert snapshot['stock'] == before['stock'] and snapshot['movimientos'] == before['movimientos']
    assert case.stock(case.bags)['cantidad'] == '2.000000'


def test_cronologia_utc_independiente_de_zona_postgresql_y_legado_sin_zona(online):
    case = online
    original_engine = case.sessions.kw['bind']
    zoned = None
    if original_engine.dialect.name == 'postgresql':
        # Per-connection setting on this disposable test DB only; no ALTER/host TZ.
        zoned = create_engine(original_engine.url, connect_args={
            'options': '-c timezone=America/Argentina/Buenos_Aires'})
        case.sessions.configure(bind=zoned)
        with case.sessions() as db:
            assert db.scalar(text("SELECT current_setting('TimeZone')")) == 'America/Argentina/Buenos_Aires'
            local, utc_clock = db.execute(text("SELECT now()::timestamp, now() AT TIME ZONE 'UTC'")).one()
            assert utc_clock - local == timedelta(hours=3)
    try:
        before = datetime.now(timezone.utc)
        purchase = case.purchase('Cronología UTC QA', '1')
        receipt = case.post(f"/api/v1/compras/{purchase['id']}/recibir", {'ubicacion_id': 'principal'}, True)
        count = case.count('2')
        session = case.open(0)
        sale = case.post('/api/v1/ventas', case.sale_body(session['id'], '1', 250050), True)
        case.reload_and_replay()
        adjustment = case.post('/stock/ajustes', {'referencia': 'ajuste-utc-qa', 'insumo_id': case.flour,
                                               'cantidad': '0.125', 'motivo': 'Ajuste QA con UTC'})
        case.post(f"/compras/{purchase['id']}/anular", {'motivo': 'Anulación QA con UTC'})
        after = datetime.now(timezone.utc)
        current = case.snapshot()
        movement_rows = {row['id']: row for row in current['movimientos']}
        related_times = {
            receipt['movimientos'][0]['id']: receipt['creada_en'],
            count['items'][0]['movimiento_id']: count['creada_en'],
            next(row['id'] for row in current['movimientos'] if row['tipo'] == 'VENTA'): sale['creada_en'],
        }
        assert receipt['fecha_fuente'] == 'RECEPCION_UTC'
        assert receipt['fecha_registrada_sin_zona'] is None
        for identifier, timestamp in related_times.items():
            assert movement_rows[identifier]['creada_en'] == timestamp
        with case.sessions() as db:
            cancellation = next(row for row in current['movimientos'] if row['tipo'] == 'ANULACION')
            assert cancellation['creada_en'] == db.get(Compra, purchase['id']).fecha_anulacion.isoformat(timespec='microseconds') + 'Z'
            assert db.get(MovimientoStock, adjustment['id']).fecha_es_utc is True
            for row in db.query(MovimientoStock).all():
                assert row.fecha_es_utc is True
                assert before <= row.fecha.replace(tzinfo=timezone.utc) <= after
                assert movement_rows[row.id]['fecha_fuente'] == 'MOVIMIENTO_UTC'
                assert movement_rows[row.id]['fecha_registrada_sin_zona'] is None
        target = os.getenv('WALOS_TEST_TIMESTAMP_FIXTURE')
        if target and zoned is not None:
            Path(target + '-new.json').write_text(json.dumps(case.client.get('/api/v1/snapshot').json(), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

        # Simulate pre-fix d91 rows from a local -03 session, with no provenance
        # flag. These are synthetic disposable rows, not an adjustment of history.
        with case.sessions() as db:
            for row in db.query(MovimientoStock).all():
                row.fecha_es_utc = False
                row.fecha -= timedelta(hours=3)
            db.commit()
            raw_before = {row.id: row.fecha for row in db.query(MovimientoStock).all()}
        legacy = case.snapshot()
        legacy_rows = {row['id']: row for row in legacy['movimientos']}
        sources = ['RECEPCION_UTC', 'CONTEO_UTC', 'VENTA_UTC']
        for (identifier, timestamp), source in zip(related_times.items(), sources):
            assert legacy_rows[identifier]['creada_en'] == timestamp
            assert legacy_rows[identifier]['fecha_fuente'] == source
            assert legacy_rows[identifier]['fecha_registrada_sin_zona'] == raw_before[identifier].isoformat(timespec='microseconds')
            assert 'FECHA_ZONA_DESCONOCIDA' not in legacy_rows[identifier]['legacy_reasons']
        for identifier in (adjustment['id'], cancellation['id']):
            row = legacy_rows[identifier]
            assert row['creada_en'] is None and row['fecha_fuente'] == 'LEGACY_SIN_ZONA'
            assert row['fecha_registrada_sin_zona'] == raw_before[identifier].isoformat(timespec='microseconds')
            assert row['legacy_readonly'] and 'FECHA_ZONA_DESCONOCIDA' in row['legacy_reasons']
        with case.sessions() as db:
            assert {row.id: row.fecha for row in db.query(MovimientoStock).all()} == raw_before
        if target and zoned is not None:
            Path(target + '-legacy.json').write_text(json.dumps(case.client.get('/api/v1/snapshot').json(), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    finally:
        if zoned is not None:
            case.sessions.configure(bind=original_engine)
            zoned.dispose()


def test_router_montado_en_aplicacion_real(api):
    response = api.get('/api/v1/snapshot')
    assert response.status_code == 200, 'El orquestador debe montar operacion_router antes del frontend'
