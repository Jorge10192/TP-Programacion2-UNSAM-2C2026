"""Circuito real PostgreSQL: tenants, rollback, saldos e idempotencia."""
import os
from concurrent.futures import ThreadPoolExecutor
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import Business, Membership, User
from app.infrastructure.models.base import Base
from app.main import create_app

pytestmark = [pytest.mark.integration, pytest.mark.skipif(
    os.environ.get('RUN_DB_INTEGRATION') != '1', reason='Requiere PostgreSQL descartable migrado')]


@pytest.fixture
def isolated():
    with get_engine().connect() as connection:
        outer = connection.begin()
        app = create_app()
        def override():
            with Session(bind=connection, join_transaction_mode='create_savepoint') as db:
                yield db
        app.dependency_overrides[get_db] = override
        try:
            with TestClient(app) as client:
                yield client, connection
        finally:
            outer.rollback()


def actor(client):
    email = f'commerce-{uuid4().hex}@example.com'
    password = 'Una frase de prueba suficientemente extensa'
    r = client.post('/api/v1/auth/register', json=dict(email=email,password=password,display_name='Persona Demo'))
    assert r.status_code == 201, r.text
    user_id = r.json()['id']
    r = client.post('/api/v1/auth/login', json=dict(email=email,password=password))
    assert r.status_code == 200, r.text
    return {'Authorization':'Bearer '+r.json()['access_token']}, user_id


def post(client, headers, path, data, key=None, expected=201):
    r = client.post('/api/v1'+path, json=data, headers={**headers,'Idempotency-Key':str(key or uuid4())})
    assert r.status_code == expected, r.text
    return r.json()


def business(client, headers, name='Tienda', kind='MIXTO'):
    return post(client,headers,'/businesses',dict(name=name,category='Comercio',activity_kind=kind))['id']


def location(client, headers, bid, name='Principal'):
    return post(client,headers,f'/businesses/{bid}/locations',dict(name=name,kind='LOCAL',address='',mapUrl='',canSell=True,canStore=True))['id']


def item(client, headers, bid, name='Producto', kind='REVENTA', unit='UNIDAD', sku='ART-001'):
    return post(client,headers,f'/businesses/{bid}/catalog',dict(name=name,kind=kind,unit=unit,
        category='General',sku=sku,sellable=True,priceCents=250000,referenceCostCents=100000))['id']


