import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DataContext } from '../src/data/dataContext'
import { NavigationGuardContext } from '../src/app/unsavedChanges'
import { createNavigationGuard } from '../src/app/navigationGuard'
import { mapSnapshot } from '../src/data/api/snapshot'
import { unavailableGateway } from '../src/data/gateway'
import { CatalogPage } from '../src/features/catalog/CatalogPage'
import { CatalogDetailDialog } from '../src/features/catalog/CatalogDetailDialog'
import { SuppliersPage } from '../src/features/suppliers/SuppliersPage'
import { SupplierForm } from '../src/features/suppliers/SupplierForm'
import { SupplierDetailDialog } from '../src/features/suppliers/SupplierDetailDialog'
import { InventoryPage } from '../src/features/inventory/InventoryPage'
import { SaleCatalogPicker } from '../src/features/sales/SaleCatalogPicker'
import { SalesPage, SaleForm } from '../src/features/sales/SalesPage'
import { PurchasesPage } from '../src/features/purchases/PurchasesPage'
import { CashSessionsPage } from '../src/features/cash/CashSessionsPage'
import { PurchaseDetailDialog } from '../src/features/purchases/PurchaseDetailDialog'
import { Welcome } from '../src/features/dashboard/Dashboards'
import { DemoPhoto, DemoImagePicker } from '../src/features/common/DemoPhoto'
import { LegacyRecords } from '../src/features/common/LegacyRecords'
import type { AppRuntime, AppState } from '../src/data/appRuntime'
import type { ReactNode } from 'react'

export function renderReadonlyFixture(raw: Parameters<typeof mapSnapshot>[0]) {
  const dto = raw as { contexto: { user: { id: number; nombre: string; rol: 'administrador' } } }
  const snapshot = mapSnapshot(raw, { id: 'user:' + dto.contexto.user.id, name: dto.contexto.user.nombre, role: dto.contexto.user.rol })
  const runtime = { getSnapshot: () => ({ mode: 'api', snapshot }), subscribe: () => () => {} } as AppRuntime
  return renderToStaticMarkup(<DataContext.Provider value={runtime}><LegacyRecords/></DataContext.Provider>)
}

export function renderOnlineFixture(raw: Parameters<typeof mapSnapshot>[0]) {
  const dto = raw as { contexto: { user: { id: number; nombre: string; rol: 'administrador' } } }
  const user = { id: 'user:' + dto.contexto.user.id, name: dto.contexto.user.nombre, role: dto.contexto.user.rol }
  const snapshot = mapSnapshot(raw, user)
  const business = snapshot.businessesById.walos
  const catalog = Object.values(snapshot.catalogItemsById)
  const suppliers = Object.values(snapshot.suppliersById)
  const locations = Object.values(snapshot.locationsById)
  const movements = snapshot.apiInventoryMovements ?? []
  const sales = Object.values(snapshot.salesById), sessions = Object.values(snapshot.cashSessionsById)
  let state: AppState = { mode: 'api', snapshot, gateway: unavailableGateway(), session: { status: 'authenticated', user, error: null }, loadState: 'ready', error: null, recovery: null,
    capabilities: { photos: false, multiBusiness: false, team: false, qr: false, financialAccounts: false, transfers: false, services: false, supplierRequired: true, cashRequired: true } }
  const runtime = { getSnapshot: () => state, subscribe: () => () => {} } as AppRuntime
  const guard = createNavigationGuard(() => { throw new Error('No expected dialog during render') }, () => {})
  const wrap = (content: ReactNode) => renderToStaticMarkup(createElement(DataContext.Provider, { value: runtime }, createElement(NavigationGuardContext.Provider, { value: guard }, content)))
  const none = () => {}
  const rendered = {
    catalog: wrap(<CatalogPage business={business} items={catalog}/>),
    catalogDetail: wrap(<CatalogDetailDialog item={catalog[0]} onClose={none} onEdit={none}/>),
    suppliers: wrap(<SuppliersPage business={business} suppliers={suppliers}/>),
    supplierDetail: wrap(<SupplierDetailDialog business={business} supplier={suppliers[0]} onClose={none} onEdit={none}/>),
    inventory: wrap(<InventoryPage business={business} catalog={catalog} locations={locations} movements={movements} operations={Object.values(snapshot.inventoryOperationsById)} initialTab="stock"/>),
    picker: wrap(<SaleCatalogPicker business={business} items={catalog} locationId="principal" movements={movements} selectedMilli={new Map()} selectedIds={new Set()} onAdd={none}/>),
    sales: wrap(<SalesPage business={business} items={catalog} locations={locations} movements={movements} sales={sales} sessions={sessions} accounts={[]} qrIntents={[]}/>),
    purchase: wrap(<PurchaseDetailDialog business={business} purchase={Object.values(snapshot.purchasesById)[0]} locations={locations} onClose={none}/>),
    home: wrap(<Welcome businesses={[business]} navigate={none}/>),
    placeholders: wrap(<><DemoPhoto target={{ scope: 'catalog', businessId: 'walos', entityId: catalog[0].id }} alt="Artículo" fallback={<span>Sin foto</span>}/><DemoImagePicker target={{ scope: 'supplier', businessId: 'walos', entityId: suppliers[0].id }} label="Proveedor"/></>),
    supplierForm: wrap(<SupplierForm businessName={business.name} onSave={async () => {}} onCancel={none}/>),
    purchasesEmpty: wrap(<PurchasesPage business={business} purchases={[]} catalog={catalog} suppliers={suppliers} locations={locations}/>),
    salesEmpty: wrap(<SalesPage business={business} items={catalog} locations={locations} movements={movements} sales={[]} sessions={sessions} accounts={[]} qrIntents={[]}/>),
    saleForm: wrap(<SaleForm business={business} items={catalog} locations={locations} movements={movements} sessions={sessions} accounts={[]} onSaved={none} onQrCreated={none} onCancel={none}/>),
    cash: wrap(<CashSessionsPage business={business} locations={locations} sessions={sessions} sales={sales} expenses={Object.values(snapshot.expensesById)}/>),
  }
  // Copy-only demo checks: local photo access stays disabled in this Node render.
  state = { ...state, mode: 'demo', capabilities: { ...state.capabilities, services: true, qr: true } }
  return { ...rendered,
    demoSupplierDetail: wrap(<SupplierDetailDialog business={business} supplier={suppliers[0]} onClose={none} onEdit={none}/>),
    demoSupplierForm: wrap(<SupplierForm businessName={business.name} onSave={async () => {}} onCancel={none}/>),
    demoPurchasesEmpty: wrap(<PurchasesPage business={business} purchases={[]} catalog={[]} suppliers={[]} locations={[]}/>),
    demoSaleForm: wrap(<SaleForm business={business} items={[]} locations={[]} movements={[]} sessions={[]} accounts={[]} onSaved={none} onQrCreated={none} onCancel={none}/>),
  }
}
