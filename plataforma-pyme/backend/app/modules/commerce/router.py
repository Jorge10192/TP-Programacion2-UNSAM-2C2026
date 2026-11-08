from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pydantic import UUID4
from sqlalchemy import select

from app.api.dependencies import get_db
from app.infrastructure.models import Membership
from app.infrastructure.models.commerce import (CatalogItem, Supplier, Location, FinancialAccount, UserPreferences)
from app.modules.auth.dependencies import current_auth
from app.modules.commerce import schemas as dto
from app.modules.commerce.projections import profile_view, snapshot_for
from app.modules.commerce.service import CommerceService, fail

router = APIRouter(tags=['operacion multiempresa'])


@router.get('/snapshot')
def snapshot(response: Response, context=Depends(current_auth), db=Depends(get_db)):
    response.headers['Cache-Control'] = 'no-store'
    return snapshot_for(db, context)


@router.put('/profile')
def profile(data: dto.ProfileInput, context=Depends(current_auth), db=Depends(get_db)):
    if data.email.casefold() != context.user.email_normalizado:
        fail('El correo de acceso no se modifica desde el perfil')
    context.user.display_name = data.displayName
    context.user.contact_phone = data.contactPhone or None
    prefs = db.get(UserPreferences, context.user.id)
    if prefs is None:
        prefs = UserPreferences(user_id=context.user.id)
        db.add(prefs)
    prefs.avatar_initials = data.avatarInitials.upper()
    db.commit()
    return profile_view(db, context.user)


def command(db, context, business_id, key, payload, operation, handler, response, managers=False, administrators=False, success_status=201):
    service = CommerceService(db, context, business_id)
    result, created = service.run(operation, key, payload, lambda data: handler(service, data), managers, administrators)
    response.status_code = success_status if created else 200
    response.headers['Cache-Control'] = 'no-store'
    return result


