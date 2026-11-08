import type { Snapshot, Business, Location, Invitation, CatalogItem, Supplier, Purchase, ReceiptMovement, Sale, TeamMember } from './models'
import type { CashSession, Expense } from './demo/cashPolicy'
import type { FinancialAccount } from './demo/financialAccountPolicy'
import type { QrIntent } from './demo/qrDemoPolicy'
import { stockBalance, stockKey } from './demo/inventoryPolicy'
import type { InventoryMovement, InventoryOperation } from './demo/inventoryPolicy'
import { saleInventoryMovements } from './demo/salePolicy'
import { inventoryOperationMovements } from './demo/inventoryPolicy'

export function listLocations(snapshot: Snapshot, businessId: string): Location[] {
  if (!findBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.locationsById)
    .filter((location) => location.businessId === businessId)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name, 'es'))
}

export function listInvitations(snapshot: Snapshot, businessId: string): Invitation[] {
  if (!findBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.teamInvitationsById)
    .filter((invite) => invite.businessId === businessId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listCatalog(snapshot: Snapshot, businessId: string): CatalogItem[] {
  if (!findBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.catalogItemsById)
    .filter((item) => item.businessId === businessId)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export function listSuppliers(snapshot: Snapshot, businessId: string): Supplier[] {
  if (!findBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.suppliersById)
    .filter((supplier) => supplier.businessId === businessId)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export function listPurchases(snapshot: Snapshot, businessId: string): Purchase[] {
  if (!findBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.purchasesById).filter((purchase) => purchase.businessId === businessId)
    .sort((a, b) => b.purchasedOn.localeCompare(a.purchasedOn) || b.createdAt.localeCompare(a.createdAt))
}

export function listReceiptMovements(snapshot: Snapshot, businessId: string): ReceiptMovement[] {
  return listPurchases(snapshot, businessId).flatMap((purchase) => purchase.receipt
    ? purchase.receipt.movements.map((movement) => ({
      ...movement,
      businessId,
      purchaseId: purchase.id,
      receiptId: purchase.receipt!.id,
      locationId: purchase.receipt!.locationId,
      createdAt: purchase.receipt!.createdAt,
      source: 'RECEPCION_COMPRA' as const,
    }))
    : [])
}

export function receiptQuantityMilli(
  snapshot: Snapshot, businessId: string, catalogItemId: string, locationId: string,
): number {
  return listReceiptMovements(snapshot, businessId)
    .filter((movement) => movement.catalogItemId === catalogItemId && movement.locationId === locationId)
    .reduce((qty, movement) => qty + movement.quantityMilli, 0)
}

export function listInventoryMovements(snapshot: Snapshot, businessId: string): InventoryMovement[] {
  if (snapshot.mode === 'api') return (snapshot.apiInventoryMovements ?? []).filter((movement) => movement.businessId === businessId)
  const receipts: InventoryMovement[] = listPurchases(snapshot, businessId).flatMap((purchase) =>
    purchase.receipt ? purchase.receipt.movements.map((movement) => {
      const line = purchase.lines.find((candidate) => candidate.id === movement.purchaseLineId)
      return {
        id: movement.id, operationId: purchase.receipt!.id, businessId,
        catalogItemId: movement.catalogItemId, itemNameSnapshot: line?.description ?? 'Artículo',
        unit: movement.unit, locationId: purchase.receipt!.locationId,
        deltaMilli: movement.quantityMilli, type: 'RECEPCION_COMPRA' as const,
        createdAt: purchase.receipt!.createdAt, reason: 'Mercadería recibida',
        reference: purchase.reference || 'Compra DEMO',
      }
    }) : [])
  const sold = Object.values(snapshot.salesById)
    .filter((sale) => sale.businessId === businessId)
    .flatMap(saleInventoryMovements)
  const localOps = Object.values(snapshot.inventoryOperationsById)
    .filter((operation) => operation.businessId === businessId)
    .flatMap(inventoryOperationMovements)
  return [...receipts, ...localOps, ...sold].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
}

export function listFinancialAccounts(snapshot: Snapshot, businessId: string): FinancialAccount[] {
  if (!findBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.financialAccountsById)
    .filter((account) => account.businessId === businessId)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) ||
      Number(b.status === 'ACTIVA') - Number(a.status === 'ACTIVA') ||
      a.label.localeCompare(b.label, 'es-AR'))
}

export function listExpenses(snapshot: Snapshot, businessId: string): Expense[] {
  if (!findBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.expensesById).filter((expense) => expense.businessId === businessId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listCashSessions(snapshot: Snapshot, businessId: string): CashSession[] {
  if (!findBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.cashSessionsById).filter((session) => session.businessId === businessId)
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
}

export function activeCashSession(snapshot: Snapshot, businessId: string, locationId: string | null): CashSession | undefined {
  return listCashSessions(snapshot, businessId).find((session) =>
    session.locationId === locationId && session.status === 'ABIERTA')
}

export function listQrIntents(snapshot: Snapshot, businessId: string): QrIntent[] {
  if (!findBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.qrIntentsById).filter(intent => intent.businessId === businessId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listSales(snapshot: Snapshot, businessId: string): Sale[] {
  if (!findBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.salesById).filter((sale) => sale.businessId === businessId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function inventoryBalanceMilli(
  snapshot: Snapshot, businessId: string, catalogItemId: string, locationId: string,
): number {
  if (snapshot.locationsById[locationId]?.businessId !== businessId || snapshot.catalogItemsById[catalogItemId]?.businessId !== businessId) return 0
  if (snapshot.mode === 'api') return snapshot.apiStockBalances?.[stockKey(locationId, catalogItemId)] ?? 0
  return stockBalance(listInventoryMovements(snapshot, businessId), locationId, catalogItemId)
}

export function listInventoryOperations(snapshot: Snapshot, businessId: string): InventoryOperation[] {
  if (!findBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.inventoryOperationsById)
    .filter((operation) => operation.businessId === businessId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listTeamMembers(snapshot: Snapshot, businessId: string): TeamMember[] {
  if (!findBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.teamMembersById)
    .filter((member) => member.businessId === businessId && member.status === 'ACTIVA')
    .sort((a, b) => a.email.localeCompare(b.email))
}

export function listBusinesses(snapshot: Snapshot): Business[] {
  return Object.values(snapshot.businessesById).filter((item) => snapshot.mode === 'api' || snapshot.membershipsByBusinessId[item.id]?.status === 'ACTIVA')
}

export function findBusiness(snapshot: Snapshot, id: string): Business | undefined {
  if (snapshot.mode === 'api') return snapshot.businessesById[id]
  if (snapshot.membershipsByBusinessId[id]?.status !== 'ACTIVA') return undefined
  return snapshot.businessesById[id]
}