def snapshot(client, headers):
    r = client.get('/api/v1/snapshot',headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()['complete'] is True
    return r.json()['snapshot']


def setup_stock(client, headers, bid, qty=10000, sku='ART-001'):
    loc = location(client,headers,bid)
    product = item(client,headers,bid,sku=sku)
    command = dict(purchasedOn='2026-11-07',supplierId=None,reference='COMPRA-01',notes='',
        lines=[dict(catalogItemId=product,description='Producto',unit='UNIDAD',quantityMilli=qty,unitCostCents=100000)])
    purchase = post(client,headers,f'/businesses/{bid}/purchases',command)['id']
    post(client,headers,f'/businesses/{bid}/purchases/{purchase}/receive',dict(locationId=loc))
    return loc, product, purchase


def open_cash(client, headers, bid, loc=None):
    return post(client,headers,f'/businesses/{bid}/cash-sessions',dict(locationId=loc,openingCashCents=100000))['id']


def sale_command(loc, product, qty=2000, payments=None):
    return dict(locationId=loc,lines=[dict(catalogItemId=product,quantityMilli=qty,unitPriceCents=250000)],
        discountCents=0,payments=payments or [dict(method='EFECTIVO',amountCents=qty*250)],notes='')


def test_full_journey_persists_and_cash_closes_exactly(isolated):
    client,_ = isolated
    headers,_ = actor(client)
    bid = business(client,headers)
    loc, product, purchase = setup_stock(client,headers,bid)
    cash = open_cash(client,headers,bid,loc)
    sale = post(client,headers,f'/businesses/{bid}/sales',sale_command(loc,product))['id']
    post(client,headers,f'/businesses/{bid}/expenses',dict(paidOn='2026-11-07',locationId=loc,
        category='TRANSPORTE',description='Traslado',amountCents=25000,paymentMethod='EFECTIVO',notes=''))
    post(client,headers,f'/businesses/{bid}/cash-sessions/{cash}/close',dict(countedCashCents=575000,notes=''))
    fresh = snapshot(client,headers)
    assert list(fresh['apiStockBalances'].values()) == [8000]
    assert fresh['cashSessionsById'][cash]['closeSnapshot']['expectedCashCents'] == 575000
    assert fresh['cashSessionsById'][cash]['closeSnapshot']['differenceCents'] == 0
    assert fresh['salesById'][sale]['totalCents'] == 500000
    assert fresh['purchasesById'][purchase]['receipt']['locationId'] == loc
    assert snapshot(client,headers)['apiStockBalances'] == fresh['apiStockBalances']


def test_same_sku_allowed_in_different_companies_and_business_reads_filtered(isolated):
    client,_ = isolated
    headers,_ = actor(client)
    a,b = business(client,headers,'Primera'),business(client,headers,'Segunda')
    x,y = item(client,headers,a), item(client,headers,b)
    rows = client.get(f'/api/v1/businesses/{a}/catalog',headers=headers).json()
    assert [r['id'] for r in rows] == [x]
    assert client.get(f'/api/v1/businesses/{a}/catalog/{y}',headers=headers).status_code == 404
    assert snapshot(client,headers)['catalogItemsById'][y]['businessId'] == b
    response=client.post(f'/api/v1/businesses/{a}/catalog',headers={**headers,'Idempotency-Key':str(uuid4())},json=dict(
        name='Otro producto',kind='REVENTA',unit='UNIDAD',category='General',sku='ART-001',sellable=True))
    assert response.status_code == 409


def test_repeated_item_lines_keep_their_own_prices_and_allow_one_free_line(isolated):
    client,_=isolated
    h,_=actor(client)
    bid=business(client,h)
    loc,product,_=setup_stock(client,h,bid)
    open_cash(client,h,bid,loc)
    payload=sale_command(loc,product,qty=1000)
    payload['lines'].append(dict(catalogItemId=product,quantityMilli=1000,unitPriceCents=0))
    sale=post(client,h,f'/businesses/{bid}/sales',payload)['id']
    fresh=snapshot(client,h)
    assert [line['unitPriceCents'] for line in fresh['salesById'][sale]['lines']]==[250000,0]
    assert list(fresh['apiStockBalances'].values())==[8000]


def test_inventory_read_routes_are_scoped_and_do_not_get_caught_by_uuid_detail_route(isolated):
    client,_=isolated
    h,_=actor(client)
    bid=business(client,h)
    setup_stock(client,h,bid)
    result=client.get(f'/api/v1/businesses/{bid}/inventory',headers=h)
    assert result.status_code==200
    assert result.json()[0]['quantityMilli']==10000
    result=client.get(f'/api/v1/businesses/{bid}/inventory/movements',headers=h)
    assert result.status_code==200
    assert result.json()[0]['deltaMilli']==10000


def test_other_user_cannot_read_or_write_business_or_see_its_snapshot(isolated):
    client,_ = isolated
    a,_ = actor(client)
    b,_ = actor(client)
    bid = business(client,a)
    product = item(client,a,bid)
    assert snapshot(client,b)['businessesById'] == {}
    assert client.get(f'/api/v1/businesses/{bid}/catalog',headers=b).status_code == 404
    r=client.post(f'/api/v1/businesses/{bid}/catalog/{product}/primary',json={},headers={**b,'Idempotency-Key':str(uuid4())})
    assert r.status_code == 404
    r=client.post(f'/api/v1/businesses/{bid}/catalog',headers={**b,'Idempotency-Key':str(uuid4())},json=dict(
        name='Intruso',kind='SERVICIO',unit='SERVICIO',category='General',sku='',sellable=True))
    assert r.status_code == 404


def test_cross_company_references_rejected_and_purchase_is_atomic(isolated):
    client,_ = isolated
    h,_ = actor(client)
    a,b = business(client,h,'Primera'),business(client,h,'Segunda')
    loc = location(client,h,a)
    foreign = item(client,h,b)
    payload = dict(purchasedOn='2026-11-07',supplierId=None,lines=[dict(catalogItemId=foreign,
        description='Producto',unit='UNIDAD',quantityMilli=1000,unitCostCents=1000)])
    post(client,h,f'/businesses/{a}/purchases',payload,expected=404)
    assert snapshot(client,h)['purchasesById'] == {}
    assert snapshot(client,h)['apiInventoryMovements'] == []


def test_retries_do_not_duplicate_purchase_receipt_or_sale(isolated):
    client,_ = isolated
    h,_ = actor(client)
    bid=business(client,h)
    loc,product,purchase=setup_stock(client,h,bid)
    post(client,h,f'/businesses/{bid}/purchases/{purchase}/receive',dict(locationId=loc))
    assert len(snapshot(client,h)['apiInventoryMovements']) == 1
    open_cash(client,h,bid,loc)
    key=uuid4()
    payload=sale_command(loc,product)
    first=post(client,h,f'/businesses/{bid}/sales',payload,key)
    again=post(client,h,f'/businesses/{bid}/sales',payload,key,expected=200)
    assert first == again
    changed={**payload,'notes':'Contenido distinto'}
    post(client,h,f'/businesses/{bid}/sales',changed,key,expected=409)
    assert len(snapshot(client,h)['salesById']) == 1
    assert list(snapshot(client,h)['apiStockBalances'].values()) == [8000]


def test_reject_sale_without_stock_and_rollback_all_lines(isolated):
    client,_ = isolated
    h,_=actor(client)
    bid=business(client,h)
    loc,product,_=setup_stock(client,h,bid)
    other=item(client,h,bid,'Otro',sku='ART-002')
    open_cash(client,h,bid,loc)
    payload=sale_command(loc,product)
    payload['lines'].append(dict(catalogItemId=other,quantityMilli=1000,unitPriceCents=250000))
    payload['payments'][0]['amountCents']=750000
    post(client,h,f'/businesses/{bid}/sales',payload,expected=409)
    fresh=snapshot(client,h)
    assert fresh['salesById'] == {}
    assert list(fresh['apiStockBalances'].values()) == [10000]
    assert len(fresh['apiInventoryMovements']) == 1


def test_count_versions_detect_concurrent_change_and_transfer_conserves_stock(isolated):
    client,_=isolated
    h,_=actor(client)
    bid=business(client,h)
    loc,product,_=setup_stock(client,h,bid)
    destination=location(client,h,bid,'Depósito')
    stale=dict(locationId=loc,reason='Control diario',lines=[dict(catalogItemId=product,
        expectedMilli=10000,countedMilli=10000,expectedVersion=1)])
    post(client,h,f'/businesses/{bid}/inventory/transfers',dict(catalogItemId=product,
        sourceLocationId=loc,destinationLocationId=destination,quantityMilli=3000,reason='Mover mercadería'))
    post(client,h,f'/businesses/{bid}/inventory/counts',stale,expected=409)
    assert sorted(snapshot(client,h)['apiStockBalances'].values()) == [3000,7000]
    assert sum(m['deltaMilli'] for m in snapshot(client,h)['apiInventoryMovements']) == 10000


def test_services_without_physical_location_or_stock_and_digital_payments(isolated):
    client,_=isolated
    h,_=actor(client)
    bid=business(client,h,kind='SERVICIOS')
    product=item(client,h,bid,'Asesoramiento',kind='SERVICIO',unit='SERVICIO')
    cash=open_cash(client,h,bid)
    post(client,h,f'/businesses/{bid}/sales',sale_command(None,product,
        payments=[dict(method='TRANSFERENCIA',amountCents=500000)]))
    fresh=snapshot(client,h)
    assert fresh['apiInventoryMovements'] == []
    assert fresh['cashSessionsById'][cash]['serverTotals']['expectedCashCents'] == 100000


def test_worker_cannot_manage_resources_count_or_close_cash(isolated):
    client,connection=isolated
    h,uid=actor(client)
    bid=business(client,h)
    loc,product,_=setup_stock(client,h,bid)
    cash=open_cash(client,h,bid,loc)
    connection.execute(update(Membership).where(Membership.user_id==UUID(uid)).values(role='TRABAJADOR'))
    post(client,h,f'/businesses/{bid}/cash-sessions/{cash}/close',dict(countedCashCents=100000),expected=403)
    post(client,h,f'/businesses/{bid}/inventory/counts',dict(locationId=loc,reason='Control diario',
        lines=[dict(catalogItemId=product,expectedMilli=10000,countedMilli=0,expectedVersion=1)]),expected=403)
    post(client,h,f'/businesses/{bid}/sales',sale_command(loc,product))


def test_inactive_membership_removes_all_business_data(isolated):
    client,connection=isolated
    h,uid=actor(client)
    bid=business(client,h)
    setup_stock(client,h,bid)
    connection.execute(update(Membership).where(Membership.user_id==UUID(uid)).values(status='INACTIVA'))
    fresh=snapshot(client,h)
    assert fresh['businessesById'] == fresh['catalogItemsById'] == fresh['purchasesById'] == {}
    assert fresh['apiInventoryMovements'] == []


@pytest.mark.parametrize(('role','expected'), [
    ('TITULAR_ADMINISTRATIVO',200), ('ADMINISTRADOR',200), ('ENCARGADO',403), ('TRABAJADOR',403),
])
def test_business_edit_applies_jorge_role_policy(isolated, role, expected):
    client, connection = isolated
    headers, uid = actor(client)
    bid = business(client, headers)
    connection.execute(update(Membership).where(Membership.user_id == UUID(uid)).values(role=role))
    response = client.patch(f'/api/v1/businesses/{bid}', json={'name':'Nombre actualizado'},
        headers={**headers, 'Idempotency-Key':str(uuid4())})
    assert response.status_code == expected, response.text
    name = client.get(f'/api/v1/businesses/{bid}', headers=headers).json()['name']
    assert name == ('Nombre actualizado' if expected == 200 else 'Tienda')


def test_business_edit_rejects_foreign_suspended_and_empty_commands(isolated):
    client, connection = isolated
    headers, uid = actor(client)
    outsider, _ = actor(client)
    bid = business(client, headers)
    path = f'/api/v1/businesses/{bid}'
    def patch(auth, body):
        return client.patch(path, json=body, headers={**auth,'Idempotency-Key':str(uuid4())})
    assert patch({}, {'name':'Cambio'}).status_code == 401
    assert patch(outsider, {'name':'Cambio'}).status_code == 404
    assert patch(headers, {}).status_code == 422
    assert patch(headers, {'name':None}).status_code == 422
    connection.execute(update(Business).where(Business.id == UUID(bid)).values(status='SUSPENDIDA'))
    assert patch(headers, {'name':'Cambio'}).status_code == 409
    assert client.get(path, headers=headers).status_code == 200
    assert bid not in snapshot(client,headers)['businessesById']


def test_close_requires_explanation_when_difference_exists_and_blocks_new_sale(isolated):
    client,_=isolated
    h,_=actor(client)
    bid=business(client,h)
    loc,product,_=setup_stock(client,h,bid)
    cash=open_cash(client,h,bid,loc)
    post(client,h,f'/businesses/{bid}/cash-sessions/{cash}/close',dict(countedCashCents=90000),expected=422)
    assert snapshot(client,h)['cashSessionsById'][cash]['status']=='ABIERTA'
    post(client,h,f'/businesses/{bid}/cash-sessions/{cash}/close',dict(countedCashCents=90000,notes='Faltante de prueba'))
    post(client,h,f'/businesses/{bid}/sales',sale_command(loc,product),expected=409)


def test_two_concurrent_sales_cannot_oversell():
    app=create_app()
    with TestClient(app) as client:
        h,uid=actor(client)
        bid=business(client,h)
        loc,product,_=setup_stock(client,h,bid,qty=1000,sku=uuid4().hex)
        open_cash(client,h,bid,loc)
        def attempt(_):
            with TestClient(app) as other:
                return other.post(f'/api/v1/businesses/{bid}/sales',json=sale_command(loc,product,qty=1000),
                    headers={**h,'Idempotency-Key':str(uuid4())}).status_code
        try:
            with ThreadPoolExecutor(max_workers=2) as pool:
                assert sorted(pool.map(attempt,range(2))) == [201,409]
            fresh=snapshot(client,h)
            assert list(fresh['apiStockBalances'].values()) == [0]
            assert len(fresh['salesById']) == 1
        finally:
            cleanup_actor(UUID(uid))


def cleanup_actor(uid):
    with get_engine().begin() as connection:
        bids=list(connection.scalars(select(Business.id).where(Business.founder_user_id==uid)))
        for table in reversed(Base.metadata.sorted_tables):
            if 'business_id' in table.c:
                connection.execute(delete(table).where(table.c.business_id.in_(bids)))
            elif table.name=='businesses':
                connection.execute(delete(table).where(table.c.id.in_(bids)))
            elif 'user_id' in table.c:
                connection.execute(delete(table).where(table.c.user_id==uid))
            elif table.name=='users':
                connection.execute(delete(table).where(table.c.id==uid))
