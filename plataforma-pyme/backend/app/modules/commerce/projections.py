"""DTO de lectura consistente, acotado a membresías activas de la cuenta."""
from sqlalchemy import select

from app.infrastructure.models import Business, Membership
from app.infrastructure.models.commerce import (BusinessSettings, UserPreferences, Location,
    CatalogItem, Supplier, FinancialAccount, Purchase, StockBalance, InventoryOperation,
    StockMovement, CashSession, Sale, Expense)
from app.modules.auth.tokens import now_utc
from app.modules.commerce.service import CommerceService, MANAGERS, ADMINISTRATORS, stamp


def profile_view(db, user):
    prefs = db.get(UserPreferences, user.id)
    return dict(id=str(user.id), displayName=user.display_name, email=user.email_normalizado,
        avatarInitials=prefs.avatar_initials if prefs else '', contactPhone=user.contact_phone or '')


def snapshot_for(db, context):
    pairs = list(db.execute(select(Business, Membership).join(Membership, Membership.business_id == Business.id)
        .where(Membership.user_id == context.user.id, Membership.status == 'ACTIVA', Business.status == 'ACTIVA')
        .order_by(Business.id).with_for_update(read=True)))
    ids = [company.id for company, _ in pairs]
    result = dict(version=1, mode='api', profile=profile_view(db, context.user),
        businessesById={}, membershipsByBusinessId={}, locationsById={}, teamInvitationsById={},
        teamMembersById={}, catalogItemsById={}, suppliersById={}, purchasesById={},
        inventoryOperationsById={}, salesById={}, expensesById={}, cashSessionsById={},
        financialAccountsById={}, qrIntentsById={}, apiInventoryMovements=[], apiStockBalances={},
        apiStockVersions={}, apiCapabilitiesByBusiness={}, apiLegacyRecords=[], apiAsOf=stamp(now_utc()))
    for company, member in pairs:
        key = str(company.id)
        settings = db.get(BusinessSettings, company.id)
        result['businessesById'][key] = dict(id=key, name=company.name, category=company.category,
            kind=company.activity_kind, description=settings.description if settings else '',
            slogan=settings.slogan if settings else '', taxId=settings.tax_id if settings else '',
            initials=''.join(w[0] for w in company.name.split()[:2]).upper(), accent='blue',
            source='server', founderUserId=str(company.founder_user_id),
            administrativeOwnerUserId=str(db.scalar(select(Membership.user_id).where(
                Membership.business_id == company.id, Membership.status == 'ACTIVA',
                Membership.role == 'TITULAR_ADMINISTRATIVO')) or '') or None)
        result['membershipsByBusinessId'][key] = dict(businessId=key, userId=str(member.user_id),
            role=member.role, status=member.status, jobTitle=member.job_title or '')
        manage = member.role in MANAGERS
        result['apiCapabilitiesByBusiness'][key] = dict(purchase=True, receipt=True, sale=True,
            expense=True, count=manage, cash=manage, resources=manage, business=member.role in ADMINISTRATORS)
    if ids:
        def rows(model):
            return db.scalars(select(model).where(model.business_id.in_(ids)).order_by(model.created_at, model.id))

        def base(row):
            return dict(id=str(row.id), businessId=str(row.business_id), createdAt=stamp(row.created_at))

        for row in rows(Location):
            result['locationsById'][str(row.id)] = dict(**base(row), name=row.name, kind=row.kind,
                address=row.address, mapUrl=row.map_url, canSell=row.can_sell, canStore=row.can_store,
                isPrimary=row.is_primary, status=row.status)
        for row in rows(CatalogItem):
            result['catalogItemsById'][str(row.id)] = dict(**base(row), name=row.name, kind=row.kind,
                category=row.category, sku=row.sku, unit=row.unit, description=row.description,
                observations=row.observations, sellable=row.sellable, priceCents=row.price_cents,
                referenceCostCents=row.reference_cost_cents, status=row.status, updatedAt=stamp(row.updated_at))
        for row in rows(Supplier):
            result['suppliersById'][str(row.id)] = dict(**row.details, **base(row),
                status=row.status, updatedAt=stamp(row.updated_at))
        for row in rows(FinancialAccount):
            result['financialAccountsById'][str(row.id)] = dict(**row.details, **base(row),
                status=row.status, isPrimary=row.is_primary, updatedAt=stamp(row.created_at))
        for row in rows(Purchase):
            result['purchasesById'][str(row.id)] = dict(**base(row), requestId=str(row.id),
                supplierId=str(row.supplier_id) if row.supplier_id else None,
                supplierNameSnapshot=row.supplier_name, purchasedOn=row.purchased_on.isoformat(),
                reference=row.reference, notes=row.notes, lines=row.lines, totalCents=row.total_cents,
                receipt=row.receipt, serverStatus='CONFIRMADA' if row.receipt else 'BORRADOR')
        for row in rows(InventoryOperation):
            result['inventoryOperationsById'][str(row.id)] = dict(**base(row), requestId=str(row.id),
                kind=row.kind, **row.snapshot)
        for row in rows(StockMovement):
            result['apiInventoryMovements'].append(dict(**base(row), operationId=str(row.operation_id),
                catalogItemId=str(row.item_id), itemNameSnapshot=row.item_name, unit=row.unit,
                locationId=str(row.location_id), deltaMilli=row.delta_milli, type=row.kind,
                reason=row.reason, reference=row.reference))
        import json
        for row in db.scalars(select(StockBalance).where(StockBalance.business_id.in_(ids))):
            key = json.dumps([str(row.location_id), str(row.item_id)], separators=(',', ':'))
            result['apiStockBalances'][key] = row.quantity_milli
            result['apiStockVersions'][key] = row.version
        for row in rows(Sale):
            result['salesById'][str(row.id)] = dict(**base(row), requestId=str(row.id),
                locationId=str(row.location_id) if row.location_id else None,
                cashSessionId=str(row.cash_session_id), lines=row.lines, payments=row.payments,
                subtotalCents=row.subtotal_cents, discountCents=row.discount_cents,
                totalCents=row.total_cents, notes=row.notes, status='REGISTRADA')
        for row in rows(Expense):
            result['expensesById'][str(row.id)] = dict(**row.details, **base(row), requestId=str(row.id),
                cashSessionId=str(row.cash_session_id))
        for row in rows(CashSession):
            service = CommerceService(db, context, row.business_id)
            result['cashSessionsById'][str(row.id)] = dict(**base(row), openRequestId=str(row.id),
                closeRequestId=row.close_key, locationId=str(row.location_id) if row.location_id else None,
                openingCashCents=row.opening_cents, openedAt=stamp(row.created_at), openedBy=row.opened_by,
                status=row.status, closeSnapshot=row.close_snapshot, serverTotals=service.cash_totals(row))
    return dict(schema_version=2, complete=True, snapshot=result)