@router.post('/businesses/{business_id}/locations')
def create_location(business_id: UUID, data: dto.LocationInput, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    return command(db, context, business_id, key, data, 'location:create', lambda s,d:s.save_location(d), response, managers=True)


@router.put('/businesses/{business_id}/locations/{identifier}')
def update_location(business_id: UUID, identifier: UUID, data: dto.LocationInput, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    return command(db, context, business_id, key, data, f'location:{identifier}:update', lambda s,d:s.save_location(d,identifier), response, managers=True)


@router.post('/businesses/{business_id}/catalog')
def create_catalog(business_id: UUID, data: dto.CatalogInput, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    return command(db, context, business_id, key, data, 'catalog:create', lambda s,d:s.save_catalog(d), response, managers=True)


@router.put('/businesses/{business_id}/catalog/{identifier}')
def update_catalog(business_id: UUID, identifier: UUID, data: dto.CatalogInput, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    return command(db, context, business_id, key, data, f'catalog:{identifier}:update', lambda s,d:s.save_catalog(d,identifier), response, managers=True)


@router.post('/businesses/{business_id}/suppliers')
def create_supplier(business_id: UUID, data: dto.SupplierInput, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    return command(db, context, business_id, key, data, 'supplier:create', lambda s,d:s.save_supplier(d), response, managers=True)


@router.put('/businesses/{business_id}/suppliers/{identifier}')
def update_supplier(business_id: UUID, identifier: UUID, data: dto.SupplierInput, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    return command(db, context, business_id, key, data, f'supplier:{identifier}:update', lambda s,d:s.save_supplier(d,identifier), response, managers=True)


@router.post('/businesses/{business_id}/accounts')
def create_account(business_id: UUID, data: dto.FinancialAccountInput, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    return command(db, context, business_id, key, data, 'account:create', lambda s,d:s.save_account(d), response, managers=True)


@router.put('/businesses/{business_id}/accounts/{identifier}')
def update_account(business_id: UUID, identifier: UUID, data: dto.FinancialAccountInput, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    return command(db, context, business_id, key, data, f'account:{identifier}:update', lambda s,d:s.save_account(d,identifier), response, managers=True)


RESOURCE_MODELS = dict(locations=Location, catalog=CatalogItem, suppliers=Supplier, accounts=FinancialAccount)


@router.patch('/businesses/{business_id}/{resource}/{identifier}/status')
def status(business_id: UUID, resource: str, identifier: UUID, data: dto.StatusInput, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    if resource not in RESOURCE_MODELS:
        fail('Recurso no disponible', 404)
    return command(db, context, business_id, key, data, f'{resource}:{identifier}:status',
        lambda s,d:s.set_status(RESOURCE_MODELS[resource],identifier,d), response, managers=True)


@router.post('/businesses/{business_id}/{resource}/{identifier}/primary')
def primary(business_id: UUID, resource: str, identifier: UUID, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    if resource not in {'locations','accounts'}:
        fail('Recurso no disponible', 404)
    return command(db, context, business_id, key, dto.Input(), f'{resource}:{identifier}:primary',
        lambda s,d:s.set_primary(RESOURCE_MODELS[resource],identifier), response, managers=True)


@router.post('/businesses/{business_id}/purchases')
def purchase(business_id: UUID, data: dto.PurchaseInput, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    return command(db, context, business_id, key, data, 'purchase:create', lambda s,d:s.create_purchase(d), response)


@router.post('/businesses/{business_id}/purchases/{identifier}/receive')
def receive(business_id: UUID, identifier: UUID, data: dto.ReceiptInput, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    return command(db, context, business_id, key, data, f'purchase:{identifier}:receive', lambda s,d:s.receive_purchase(identifier,d), response)


@router.post('/businesses/{business_id}/inventory/counts')
def count(business_id: UUID, data: dto.CountInput, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    return command(db, context, business_id, key, data, 'stock:count', lambda s,d:s.count(d), response, managers=True)


@router.post('/businesses/{business_id}/inventory/transfers')
def transfer(business_id: UUID, data: dto.TransferInput, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    return command(db, context, business_id, key, data, 'stock:transfer', lambda s,d:s.transfer(d), response, managers=True)


@router.post('/businesses/{business_id}/sales')
def sale(business_id: UUID, data: dto.SaleInput, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    return command(db, context, business_id, key, data, 'sale:create', lambda s,d:s.create_sale(d), response)


@router.post('/businesses/{business_id}/expenses')
def expense(business_id: UUID, data: dto.ExpenseInput, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    return command(db, context, business_id, key, data, 'expense:create', lambda s,d:s.create_expense(d), response)


@router.post('/businesses/{business_id}/cash-sessions')
def cash_open(business_id: UUID, data: dto.CashOpen, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    return command(db, context, business_id, key, data, 'cash:open', lambda s,d:s.create_cash(d), response, managers=True)


@router.post('/businesses/{business_id}/cash-sessions/{identifier}/close')
def cash_close(business_id: UUID, identifier: UUID, data: dto.CashClose, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    result = command(db, context, business_id, key, data, f'cash:{identifier}:close', lambda s,d:s.close_cash(identifier,d), response, managers=True)
    return result


@router.patch('/businesses/{business_id}')
def business_details(business_id: UUID, data: dto.BusinessPatch, response: Response,
        key: UUID4 = Header(alias='Idempotency-Key'), context=Depends(current_auth), db=Depends(get_db)):
    return command(db, context, business_id, key, data, 'business:update', lambda s,d:s.update_business(d), response, administrators=True, success_status=200)


@router.put('/businesses/{business_id}/membership/job-title')
def job_title(business_id: UUID, data: dto.JobTitleInput, context=Depends(current_auth), db=Depends(get_db)):
    service = CommerceService(db, context, business_id)
    service.authorize(write=True)
    service.member.job_title = data.jobTitle or None
    db.commit()
    return {'id': str(service.member.id)}


@router.get('/businesses/{business_id}/inventory')
def inventory(business_id: UUID, response: Response, context=Depends(current_auth), db=Depends(get_db)):
    CommerceService(db, context, business_id).authorize()
    from app.infrastructure.models.commerce import StockBalance
    response.headers['Cache-Control'] = 'no-store'
    return [dict(locationId=str(row.location_id), catalogItemId=str(row.item_id), quantityMilli=row.quantity_milli, version=row.version)
        for row in db.scalars(select(StockBalance).where(StockBalance.business_id == business_id))]


COLLECTIONS = dict(locations='locationsById', catalog='catalogItemsById', suppliers='suppliersById',
    accounts='financialAccountsById', purchases='purchasesById', sales='salesById',
    expenses='expensesById', **{'cash-sessions':'cashSessionsById', 'inventory-operations':'inventoryOperationsById'})


@router.get('/businesses/{business_id}/{resource}')
def collection(business_id: UUID, resource: str, response: Response,
        context=Depends(current_auth), db=Depends(get_db)):
    if resource not in COLLECTIONS:
        fail('Recurso no disponible', 404)
    CommerceService(db, context, business_id).authorize()
    values = snapshot_for(db, context)['snapshot'][COLLECTIONS[resource]].values()
    response.headers['Cache-Control'] = 'no-store'
    return [row for row in values if row['businessId'] == str(business_id)]


@router.get('/businesses/{business_id}/inventory/movements')
def movements(business_id: UUID, response: Response, context=Depends(current_auth), db=Depends(get_db)):
    CommerceService(db, context, business_id).authorize()
    response.headers['Cache-Control'] = 'no-store'
    return [row for row in snapshot_for(db, context)['snapshot']['apiInventoryMovements'] if row['businessId'] == str(business_id)]


@router.get('/businesses/{business_id}/{resource}/{identifier}')
def detail(business_id: UUID, resource: str, identifier: UUID, response: Response,
        context=Depends(current_auth), db=Depends(get_db)):
    values = collection(business_id, resource, response, context, db)
    row = next((row for row in values if row['id'] == str(identifier)), None)
    if row is None:
        fail('Recurso no disponible', 404)
    return row
