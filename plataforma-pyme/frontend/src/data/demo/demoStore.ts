/**
 * Única fuente DEMO del perfil global y las empresas.
 * localStorage es almacenamiento del prototipo, NO autenticación ni aislamiento seguro.
 * No usar datos comerciales o personales verdaderos.
 */
import { useSyncExternalStore } from 'react'
import { validateGoogleMapsLink } from './mapsLinks'
import { canReplyToInvitation, displayInvitationStatus, invitationExpiresAt, normalizeInviteInput } from './teamPolicy'
import type { InviteRole, InvitationStatus } from './teamPolicy'
import { catalogNameKey, normalizeCatalogInput } from './catalogPolicy'
import type { CatalogInput } from './catalogPolicy'
import { normalizeSupplierInput, supplierNameKey } from './supplierPolicy'
import type { SupplierInput } from './supplierPolicy'
import { lineTotalCents, normalizePurchaseInput, physicalPurchaseLines, sumLineTotals } from './purchasePolicy'
import type { PurchaseInput, PurchaseLineSnapshot, PurchaseReceipt } from './purchasePolicy'
import { checkedCountDifference, countDifference, inventoryOperationMovements, normalizeStockReason, requireTransferStock, stockBalance, validateStockMilli } from './inventoryPolicy'
import type { InventoryCountInput, InventoryCountLine, InventoryMovement, InventoryOperation } from './inventoryPolicy'
import { normalizeSaleInput, saleAmounts, saleInventoryMovements, validateSalePayments, validSaleQuantity } from './salePolicy'
import type { SaleInput, SaleLineSnapshot, SalePayment } from './salePolicy'
import { cashCents, cashSessionTotals, cashText, makeCloseSnapshot, normalizeExpense } from './cashPolicy'
import type { CashCloseInput, DemoCashSession, DemoExpense, ExpenseInput } from './cashPolicy'
import { accountSupportsDeclaredPayment, financialAccountKey, normalizeFinancialAccountInput } from './financialAccountPolicy'
import type { DemoFinancialAccount, FinancialAccountInput } from './financialAccountPolicy'

export type BusinessKind = 'PRODUCTOS' | 'SERVICIOS' | 'MIXTO'
export type Accent = 'mint' | 'blue' | 'violet'
export type DemoProfile = { id: 'demo-user'; displayName: string; email: string; avatarInitials: string; contactPhone: string }
export function profileInitials(profile: Pick<DemoProfile, 'displayName' | 'avatarInitials'>): string {
  return profile.avatarInitials ||
    profile.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() ||
    'UD'
}

export type DemoBusiness = {
  id: string
  name: string
  category: string
  kind: BusinessKind
  description: string
  slogan: string
  taxId: string
  initials: string
  accent: Accent
  source: 'fixture' | 'created'
  founderUserId: 'demo-user'
  administrativeOwnerUserId: 'demo-user'
}
export type DemoMembership = {
  businessId: string
  userId: 'demo-user'
  role: 'TITULAR_ADMINISTRATIVO'
  status: 'ACTIVA'
  jobTitle: string
}
export type LocationKind = 'LOCAL' | 'FERIA' | 'DEPOSITO' | 'OFICINA' | 'OTRO'
export type DemoLocation = {
  id: string
  businessId: string
  name: string
  kind: LocationKind
  address: string
  mapUrl: string
  canSell: boolean
  canStore: boolean
  isPrimary: boolean
  status: 'ACTIVA' | 'PAUSADA'
}
export type LocationInput = Pick<DemoLocation, 'name' | 'kind' | 'address' | 'mapUrl' | 'canSell' | 'canStore'>
export const locationKindLabels: Record<LocationKind, string> = {
  LOCAL: 'Local o sucursal',
  FERIA: 'Feria o punto temporal',
  DEPOSITO: 'Depósito',
  OFICINA: 'Oficina o espacio de trabajo',
  OTRO: 'Otro espacio',
}

export type DemoInvitation = {
  id: string
  businessId: string
  email: string
  role: InviteRole
  status: InvitationStatus
  createdAt: string
  expiresAt: string
  memberId?: string
}
export type DemoTeamMember = {
  id: string
  businessId: string
  email: string
  role: InviteRole
  status: 'ACTIVA'
  joinedAt: string
  sourceInvitationId: string
}

export type DemoCatalogItem = CatalogInput & {
  id: string
  businessId: string
  status: 'ACTIVO' | 'INACTIVO'
  createdAt: string
  updatedAt: string
}

export type DemoSupplier = SupplierInput & {
  id: string
  businessId: string
  status: 'ACTIVO' | 'INACTIVO'
  createdAt: string
  updatedAt: string
}

export type DemoPurchase = Omit<PurchaseInput, 'lines'> & {
  id: string
  requestId: string
  businessId: string
  supplierNameSnapshot: string
  lines: PurchaseLineSnapshot[]
  totalCents: number
  createdAt: string
  receipt: PurchaseReceipt | null
}

export type DemoSale = {
  id: string; requestId: string; businessId: string; locationId: string | null
  lines: SaleLineSnapshot[]; subtotalCents: number; discountCents: number
  totalCents: number; payments: SalePayment[]; notes: string
  createdAt: string; status: 'REGISTRADA_DEMO'; cashSessionId?: string | null
}

export type DemoReceiptMovement = PurchaseReceipt['movements'][number] & {
  businessId: string
  purchaseId: string
  receiptId: string
  locationId: string
  createdAt: string
  source: 'RECEPCION_COMPRA'
}

export type DemoSnapshot = {
  version: 1
  profile: DemoProfile
  businessesById: Record<string, DemoBusiness>
  membershipsByBusinessId: Record<string, DemoMembership>
  locationsById: Record<string, DemoLocation>
  teamInvitationsById: Record<string, DemoInvitation>
  teamMembersById: Record<string, DemoTeamMember>
  catalogItemsById: Record<string, DemoCatalogItem>
  suppliersById: Record<string, DemoSupplier>
  purchasesById: Record<string, DemoPurchase>
  inventoryOperationsById: Record<string, InventoryOperation>
  salesById: Record<string, DemoSale>
  expensesById: Record<string, DemoExpense>
  cashSessionsById: Record<string, DemoCashSession>
  financialAccountsById: Record<string, DemoFinancialAccount>
}

const STORAGE_KEY = 'asistente-pyme.e1a2.demo.v1'
const fixtures: DemoBusiness[] = [
  { id: 'walos-demo', name: 'WALOS', category: 'Elaboración de productos', kind: 'PRODUCTOS', description: '', slogan: '', taxId: '', initials: 'W', accent: 'mint', source: 'fixture', founderUserId: 'demo-user', administrativeOwnerUserId: 'demo-user' },
  { id: 'comercio-demo', name: 'Comercio Ejemplo', category: 'Reventa de productos', kind: 'PRODUCTOS', description: '', slogan: '', taxId: '', initials: 'C', accent: 'blue', source: 'fixture', founderUserId: 'demo-user', administrativeOwnerUserId: 'demo-user' },
  { id: 'servicios-demo', name: 'Servicios Ejemplo', category: 'Prestación de servicios', kind: 'SERVICIOS', description: '', slogan: '', taxId: '', initials: 'S', accent: 'violet', source: 'fixture', founderUserId: 'demo-user', administrativeOwnerUserId: 'demo-user' },
]

export const kindLabels: Record<BusinessKind, string> = {
  PRODUCTOS: 'Venta o elaboración de productos',
  SERVICIOS: 'Prestación de servicios',
  MIXTO: 'Productos y servicios',
}

function membership(id: string): DemoMembership {
  return { businessId: id, userId: 'demo-user', role: 'TITULAR_ADMINISTRATIVO', status: 'ACTIVA', jobTitle: '' }
}

function defaults(): DemoSnapshot {
  return {
    version: 1,
    profile: { id: 'demo-user', displayName: 'Usuario DEMO', email: '', avatarInitials: '', contactPhone: '' },
    businessesById: Object.fromEntries(fixtures.map((item) => [item.id, item])),
    membershipsByBusinessId: Object.fromEntries(fixtures.map((item) => [item.id, membership(item.id)])),
    locationsById: {},
    teamInvitationsById: {},
    teamMembersById: {},
    catalogItemsById: {},
    suppliersById: {},
    purchasesById: {},
    inventoryOperationsById: {},
    salesById: {},
    expensesById: {},
    cashSessionsById: {},
    financialAccountsById: {},
  }
}

type Stored = { version: 1; profile?: unknown; createdBusinesses?: unknown; fixtureEdits?: unknown; memberJobs?: unknown; locations?: unknown; teamInvitations?: unknown; teamMembers?: unknown; catalogItems?: unknown; suppliers?: unknown; purchases?: unknown; inventoryOperations?: unknown; sales?: unknown; expenses?: unknown; cashSessions?: unknown; financialAccounts?: unknown }

export type EditableBusinessField = 'name' | 'category' | 'description' | 'slogan' | 'taxId'
export type BusinessDetailsPatch = Partial<Pick<DemoBusiness, EditableBusinessField>>

function editableFields(business: DemoBusiness): BusinessDetailsPatch {
  return { name: business.name, category: business.category, description: business.description, slogan: business.slogan, taxId: business.taxId }
}

function cleanEditable(raw: unknown): BusinessDetailsPatch {
  if (!isRecord(raw)) return {}
  const patch: BusinessDetailsPatch = {}
  if (typeof raw.name === 'string' && raw.name.trim().length >= 2 && raw.name.trim().length <= 80) patch.name = raw.name.trim()
  if (typeof raw.category === 'string' && raw.category.length <= 120) patch.category = raw.category.trim() || 'Sin rubro especificado'
  if (typeof raw.description === 'string' && raw.description.length <= 350) patch.description = raw.description.trim()
  if (typeof raw.slogan === 'string' && raw.slogan.length <= 120) patch.slogan = raw.slogan.trim()
  if (typeof raw.taxId === 'string' && raw.taxId.length <= 15 && (/^$|^\d{11}$|^\d{2}-\d{8}-\d$/.test(raw.taxId))) patch.taxId = raw.taxId
  return patch
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function validCreated(value: unknown): value is DemoBusiness {
  if (!isRecord(value)) return false
  return typeof value.id === 'string' && /^demo-business-[a-z0-9-]{16,}$/i.test(value.id)
    && typeof value.name === 'string' && value.name.trim().length >= 2 && value.name.length <= 80
    && typeof value.category === 'string' && value.category.length <= 120
    && typeof value.description === 'string' && value.description.length <= 350
    && ['PRODUCTOS', 'SERVICIOS', 'MIXTO'].includes(String(value.kind))
    && value.source === 'created' && value.founderUserId === 'demo-user'
    && value.administrativeOwnerUserId === 'demo-user'
}

function safeLoadedMapLink(input: string): string {
  try {
    return validateGoogleMapsLink(input)
  } catch {
    // Un enlace inválido no debe borrar los datos restantes de una ubicación.
    return ''
  }
}

function validLocation(raw: unknown): raw is DemoLocation {
  if (!isRecord(raw)) return false
  return typeof raw.id === 'string' && /^demo-location-[a-f0-9-]{36}$/.test(raw.id)
    && typeof raw.businessId === 'string'
    && typeof raw.name === 'string' && raw.name.trim().length >= 2 && raw.name.length <= 80
    && ['LOCAL', 'FERIA', 'DEPOSITO', 'OFICINA', 'OTRO'].includes(String(raw.kind))
    && typeof raw.address === 'string' && raw.address.length <= 160
    && typeof raw.canSell === 'boolean' && typeof raw.canStore === 'boolean'
    && typeof raw.isPrimary === 'boolean'
    && ['ACTIVA', 'PAUSADA'].includes(String(raw.status))
}

function normalizeLocationInput(input: LocationInput): LocationInput {
  const name = requiredText(input.name, 'El nombre de la ubicación', 2, 80)
  const address = input.address.trim()
  const mapUrl = validateGoogleMapsLink(input.mapUrl)
  if (address.length > 160) throw new Error('La referencia de ubicación admite hasta 160 caracteres.')
  if (!['LOCAL', 'FERIA', 'DEPOSITO', 'OFICINA', 'OTRO'].includes(input.kind)) {
    throw new Error('Tipo de ubicación inválido.')
  }
  if (typeof input.canSell !== 'boolean' || typeof input.canStore !== 'boolean') {
    throw new Error('Las capacidades de venta y almacenamiento deben ser explícitas.')
  }
  return { name, kind: input.kind, address, mapUrl, canSell: input.canSell, canStore: input.canStore }
}

export function listDemoLocations(snapshot: DemoSnapshot, businessId: string): DemoLocation[] {
  if (!findDemoBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.locationsById)
    .filter((location) => location.businessId === businessId)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name, 'es'))
}

function activeBusiness(businessId: string): void {
  if (!findDemoBusiness(state, businessId)) throw new Error('La empresa DEMO no está disponible.')
}

function locationOfBusiness(businessId: string, locationId: string): DemoLocation {
  activeBusiness(businessId)
  const location = state.locationsById[locationId]
  if (!location || location.businessId !== businessId) throw new Error('Ubicación no disponible para esta empresa.')
  return location
}

function validInvitation(raw: unknown): raw is DemoInvitation {
  if (!isRecord(raw)) return false
  return typeof raw.id === 'string' && /^demo-invite-[0-9a-f-]{36}$/.test(raw.id)
    && typeof raw.businessId === 'string'
    && typeof raw.email === 'string' && raw.email.length <= 120
    && typeof raw.role === 'string' && ['ENCARGADO', 'TRABAJADOR'].includes(raw.role)
    && typeof raw.status === 'string' && ['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA'].includes(raw.status)
    && typeof raw.createdAt === 'string' && Number.isFinite(Date.parse(raw.createdAt))
    && typeof raw.expiresAt === 'string' && Number.isFinite(Date.parse(raw.expiresAt))
    && (raw.memberId === undefined || (typeof raw.memberId === 'string' && /^demo-team-[0-9a-f-]{36}$/.test(raw.memberId)))
}

function validTeamMember(raw: unknown): raw is DemoTeamMember {
  if (!isRecord(raw)) return false
  return typeof raw.id === 'string' && /^demo-team-[0-9a-f-]{36}$/.test(raw.id)
    && typeof raw.businessId === 'string'
    && typeof raw.email === 'string' && raw.email.length <= 120
    && typeof raw.role === 'string' && ['ENCARGADO', 'TRABAJADOR'].includes(raw.role)
    && raw.status === 'ACTIVA'
    && typeof raw.joinedAt === 'string' && Number.isFinite(Date.parse(raw.joinedAt))
    && typeof raw.sourceInvitationId === 'string'
}

export function listDemoInvitations(snapshot: DemoSnapshot, businessId: string): DemoInvitation[] {
  if (!findDemoBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.teamInvitationsById)
    .filter((invite) => invite.businessId === businessId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listDemoCatalog(snapshot: DemoSnapshot, businessId: string): DemoCatalogItem[] {
  if (!findDemoBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.catalogItemsById)
    .filter((item) => item.businessId === businessId)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export function listDemoSuppliers(snapshot: DemoSnapshot, businessId: string): DemoSupplier[] {
  if (!findDemoBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.suppliersById)
    .filter((supplier) => supplier.businessId === businessId)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

function supplierOfBusiness(businessId: string, supplierId: string): DemoSupplier {
  activeBusiness(businessId)
  const supplier = state.suppliersById[supplierId]
  if (!supplier || supplier.businessId !== businessId) {
    throw new Error('El proveedor no pertenece a la empresa seleccionada.')
  }
  return supplier
}

function supplierUniqueness(businessId: string, name: string, excludeId?: string) {
  const key = supplierNameKey(name)
  if (Object.values(state.suppliersById).some((s) =>
    s.businessId === businessId && s.id !== excludeId && supplierNameKey(s.name) === key)) {
    throw new Error('Ya existe un proveedor con ese nombre en esta empresa (incluso si está inactivo).')
  }
}

function validFinancialAccount(raw: unknown): raw is DemoFinancialAccount {
  if (!isRecord(raw) || typeof raw.id !== 'string' ||
      !/^demo-financial-account-[a-f0-9-]{36}$/.test(raw.id) ||
      typeof raw.businessId !== 'string' ||
      (raw.status !== 'ACTIVA' && raw.status !== 'INACTIVA') ||
      typeof raw.isPrimary !== 'boolean' ||
      typeof raw.createdAt !== 'string' || !Number.isFinite(Date.parse(raw.createdAt)) ||
      typeof raw.updatedAt !== 'string' || !Number.isFinite(Date.parse(raw.updatedAt))) return false
  try {
    normalizeFinancialAccountInput(raw as FinancialAccountInput)
    return true
  } catch { return false }
}

function validSupplier(raw: unknown): raw is DemoSupplier {
  if (!isRecord(raw)) return false
  return typeof raw.id === 'string' && /^demo-supplier-[a-f0-9-]{36}$/.test(raw.id)
    && typeof raw.businessId === 'string' && typeof raw.name === 'string'
    && typeof raw.offerings === 'string' && typeof raw.contactPerson === 'string'
    && typeof raw.phone === 'string' && typeof raw.whatsapp === 'string'
    && typeof raw.email === 'string' && typeof raw.address === 'string'
    && typeof raw.mapsUrl === 'string' && typeof raw.website === 'string'
    && typeof raw.instagram === 'string' && typeof raw.notes === 'string'
    && Array.isArray(raw.paymentMethods) && Array.isArray(raw.promotions)
    && (raw.status === 'ACTIVO' || raw.status === 'INACTIVO')
    && typeof raw.createdAt === 'string' && Number.isFinite(Date.parse(raw.createdAt))
    && typeof raw.updatedAt === 'string' && Number.isFinite(Date.parse(raw.updatedAt))
}

export function listDemoPurchases(snapshot: DemoSnapshot, businessId: string): DemoPurchase[] {
  if (!findDemoBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.purchasesById).filter((purchase) => purchase.businessId === businessId)
    .sort((a, b) => b.purchasedOn.localeCompare(a.purchasedOn) || b.createdAt.localeCompare(a.createdAt))
}

/** Historial de entradas efectivo de compras: los eventos son la autoridad, no un contador paralelo. */
export function listDemoReceiptMovements(snapshot: DemoSnapshot, businessId: string): DemoReceiptMovement[] {
  return listDemoPurchases(snapshot, businessId).flatMap((purchase) => purchase.receipt
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
  snapshot: DemoSnapshot, businessId: string, catalogItemId: string, locationId: string,
): number {
  return listDemoReceiptMovements(snapshot, businessId)
    .filter((movement) => movement.catalogItemId === catalogItemId && movement.locationId === locationId)
    .reduce((qty, movement) => qty + movement.quantityMilli, 0)
}

/** Un único ledger: recepciones de Compras + transferencias/conteos de Inventario. */
export function listDemoInventoryMovements(snapshot: DemoSnapshot, businessId: string): InventoryMovement[] {
  const receipts: InventoryMovement[] = listDemoPurchases(snapshot, businessId).flatMap((purchase) =>
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

export function listDemoFinancialAccounts(snapshot: DemoSnapshot, businessId: string): DemoFinancialAccount[] {
  if (!findDemoBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.financialAccountsById)
    .filter((account) => account.businessId === businessId)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) ||
      Number(b.status === 'ACTIVA') - Number(a.status === 'ACTIVA') ||
      a.label.localeCompare(b.label, 'es-AR'))
}

function financialAccountOfBusiness(businessId: string, accountId: string): DemoFinancialAccount {
  activeBusiness(businessId)
  const account = state.financialAccountsById[accountId]
  if (!account || account.businessId !== businessId) {
    throw new Error('La cuenta DEMO no pertenece a la empresa seleccionada.')
  }
  return account
}

function accountForDeclaredPayment(businessId: string, method: string, accountId?: string | null): DemoFinancialAccount | null {
  if (!accountId) return null
  const account = financialAccountOfBusiness(businessId, accountId)
  if (!accountSupportsDeclaredPayment(account, method)) {
    throw new Error('La cuenta está desactivada o no admite ese medio de pago declarado.')
  }
  return account
}

function uniqueFinancialAccount(businessId: string, fields: FinancialAccountInput, excludeId?: string): void {
  const current = Object.values(state.financialAccountsById).filter((account) =>
    account.businessId === businessId && account.id !== excludeId)
  if (current.some((account) => financialAccountKey(account.label) === financialAccountKey(fields.label))) {
    throw new Error('Ya existe una cuenta con ese nombre en esta empresa.')
  }
  if (fields.alias && current.some((account) => account.alias === fields.alias)) {
    throw new Error('Ese alias ya figura en otra cuenta de esta empresa.')
  }
  if (fields.identifier && current.some((account) => account.identifier === fields.identifier)) {
    throw new Error('Ese CBU/CVU ya figura en otra cuenta de esta empresa.')
  }
}

export function listDemoExpenses(snapshot: DemoSnapshot, businessId: string): DemoExpense[] {
  if (!findDemoBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.expensesById).filter((expense) => expense.businessId === businessId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listDemoCashSessions(snapshot: DemoSnapshot, businessId: string): DemoCashSession[] {
  if (!findDemoBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.cashSessionsById).filter((session) => session.businessId === businessId)
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
}

export function activeCashSession(snapshot: DemoSnapshot, businessId: string, locationId: string | null): DemoCashSession | undefined {
  return listDemoCashSessions(snapshot, businessId).find((session) =>
    session.locationId === locationId && session.status === 'ABIERTA')
}

export function listDemoSales(snapshot: DemoSnapshot, businessId: string): DemoSale[] {
  if (!findDemoBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.salesById).filter((sale) => sale.businessId === businessId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function inventoryBalanceMilli(
  snapshot: DemoSnapshot, businessId: string, catalogItemId: string, locationId: string,
): number {
  return stockBalance(listDemoInventoryMovements(snapshot, businessId), locationId, catalogItemId)
}

export function listDemoInventoryOperations(snapshot: DemoSnapshot, businessId: string): InventoryOperation[] {
  if (!findDemoBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.inventoryOperationsById)
    .filter((operation) => operation.businessId === businessId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function inventoryItemOfBusiness(businessId: string, itemId: string): DemoCatalogItem {
  const item = catalogItemOfBusiness(businessId, itemId)
  if (item.status !== 'ACTIVO' || item.kind === 'SERVICIO' || item.unit === 'SERVICIO') {
    throw new Error('Seleccioná un artículo físico activo del Catálogo.')
  }
  return item
}

function inventoryLocationOfBusiness(businessId: string, locationId: string): DemoLocation {
  const location = locationOfBusiness(businessId, locationId)
  if (location.status !== 'ACTIVA' || !location.canStore) {
    throw new Error('La ubicación debe estar activa y habilitada para almacenar.')
  }
  return location
}

function validCashSession(raw: unknown, snapshot: DemoSnapshot): raw is DemoCashSession {
  if (!isRecord(raw) || typeof raw.id !== 'string' ||
      !/^demo-cash-session-[a-f0-9-]{36}$/.test(raw.id) ||
      typeof raw.openRequestId !== 'string' || !/^demo-cash-open-[a-f0-9-]{36}$/.test(raw.openRequestId) ||
      typeof raw.businessId !== 'string' || !snapshot.businessesById[raw.businessId] ||
      (raw.locationId !== null && (typeof raw.locationId !== 'string' ||
        !snapshot.locationsById[raw.locationId] ||
        snapshot.locationsById[raw.locationId].businessId !== raw.businessId)) ||
      raw.openedBy !== 'demo-user' || typeof raw.openedAt !== 'string' ||
      !Number.isFinite(Date.parse(raw.openedAt))) return false
  try { cashCents(raw.openingCashCents, 'Fondo inicial', true) } catch { return false }
  if (raw.status === 'ABIERTA') return raw.closeRequestId === null && raw.closeSnapshot === null
  if (raw.status !== 'CERRADA' || typeof raw.closeRequestId !== 'string' ||
      !/^demo-cash-close-[a-f0-9-]{36}$/.test(raw.closeRequestId) ||
      !isRecord(raw.closeSnapshot)) return false
  const close = raw.closeSnapshot
  if (typeof close.closedAt !== 'string' || !Number.isFinite(Date.parse(close.closedAt)) ||
      Date.parse(close.closedAt) < Date.parse(raw.openedAt) || close.closedBy !== 'demo-user' ||
      close.openingCashCents !== raw.openingCashCents ||
      !Array.isArray(close.saleIds) || !Array.isArray(close.expenseIds) ||
      close.saleIds.length > 500 || close.expenseIds.length > 500 ||
      close.saleIds.some((id) => typeof id !== 'string' || !/^demo-sale-[a-f0-9-]{36}$/.test(id)) ||
      close.expenseIds.some((id) => typeof id !== 'string' || !/^demo-expense-[a-f0-9-]{36}$/.test(id)) ||
      new Set(close.saleIds).size !== close.saleIds.length ||
      new Set(close.expenseIds).size !== close.expenseIds.length) return false
  try {
    cashCents(close.expectedCashCents, 'Efectivo esperado', true)
    cashCents(close.countedCashCents, 'Efectivo contado', true)
    cashCents(close.cashSalesCents, 'Ventas efectivo', true)
    cashCents(close.cashExpensesCents, 'Gastos efectivo', true)
    const closeNotes = cashText(close.notes, 'Observaciones de cierre', 500)
    const expected = (raw.openingCashCents as number) +
      (close.cashSalesCents as number) - (close.cashExpensesCents as number)
    const difference = (close.countedCashCents as number) - (close.expectedCashCents as number)
    return close.expectedCashCents === expected && close.differenceCents === difference &&
      (difference === 0 || closeNotes.length >= 2)
  } catch { return false }
}

function validExpense(raw: unknown, snapshot: DemoSnapshot): raw is DemoExpense {
  if (!isRecord(raw) || typeof raw.id !== 'string' ||
      !/^demo-expense-[a-f0-9-]{36}$/.test(raw.id) ||
      typeof raw.requestId !== 'string' || !/^demo-expense-request-[a-f0-9-]{36}$/.test(raw.requestId) ||
      typeof raw.businessId !== 'string' || !snapshot.businessesById[raw.businessId] ||
      typeof raw.createdAt !== 'string' || !Number.isFinite(Date.parse(raw.createdAt)) ||
      (raw.cashSessionId !== null &&
        (typeof raw.cashSessionId !== 'string' || !/^demo-cash-session-[a-f0-9-]{36}$/.test(raw.cashSessionId) ||
          raw.paymentMethod !== 'EFECTIVO'))) return false
  try { normalizeExpense(raw as ExpenseInput); return true } catch { return false }
}

function validSale(raw: unknown, snapshot: DemoSnapshot): raw is DemoSale {
  if (!isRecord(raw) || typeof raw.id !== 'string' ||
      !/^demo-sale-[a-f0-9-]{36}$/.test(raw.id) ||
      typeof raw.requestId !== 'string' ||
      !/^demo-sale-request-[a-f0-9-]{36}$/.test(raw.requestId) ||
      typeof raw.businessId !== 'string' || !snapshot.businessesById[raw.businessId] ||
      (raw.locationId !== null && (typeof raw.locationId !== 'string' ||
        !snapshot.locationsById[raw.locationId] ||
        snapshot.locationsById[raw.locationId].businessId !== raw.businessId)) ||
      typeof raw.createdAt !== 'string' || !Number.isFinite(Date.parse(raw.createdAt)) ||
      raw.status !== 'REGISTRADA_DEMO' ||
      !Array.isArray(raw.lines) || raw.lines.length < 1 || raw.lines.length > 30 ||
      typeof raw.subtotalCents !== 'number' || typeof raw.totalCents !== 'number' ||
      typeof raw.discountCents !== 'number' ||
      (raw.cashSessionId !== undefined && raw.cashSessionId !== null &&
        (typeof raw.cashSessionId !== 'string' || !/^demo-cash-session-[a-f0-9-]{36}$/.test(raw.cashSessionId))) ||
      !Array.isArray(raw.payments) || typeof raw.notes !== 'string') return false
  try {
    normalizeSaleInput({
      locationId: raw.locationId, notes: raw.notes, discountCents: raw.discountCents,
      payments: raw.payments as SalePayment[], lines: raw.lines as SaleInput['lines'],
    })
    const seen = new Set<string>()
    for (const line of raw.lines) {
      if (!isRecord(line) || typeof line.id !== 'string' ||
          !/^demo-sale-line-[a-f0-9-]{36}$/.test(line.id) ||
          typeof line.catalogItemId !== 'string' || seen.has(line.catalogItemId)) return false
      seen.add(line.catalogItemId)
      const item = snapshot.catalogItemsById[line.catalogItemId]
      if (!item || item.businessId !== raw.businessId || line.unit !== item.unit ||
          line.kind !== (item.kind === 'SERVICIO' ? 'SERVICIO' : 'BIEN') ||
          typeof line.name !== 'string' || !line.name.trim() || line.name.length > 90 ||
          typeof line.sku !== 'string' || line.sku.length > 32 ||
          typeof line.quantityMilli !== 'number' || typeof line.unitPriceCents !== 'number') return false
      validSaleQuantity(line.quantityMilli, item.unit)
      if (line.lineTotalCents !== lineTotalCents(line.quantityMilli, line.unitPriceCents)) return false
      if (line.kind === 'BIEN' && raw.locationId === null) return false
    }
    const totals = saleAmounts(raw.lines, raw.discountCents)
    validateSalePayments(raw.payments as SalePayment[], totals.totalCents)
    return raw.subtotalCents === totals.subtotalCents && raw.totalCents === totals.totalCents
  } catch { return false }
}

function validInventoryOperation(raw: unknown, snapshot: DemoSnapshot): raw is InventoryOperation {
  if (!isRecord(raw) || typeof raw.id !== 'string' ||
      !/^demo-inventory-op-[a-f0-9-]{36}$/.test(raw.id) ||
      typeof raw.requestId !== 'string' ||
      !/^demo-inventory-request-[a-f0-9-]{36}$/.test(raw.requestId) ||
      typeof raw.businessId !== 'string' || !snapshot.businessesById[raw.businessId] ||
      typeof raw.createdAt !== 'string' || !Number.isFinite(Date.parse(raw.createdAt)) ||
      typeof raw.reason !== 'string') return false
  try {
    if (normalizeStockReason(raw.reason) !== raw.reason) return false
    const businessId = raw.businessId
    // Cada operación se valida contra los eventos existentes hasta su fecha.
    // load() reproduce las operaciones en orden cronológico.
    const historicalMovements = listDemoInventoryMovements(snapshot, businessId)
      .filter((movement) => movement.createdAt <= (raw.createdAt as string))
    if (raw.kind === 'BATCH_COUNT') {
      if (typeof raw.locationId !== 'string' ||
          !snapshot.locationsById[raw.locationId] ||
          snapshot.locationsById[raw.locationId].businessId !== businessId ||
          !Array.isArray(raw.lines) || raw.lines.length < 1 || raw.lines.length > 200) return false
      const seen = new Set<string>()
      for (const line of raw.lines) {
        if (!isRecord(line) || typeof line.catalogItemId !== 'string' ||
            seen.has(line.catalogItemId)) return false
        seen.add(line.catalogItemId)
        const item = snapshot.catalogItemsById[line.catalogItemId]
        if (!item || item.businessId !== businessId || item.kind === 'SERVICIO' ||
            item.unit === 'SERVICIO' || line.unit !== item.unit ||
            typeof line.itemNameSnapshot !== 'string' ||
            !line.itemNameSnapshot.trim() || line.itemNameSnapshot.length > 90 ||
            typeof line.expectedMilli !== 'number' ||
            typeof line.countedMilli !== 'number' || typeof line.deltaMilli !== 'number') return false
        validateStockMilli(line.expectedMilli, item.unit, true)
        validateStockMilli(line.countedMilli, item.unit, true)
        if (line.deltaMilli !== checkedCountDifference(
          line.expectedMilli,
          stockBalance(historicalMovements, raw.locationId, line.catalogItemId),
          line.countedMilli, item.unit,
        )) return false
      }
      return true
    }
    if (typeof raw.catalogItemId !== 'string' ||
        !snapshot.catalogItemsById[raw.catalogItemId] ||
        snapshot.catalogItemsById[raw.catalogItemId].businessId !== businessId ||
        snapshot.catalogItemsById[raw.catalogItemId].kind === 'SERVICIO' ||
        raw.unit !== snapshot.catalogItemsById[raw.catalogItemId].unit ||
        typeof raw.itemNameSnapshot !== 'string' || raw.itemNameSnapshot.length > 90) return false
    if (raw.kind === 'TRANSFER') {
      if (typeof raw.sourceLocationId !== 'string' || typeof raw.destinationLocationId !== 'string' ||
          raw.sourceLocationId === raw.destinationLocationId ||
          !snapshot.locationsById[raw.sourceLocationId] || !snapshot.locationsById[raw.destinationLocationId] ||
          snapshot.locationsById[raw.sourceLocationId].businessId !== businessId ||
          snapshot.locationsById[raw.destinationLocationId].businessId !== businessId ||
          typeof raw.quantityMilli !== 'number') return false
      requireTransferStock(stockBalance(historicalMovements, raw.sourceLocationId, raw.catalogItemId),
        raw.quantityMilli, raw.unit as DemoCatalogItem['unit'])
      return true
    }
    if (raw.kind === 'COUNT') {
      if (typeof raw.locationId !== 'string' || !snapshot.locationsById[raw.locationId] ||
          snapshot.locationsById[raw.locationId].businessId !== businessId ||
          typeof raw.countedMilli !== 'number' || typeof raw.deltaMilli !== 'number') return false
      validateStockMilli(raw.countedMilli, raw.unit as DemoCatalogItem['unit'], true)
      const current = stockBalance(historicalMovements, raw.locationId, raw.catalogItemId)
      return raw.deltaMilli === countDifference(current, raw.countedMilli, raw.unit as DemoCatalogItem['unit'])
    }
    return false
  } catch { return false }
}

function purchaseOfBusiness(businessId: string, purchaseId: string): DemoPurchase {
  activeBusiness(businessId)
  const purchase = state.purchasesById[purchaseId]
  if (!purchase || purchase.businessId !== businessId) throw new Error('La compra no pertenece a esta empresa.')
  return purchase
}

function validPurchase(raw: unknown, snapshot: DemoSnapshot): raw is DemoPurchase {
  if (!isRecord(raw) || typeof raw.id !== 'string' ||
      !/^demo-purchase-[a-f0-9-]{36}$/.test(raw.id) ||
      typeof raw.requestId !== 'string' || !/^demo-request-[a-f0-9-]{36}$/.test(raw.requestId) ||
      typeof raw.businessId !== 'string' || !snapshot.businessesById[raw.businessId] ||
      typeof raw.supplierNameSnapshot !== 'string' || raw.supplierNameSnapshot.length > 90 ||
      typeof raw.createdAt !== 'string' || !Number.isFinite(Date.parse(raw.createdAt)) ||
      typeof raw.totalCents !== 'number' || !Number.isSafeInteger(raw.totalCents)) return false
  try {
    normalizePurchaseInput(raw as PurchaseInput)
    if (!Array.isArray(raw.lines) || raw.lines.some((line) =>
      !isRecord(line) || typeof line.id !== 'string' ||
      !/^demo-purchase-line-[a-f0-9-]{36}$/.test(line.id) ||
      typeof line.sku !== 'string' || line.sku.length > 32 ||
      !['BIEN', 'SERVICIO', 'CONCEPTO'].includes(String(line.kind)) ||
      typeof line.totalCents !== 'number' || !Number.isSafeInteger(line.totalCents) ||
      line.totalCents !== lineTotalCents(line.quantityMilli as number, line.unitCostCents as number) ||
      (line.kind === 'CONCEPTO' && (line.catalogItemId !== null || line.unit !== 'CONCEPTO')) ||
      (line.kind !== 'CONCEPTO' && (
        typeof line.catalogItemId !== 'string' || !snapshot.catalogItemsById[line.catalogItemId] ||
        snapshot.catalogItemsById[line.catalogItemId].businessId !== raw.businessId ||
        (line.kind === 'SERVICIO' && line.unit !== 'SERVICIO') ||
        (line.kind === 'BIEN' && line.unit === 'SERVICIO')
      ))
    )) return false
    const lines = raw.lines as PurchaseLineSnapshot[]
    if (new Set(lines.map((line) => line.id)).size !== lines.length) return false
    if (sumLineTotals(lines) !== raw.totalCents) return false
    if (raw.receipt === null) return true
    if (!isRecord(raw.receipt) || typeof raw.receipt.id !== 'string' ||
      !/^demo-receipt-[a-f0-9-]{36}$/.test(raw.receipt.id) ||
      typeof raw.receipt.locationId !== 'string' ||
      !snapshot.locationsById[raw.receipt.locationId] ||
      snapshot.locationsById[raw.receipt.locationId].businessId !== raw.businessId ||
      typeof raw.receipt.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(raw.receipt.createdAt)) ||
      !Array.isArray(raw.receipt.movements)) return false
    const receivable = physicalPurchaseLines(lines)
    if (receivable.length === 0 || raw.receipt.movements.length !== receivable.length) return false
    const seen = new Set<string>()
    for (const movement of raw.receipt.movements) {
      if (!isRecord(movement) || typeof movement.id !== 'string' ||
        !/^demo-stock-[a-f0-9-]{36}$/.test(movement.id) || seen.has(movement.purchaseLineId as string)) return false
      seen.add(movement.purchaseLineId as string)
      const line = receivable.find((candidate) => candidate.id === movement.purchaseLineId)
      if (!line || movement.catalogItemId !== line.catalogItemId ||
        movement.unit !== line.unit || movement.quantityMilli !== line.quantityMilli) return false
    }
    return seen.size === receivable.length
  } catch {
    return false
  }
}

function catalogItemOfBusiness(businessId: string, itemId: string): DemoCatalogItem {
  activeBusiness(businessId)
  const item = state.catalogItemsById[itemId]
  if (!item || item.businessId !== businessId) throw new Error('Artículo no disponible para esta empresa DEMO.')
  return item
}

function catalogUniqueness(businessId: string, input: CatalogInput, excludeItemId?: string) {
  const otherItems = Object.values(state.catalogItemsById)
    .filter((item) => item.businessId === businessId && item.id !== excludeItemId)
  if (otherItems.some((item) => catalogNameKey(item.name) === catalogNameKey(input.name))) {
    throw new Error('Esta empresa ya tiene un artículo o servicio con el mismo nombre, incluso si está inactivo.')
  }
  if (input.sku && otherItems.some((item) => item.sku === input.sku)) {
    throw new Error('Ese SKU ya está utilizado dentro de esta empresa.')
  }
}

function validCatalogItem(raw: unknown): raw is DemoCatalogItem {
  if (!isRecord(raw)) return false
  return typeof raw.id === 'string' && /^demo-catalog-[a-f0-9-]{36}$/.test(raw.id)
    && typeof raw.businessId === 'string'
    && typeof raw.name === 'string' && typeof raw.category === 'string'
    && typeof raw.kind === 'string' && typeof raw.unit === 'string'
    && typeof raw.sku === 'string' && typeof raw.description === 'string'
    && (raw.observations === undefined || typeof raw.observations === 'string')
    && typeof raw.sellable === 'boolean'
    && (raw.priceCents === null || typeof raw.priceCents === 'number')
    && (raw.referenceCostCents === null || typeof raw.referenceCostCents === 'number')
    && (raw.status === 'ACTIVO' || raw.status === 'INACTIVO')
    && typeof raw.createdAt === 'string' && Number.isFinite(Date.parse(raw.createdAt))
    && typeof raw.updatedAt === 'string' && Number.isFinite(Date.parse(raw.updatedAt))
}

export function listDemoTeamMembers(snapshot: DemoSnapshot, businessId: string): DemoTeamMember[] {
  if (!findDemoBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.teamMembersById)
    .filter((member) => member.businessId === businessId && member.status === 'ACTIVA')
    .sort((a, b) => a.email.localeCompare(b.email))
}

function invitationInBusiness(businessId: string, invitationId: string): DemoInvitation {
  activeBusiness(businessId)
  const found = state.teamInvitationsById[invitationId]
  if (!found || found.businessId !== businessId) throw new Error('Invitación DEMO no disponible para esta empresa.')
  return found
}

function load(): DemoSnapshot {
  const state = defaults()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return state
    const stored: unknown = JSON.parse(raw)
    if (!isRecord(stored) || stored.version !== 1) return state
    const data = stored as Stored
    if (isRecord(data.profile) && typeof data.profile.displayName === 'string' && data.profile.displayName.trim().length >= 2 && data.profile.displayName.length <= 70) {
      state.profile = {
        id: 'demo-user',
        displayName: data.profile.displayName.trim(),
        email: typeof data.profile.email === 'string' && data.profile.email.length <= 120 ? data.profile.email : '',
        avatarInitials: typeof data.profile.avatarInitials === 'string' && /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{0,4}$/.test(data.profile.avatarInitials.trim()) ? data.profile.avatarInitials.trim().toUpperCase() : '',
        contactPhone: typeof data.profile.contactPhone === 'string' && data.profile.contactPhone.length <= 30 && /^[+()\d\s.-]*$/.test(data.profile.contactPhone) ? data.profile.contactPhone.trim() : '',
      }
    }
    if (Array.isArray(data.createdBusinesses)) {
      for (const rawBusiness of data.createdBusinesses.slice(0, 50)) {
        if (!validCreated(rawBusiness)) continue
        const item: DemoBusiness = {
          id: rawBusiness.id,
          name: rawBusiness.name.trim(),
          category: rawBusiness.category.trim() || 'Sin rubro especificado',
          description: rawBusiness.description.trim(),
          slogan: typeof rawBusiness.slogan === 'string' && rawBusiness.slogan.length <= 120 ? rawBusiness.slogan.trim() : '',
          taxId: typeof rawBusiness.taxId === 'string' && rawBusiness.taxId.length <= 15 && (/^$|^\d{11}$|^\d{2}-\d{8}-\d$/.test(rawBusiness.taxId)) ? rawBusiness.taxId : '',
          kind: rawBusiness.kind,
          initials: rawBusiness.name.trim().slice(0, 1).toUpperCase(),
          accent: 'blue',
          source: 'created',
          founderUserId: 'demo-user',
          administrativeOwnerUserId: 'demo-user',
        }
        state.businessesById[item.id] = item
        state.membershipsByBusinessId[item.id] = membership(item.id)
      }
    }
    // Compatible con la versión E1-A2: el nuevo campo fixtureEdits es opcional.
    if (isRecord(data.fixtureEdits)) {
      for (const item of fixtures) {
        const updated = { ...state.businessesById[item.id], ...cleanEditable(data.fixtureEdits[item.id]) }
        state.businessesById[item.id] = { ...updated, initials: updated.name.slice(0, 1).toUpperCase() }
      }
    }
    // Puesto laboral se asocia a la membresía por empresa, nunca al perfil global.
    if (isRecord(data.memberJobs)) {
      for (const [id, jobTitle] of Object.entries(data.memberJobs)) {
        const existing = state.membershipsByBusinessId[id]
        if (existing && typeof jobTitle === 'string' && jobTitle.length <= 80) {
          state.membershipsByBusinessId[id] = { ...existing, jobTitle: jobTitle.trim() }
        }
      }
    }
    if (Array.isArray(data.locations)) {
      const countByBusiness = new Map<string, number>()
      const primaryByBusiness = new Set<string>()
      for (const rawLocation of data.locations.slice(0, 2000)) {
        if (!validLocation(rawLocation) || !state.businessesById[rawLocation.businessId]) continue
        if ((countByBusiness.get(rawLocation.businessId) ?? 0) >= 100) continue
        if (state.locationsById[rawLocation.id]) continue
        const isPrimary = rawLocation.status === 'ACTIVA' && rawLocation.isPrimary && !primaryByBusiness.has(rawLocation.businessId)
        if (isPrimary) primaryByBusiness.add(rawLocation.businessId)
        state.locationsById[rawLocation.id] = {
          id: rawLocation.id, businessId: rawLocation.businessId,
          name: rawLocation.name.trim(), kind: rawLocation.kind, address: rawLocation.address.trim(),
          mapUrl: typeof rawLocation.mapUrl === 'string' ? safeLoadedMapLink(rawLocation.mapUrl) : '',
          canSell: rawLocation.canSell, canStore: rawLocation.canStore,
          status: rawLocation.status, isPrimary,
        }
        countByBusiness.set(rawLocation.businessId, (countByBusiness.get(rawLocation.businessId) ?? 0) + 1)
      }
    }
    // Listas opcionales: compatibilidad con E1-A2, Datos Empresa, Perfil y Ubicaciones.
    if (Array.isArray(data.teamInvitations)) {
      const counts = new Map<string, number>()
      for (const rawInvitation of data.teamInvitations.slice(0, 5000)) {
        if (!validInvitation(rawInvitation) || !state.businessesById[rawInvitation.businessId]) continue
        if ((counts.get(rawInvitation.businessId) ?? 0) >= 100) continue
        const email = rawInvitation.email.trim().toLowerCase()
        try {
          normalizeInviteInput(email, rawInvitation.role)
        } catch {
          continue
        }
        if (state.teamInvitationsById[rawInvitation.id]) continue
        state.teamInvitationsById[rawInvitation.id] = {
          id: rawInvitation.id, businessId: rawInvitation.businessId, email,
          role: rawInvitation.role, status: rawInvitation.status,
          createdAt: rawInvitation.createdAt, expiresAt: rawInvitation.expiresAt,
          memberId: rawInvitation.memberId,
        }
        counts.set(rawInvitation.businessId, (counts.get(rawInvitation.businessId) ?? 0) + 1)
      }
    }
    if (Array.isArray(data.teamMembers)) {
      const counts = new Map<string, number>()
      for (const rawMember of data.teamMembers.slice(0, 5000)) {
        if (!validTeamMember(rawMember) || !state.businessesById[rawMember.businessId]) continue
        if ((counts.get(rawMember.businessId) ?? 0) >= 50) continue
        if (state.teamMembersById[rawMember.id]) continue
        const invitation = state.teamInvitationsById[rawMember.sourceInvitationId]
        if (!invitation || invitation.businessId !== rawMember.businessId
          || invitation.status !== 'ACEPTADA' || invitation.memberId !== rawMember.id) continue
        if (invitation.email !== rawMember.email || invitation.role !== rawMember.role) continue
        if (Object.values(state.teamMembersById).some((existing) => existing.businessId === rawMember.businessId && existing.email === rawMember.email)) continue
        state.teamMembersById[rawMember.id] = {
          id: rawMember.id, businessId: rawMember.businessId, email: rawMember.email,
          role: rawMember.role, status: 'ACTIVA',
          joinedAt: rawMember.joinedAt, sourceInvitationId: rawMember.sourceInvitationId,
        }
        counts.set(rawMember.businessId, (counts.get(rawMember.businessId) ?? 0) + 1)
      }
    }
    // Los artículos del catálogo son opcionales y no introducen stock ni ubicaciones implícitas.
    if (Array.isArray(data.catalogItems)) {
      const countByBusiness = new Map<string, number>()
      for (const rawItem of data.catalogItems.slice(0, 10000)) {
        if (!validCatalogItem(rawItem) || !state.businessesById[rawItem.businessId]) continue
        if (state.catalogItemsById[rawItem.id]) continue
        if ((countByBusiness.get(rawItem.businessId) ?? 0) >= 500) continue
        try {
          const fields = normalizeCatalogInput(rawItem)
          const existing = Object.values(state.catalogItemsById).filter((item) => item.businessId === rawItem.businessId)
          if (existing.some((item) => catalogNameKey(item.name) === catalogNameKey(fields.name)
              || (fields.sku && item.sku === fields.sku))) continue
          const clean: DemoCatalogItem = {
            ...fields, id: rawItem.id, businessId: rawItem.businessId, status: rawItem.status,
            createdAt: rawItem.createdAt, updatedAt: rawItem.updatedAt,
          }
          state.catalogItemsById[clean.id] = clean
          countByBusiness.set(clean.businessId, (countByBusiness.get(clean.businessId) ?? 0) + 1)
        } catch {
          // Un registro inválido no debe eliminar los demás datos previos.
        }
      }
    }
    if (Array.isArray(data.suppliers)) {
      const counts = new Map<string, number>()
      for (const rawSupplier of data.suppliers.slice(0, 4000)) {
        if (!validSupplier(rawSupplier) || !state.businessesById[rawSupplier.businessId]) continue
        if (state.suppliersById[rawSupplier.id]) continue
        if ((counts.get(rawSupplier.businessId) ?? 0) >= 200) continue
        try {
          const fields = normalizeSupplierInput(rawSupplier)
          const previous = Object.values(state.suppliersById).some((entry) =>
            entry.businessId === rawSupplier.businessId &&
            supplierNameKey(entry.name) === supplierNameKey(fields.name))
          if (previous) continue
          const supplier: DemoSupplier = {
            ...fields, id: rawSupplier.id, businessId: rawSupplier.businessId,
            status: rawSupplier.status, createdAt: rawSupplier.createdAt,
            updatedAt: rawSupplier.updatedAt,
          }
          state.suppliersById[supplier.id] = supplier
          counts.set(supplier.businessId, (counts.get(supplier.businessId) ?? 0) + 1)
        } catch {
          // La información de un proveedor inválido no descarta los otros módulos.
        }
      }
    }
    // Cuentas DEMO: datos de referencia por empresa. Nunca se interpretan como
    // depósitos reales ni se derivan saldos a partir de Ventas o Gastos.
    if (Array.isArray(data.financialAccounts)) {
      const counts = new Map<string, number>()
      const primaries = new Set<string>()
      for (const rawAccount of data.financialAccounts.slice(0, 6000)) {
        if (!validFinancialAccount(rawAccount) || !state.businessesById[rawAccount.businessId] ||
            state.financialAccountsById[rawAccount.id]) continue
        if ((counts.get(rawAccount.businessId) ?? 0) >= 100) continue
        try {
          const fields = normalizeFinancialAccountInput(rawAccount)
          const existing = Object.values(state.financialAccountsById)
            .filter((account) => account.businessId === rawAccount.businessId)
          if (existing.some((account) =>
            financialAccountKey(account.label) === financialAccountKey(fields.label) ||
            (fields.alias && account.alias === fields.alias) ||
            (fields.identifier && account.identifier === fields.identifier))) continue
          const isPrimary = rawAccount.status === 'ACTIVA' &&
            rawAccount.isPrimary && !primaries.has(rawAccount.businessId)
          if (isPrimary) primaries.add(rawAccount.businessId)
          const account: DemoFinancialAccount = {
            ...fields, id: rawAccount.id, businessId: rawAccount.businessId,
            status: rawAccount.status, isPrimary,
            createdAt: rawAccount.createdAt, updatedAt: rawAccount.updatedAt,
          }
          state.financialAccountsById[account.id] = account
          counts.set(account.businessId, (counts.get(account.businessId) ?? 0) + 1)
        } catch {
          // Una cuenta DEMO dañada nunca elimina registros de otros módulos.
        }
      }
    }
    // Compras opcionales: sólo se recuperan snapshots completos y recepciones consistentes.
    if (Array.isArray(data.purchases)) {
      const countByBusiness = new Map<string, number>()
      const seenRequests = new Set<string>()
      for (const rawPurchase of data.purchases.slice(0, 10000)) {
        if (!validPurchase(rawPurchase, state)) continue
        if (state.purchasesById[rawPurchase.id] || seenRequests.has(rawPurchase.requestId)) continue
        if ((countByBusiness.get(rawPurchase.businessId) ?? 0) >= 500) continue
        const purchase: DemoPurchase = {
          id: rawPurchase.id, requestId: rawPurchase.requestId, businessId: rawPurchase.businessId,
          purchasedOn: rawPurchase.purchasedOn, supplierId: rawPurchase.supplierId,
          supplierNameSnapshot: rawPurchase.supplierNameSnapshot, reference: rawPurchase.reference,
          notes: rawPurchase.notes, lines: rawPurchase.lines.map((line) => ({ ...line })),
          totalCents: rawPurchase.totalCents, createdAt: rawPurchase.createdAt,
          receipt: rawPurchase.receipt ? {
            ...rawPurchase.receipt,
            movements: rawPurchase.receipt.movements.map((movement) => ({ ...movement })),
          } : null,
        }
        state.purchasesById[purchase.id] = purchase
        seenRequests.add(purchase.requestId)
        countByBusiness.set(purchase.businessId, (countByBusiness.get(purchase.businessId) ?? 0) + 1)
      }
    }
    // Jornadas opcionales: se cargan después de Ubicaciones y antes de Ventas/Gastos.
    // Una jornada cerrada tiene snapshot inmutable, no un recalculo reactivo.
    if (Array.isArray(data.cashSessions)) {
      const counts = new Map<string, number>()
      const requests = new Set<string>()
      const openScopes = new Set<string>()
      for (const rawSession of data.cashSessions.slice(0, 10000)) {
        if (!validCashSession(rawSession, state) || requests.has(rawSession.openRequestId) ||
            state.cashSessionsById[rawSession.id]) continue
        if ((counts.get(rawSession.businessId) ?? 0) >= 300) continue
        const scope = JSON.stringify([rawSession.businessId, rawSession.locationId])
        if (rawSession.status === 'ABIERTA' && openScopes.has(scope)) continue
        const session: DemoCashSession = {
          id: rawSession.id, openRequestId: rawSession.openRequestId,
          closeRequestId: rawSession.closeRequestId, businessId: rawSession.businessId,
          locationId: rawSession.locationId, openingCashCents: rawSession.openingCashCents,
          openedAt: rawSession.openedAt, openedBy: 'demo-user',
          status: rawSession.status,
          closeSnapshot: rawSession.closeSnapshot
            ? { ...rawSession.closeSnapshot,
              saleIds: [...rawSession.closeSnapshot.saleIds],
              expenseIds: [...rawSession.closeSnapshot.expenseIds] } : null,
        }
        state.cashSessionsById[session.id] = session
        if (session.status === 'ABIERTA') openScopes.add(scope)
        requests.add(session.openRequestId)
        counts.set(session.businessId, (counts.get(session.businessId) ?? 0) + 1)
      }
    }
    // Ventas DEMO opcionales. Primero se recuperan para que los conteos
    // posteriores a una venta puedan reconstruir su saldo histórico real.
    if (Array.isArray(data.sales)) {
      const counts = new Map<string, number>()
      const requests = new Set<string>()
      for (const rawSale of data.sales.slice(0, 10000)) {
        if (!validSale(rawSale, state) || state.salesById[rawSale.id] || requests.has(rawSale.requestId)) continue
        if ((counts.get(rawSale.businessId) ?? 0) >= 500) continue
        const sale: DemoSale = {
          id: rawSale.id, requestId: rawSale.requestId, businessId: rawSale.businessId,
          locationId: rawSale.locationId,
          lines: rawSale.lines.map((line) => ({ ...line })),
          subtotalCents: rawSale.subtotalCents, discountCents: rawSale.discountCents,
          totalCents: rawSale.totalCents,
          payments: rawSale.payments.map((payment) => ({
             method: payment.method, amountCents: payment.amountCents,
             financialAccountId: typeof payment.financialAccountId === 'string' &&
               state.financialAccountsById[payment.financialAccountId]?.businessId === rawSale.businessId
                 ? payment.financialAccountId : null,
             financialAccountLabelSnapshot: typeof payment.financialAccountLabelSnapshot === 'string' &&
               payment.financialAccountLabelSnapshot.length <= 80
                 ? payment.financialAccountLabelSnapshot : null,
           })),
          notes: rawSale.notes, createdAt: rawSale.createdAt, status: 'REGISTRADA_DEMO',
          cashSessionId: (() => {
            const session = typeof rawSale.cashSessionId === 'string'
              ? state.cashSessionsById[rawSale.cashSessionId] : undefined
            return session?.businessId === rawSale.businessId && session.locationId === rawSale.locationId
              ? session.id : null
          })(),
        }
        state.salesById[sale.id] = sale
        requests.add(sale.requestId)
        counts.set(sale.businessId, (counts.get(sale.businessId) ?? 0) + 1)
      }
    }
    // Los egresos son registros independientes de las Compras, no las pagan
    // automáticamente. Sólo el efectivo ligado a una jornada afecta arqueo.
    if (Array.isArray(data.expenses)) {
      const counts = new Map<string, number>()
      const requests = new Set<string>()
      for (const rawExpense of data.expenses.slice(0, 10000)) {
        if (!validExpense(rawExpense, state) || requests.has(rawExpense.requestId) ||
            state.expensesById[rawExpense.id]) continue
        if ((counts.get(rawExpense.businessId) ?? 0) >= 500) continue
        const expense: DemoExpense = {
          id: rawExpense.id, requestId: rawExpense.requestId, businessId: rawExpense.businessId,
          paidOn: rawExpense.paidOn, category: rawExpense.category,
          description: rawExpense.description, amountCents: rawExpense.amountCents,
          paymentMethod: rawExpense.paymentMethod, notes: rawExpense.notes,
           financialAccountId: typeof rawExpense.financialAccountId === 'string' &&
             state.financialAccountsById[rawExpense.financialAccountId]?.businessId === rawExpense.businessId
               ? rawExpense.financialAccountId : null,
           financialAccountLabelSnapshot: typeof rawExpense.financialAccountLabelSnapshot === 'string' &&
             rawExpense.financialAccountLabelSnapshot.length <= 80
               ? rawExpense.financialAccountLabelSnapshot : null,
          locationId: rawExpense.locationId, cashSessionId: (() => {
            const session = rawExpense.cashSessionId ? state.cashSessionsById[rawExpense.cashSessionId] : undefined
            return session?.businessId === rawExpense.businessId && session.locationId === rawExpense.locationId
              ? session.id : null
          })(),
          createdAt: rawExpense.createdAt,
        }
        state.expensesById[expense.id] = expense
        requests.add(expense.requestId)
        counts.set(expense.businessId, (counts.get(expense.businessId) ?? 0) + 1)
      }
    }
    // Operaciones opcionales: se reconstruyen contra las recepciones y las
    // operaciones anteriores. Rechazar una operación inválida no borra compras.
    if (Array.isArray(data.inventoryOperations)) {
      const counts = new Map<string, number>()
      const seenRequests = new Set<string>()
      for (const rawOperation of data.inventoryOperations.slice(0, 10000)
        .sort((a: unknown, b: unknown) => {
          const left = isRecord(a) && typeof a.createdAt === 'string' ? a.createdAt : ''
          const right = isRecord(b) && typeof b.createdAt === 'string' ? b.createdAt : ''
          return left.localeCompare(right)
        })) {
        if (!validInventoryOperation(rawOperation, state)) continue
        if (state.inventoryOperationsById[rawOperation.id] || seenRequests.has(rawOperation.requestId)) continue
        if ((counts.get(rawOperation.businessId) ?? 0) >= 1500) continue
        const operation: InventoryOperation = rawOperation.kind === 'BATCH_COUNT'
          ? { kind: 'BATCH_COUNT', id: rawOperation.id, requestId: rawOperation.requestId,
            businessId: rawOperation.businessId, locationId: rawOperation.locationId,
            reason: rawOperation.reason, createdAt: rawOperation.createdAt,
            lines: rawOperation.lines.map((line) => ({ ...line })) }
          : rawOperation.kind === 'TRANSFER'
          ? { kind: 'TRANSFER', id: rawOperation.id, requestId: rawOperation.requestId,
            businessId: rawOperation.businessId, catalogItemId: rawOperation.catalogItemId,
            itemNameSnapshot: rawOperation.itemNameSnapshot, unit: rawOperation.unit,
            sourceLocationId: rawOperation.sourceLocationId, destinationLocationId: rawOperation.destinationLocationId,
            quantityMilli: rawOperation.quantityMilli, reason: rawOperation.reason, createdAt: rawOperation.createdAt }
          : { kind: 'COUNT', id: rawOperation.id, requestId: rawOperation.requestId,
            businessId: rawOperation.businessId, catalogItemId: rawOperation.catalogItemId,
            itemNameSnapshot: rawOperation.itemNameSnapshot, unit: rawOperation.unit,
            locationId: rawOperation.locationId, countedMilli: rawOperation.countedMilli,
            deltaMilli: rawOperation.deltaMilli, reason: rawOperation.reason, createdAt: rawOperation.createdAt }
        state.inventoryOperationsById[operation.id] = operation
        seenRequests.add(operation.requestId)
        counts.set(operation.businessId, (counts.get(operation.businessId) ?? 0) + 1)
      }
    }
  } catch {
    // Datos corruptos o almacenamiento bloqueado: mostrar fixtures conocidos.
  }
  return state
}

let state = load()
const listeners = new Set<() => void>()
function notify(next: DemoSnapshot) {
  state = next
  try {
    const saved: Stored = {
      version: 1,
      profile: state.profile,
      createdBusinesses: Object.values(state.businessesById).filter((b) => b.source === 'created'),
      fixtureEdits: Object.fromEntries(fixtures.map((item) => [item.id, editableFields(state.businessesById[item.id])])),
      memberJobs: Object.fromEntries(Object.entries(state.membershipsByBusinessId).map(([id, membership]) => [id, membership.jobTitle])),
      locations: Object.values(state.locationsById),
      teamInvitations: Object.values(state.teamInvitationsById),
      teamMembers: Object.values(state.teamMembersById),
      catalogItems: Object.values(state.catalogItemsById),
      suppliers: Object.values(state.suppliersById),
      purchases: Object.values(state.purchasesById),
      inventoryOperations: Object.values(state.inventoryOperationsById),
      sales: Object.values(state.salesById),
      expenses: Object.values(state.expensesById),
      cashSessions: Object.values(state.cashSessionsById),
      financialAccounts: Object.values(state.financialAccountsById),
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  } catch {
    // Sigue funcionando en memoria si el navegador no permite persistir.
  }
  listeners.forEach((fn) => fn())
}

export const demoStore = {
  getSnapshot: (): DemoSnapshot => state,
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useDemoSnapshot(): DemoSnapshot {
  return useSyncExternalStore(demoStore.subscribe, demoStore.getSnapshot)
}

export function listDemoBusinesses(snapshot: DemoSnapshot): DemoBusiness[] {
  return Object.values(snapshot.businessesById).filter((item) => snapshot.membershipsByBusinessId[item.id]?.status === 'ACTIVA')
}

export function findDemoBusiness(snapshot: DemoSnapshot, id: string): DemoBusiness | undefined {
  if (snapshot.membershipsByBusinessId[id]?.status !== 'ACTIVA') return undefined
  return snapshot.businessesById[id]
}

export type BusinessInput = { name: string; category: string; kind: BusinessKind; description: string }
export type ProfileInput = { displayName: string; email: string; avatarInitials: string; contactPhone: string }
function requiredText(value: string, label: string, min: number, max: number): string {
  const clean = value.trim()
  if (clean.length < min || clean.length > max) throw new Error(label + ' debe tener entre ' + min + ' y ' + max + ' caracteres.')
  return clean
}

export const demoGateway = {
  async createFinancialAccount(businessId: string, input: FinancialAccountInput): Promise<DemoFinancialAccount> {
    activeBusiness(businessId)
    if (listDemoFinancialAccounts(state, businessId).length >= 100) {
      throw new Error('El prototipo admite hasta 100 cuentas de referencia por empresa.')
    }
    const fields = normalizeFinancialAccountInput(input)
    uniqueFinancialAccount(businessId, fields)
    const now = new Date().toISOString()
    const firstActive = !listDemoFinancialAccounts(state, businessId)
      .some((account) => account.status === 'ACTIVA')
    const account: DemoFinancialAccount = {
      ...fields, id: 'demo-financial-account-' + crypto.randomUUID(),
      businessId, status: 'ACTIVA', isPrimary: firstActive,
      createdAt: now, updatedAt: now,
    }
    notify({ ...state, financialAccountsById: {
      ...state.financialAccountsById, [account.id]: account,
    } })
    return account
  },

  async updateFinancialAccount(
    businessId: string, accountId: string, input: FinancialAccountInput,
  ): Promise<DemoFinancialAccount> {
    const previous = financialAccountOfBusiness(businessId, accountId)
    const fields = normalizeFinancialAccountInput(input)
    uniqueFinancialAccount(businessId, fields, accountId)
    if (previous.status !== 'ACTIVA') {
      throw new Error('Primero reactivá la cuenta para editar su ficha.')
    }
    const updated: DemoFinancialAccount = {
      ...previous, ...fields, updatedAt: new Date().toISOString(),
    }
    notify({ ...state, financialAccountsById: {
      ...state.financialAccountsById, [accountId]: updated,
    } })
    return updated
  },

  async setFinancialAccountStatus(
    businessId: string, accountId: string, status: DemoFinancialAccount['status'],
  ): Promise<DemoFinancialAccount> {
    const previous = financialAccountOfBusiness(businessId, accountId)
    if (status !== 'ACTIVA' && status !== 'INACTIVA') throw new Error('Estado de cuenta inválido.')
    if (status === previous.status) return previous
    const updated: DemoFinancialAccount = {
      ...previous, status, isPrimary: status === 'ACTIVA' ? previous.isPrimary : false,
      updatedAt: new Date().toISOString(),
    }
    notify({ ...state, financialAccountsById: {
      ...state.financialAccountsById, [accountId]: updated,
    } })
    return updated
  },

  async setPrimaryFinancialAccount(
    businessId: string, accountId: string,
  ): Promise<DemoFinancialAccount> {
    const selected = financialAccountOfBusiness(businessId, accountId)
    if (selected.status !== 'ACTIVA') throw new Error('Sólo una cuenta activa puede marcarse como principal.')
    if (selected.isPrimary) return selected
    const accounts = { ...state.financialAccountsById }
    for (const account of Object.values(accounts)) {
      if (account.businessId === businessId && account.isPrimary) {
        accounts[account.id] = { ...account, isPrimary: false, updatedAt: new Date().toISOString() }
      }
    }
    const updated: DemoFinancialAccount = { ...selected, isPrimary: true, updatedAt: new Date().toISOString() }
    accounts[accountId] = updated
    notify({ ...state, financialAccountsById: accounts })
    return updated
  },

  async openCashSession(
    businessId: string, locationId: string | null,
    openingCashCents: number, requestId: string,
  ): Promise<DemoCashSession> {
    activeBusiness(businessId)
    if (!/^demo-cash-open-[a-f0-9-]{36}$/.test(requestId)) throw new Error('Solicitud de apertura inválida.')
    const prior = Object.values(state.cashSessionsById).find((session) => session.openRequestId === requestId)
    if (prior) {
      if (prior.businessId !== businessId) throw new Error('La solicitud ya pertenece a otra empresa.')
      return prior
    }
    if (listDemoCashSessions(state, businessId).length >= 300) throw new Error('Se alcanzó el límite de jornadas DEMO por empresa.')
    cashCents(openingCashCents, 'Fondo inicial', true)
    if (locationId !== null) {
      const location = locationOfBusiness(businessId, locationId)
      if (location.status !== 'ACTIVA' || !location.canSell) {
        throw new Error('Elegí una ubicación activa habilitada para vender.')
      }
    }
    if (activeCashSession(state, businessId, locationId)) {
      throw new Error('Ya existe una jornada abierta para esa ubicación/caja.')
    }
    const opened: DemoCashSession = {
      id: 'demo-cash-session-' + crypto.randomUUID(), openRequestId: requestId,
      closeRequestId: null, businessId, locationId, openingCashCents,
      openedAt: new Date().toISOString(), openedBy: 'demo-user',
      status: 'ABIERTA', closeSnapshot: null,
    }
    notify({ ...state, cashSessionsById: { ...state.cashSessionsById, [opened.id]: opened } })
    return opened
  },

  async registerExpense(businessId: string, input: ExpenseInput, requestId: string): Promise<DemoExpense> {
    activeBusiness(businessId)
    if (!/^demo-expense-request-[a-f0-9-]{36}$/.test(requestId)) throw new Error('Solicitud de gasto inválida.')
    const prior = Object.values(state.expensesById).find((expense) => expense.requestId === requestId)
    if (prior) {
      if (prior.businessId !== businessId) throw new Error('La solicitud de gasto ya pertenece a otra empresa.')
      return prior
    }
    if (listDemoExpenses(state, businessId).length >= 500) throw new Error('Límite de gastos DEMO alcanzado.')
    const fields = normalizeExpense(input)
    const linkedAccount = accountForDeclaredPayment(businessId, fields.paymentMethod, fields.financialAccountId)
    if (fields.locationId !== null) {
      const loc = locationOfBusiness(businessId, fields.locationId)
      if (loc.status !== 'ACTIVA') throw new Error('Elegí una ubicación activa o dejá el gasto general.')
    }
    const session = fields.paymentMethod === 'EFECTIVO'
      ? activeCashSession(state, businessId, fields.locationId) : undefined
    if (session) {
      const { expectedCashCents } = cashSessionTotals(session,
        Object.values(state.salesById), Object.values(state.expensesById))
      if (fields.amountCents > expectedCashCents) {
        throw new Error('Efectivo insuficiente en esta jornada. No podés registrar un gasto mayor al efectivo esperado.')
      }
    }
    const expense: DemoExpense = {
      ...fields, id: 'demo-expense-' + crypto.randomUUID(),
      financialAccountId: linkedAccount?.id ?? null,
      financialAccountLabelSnapshot: linkedAccount?.label ?? null,
      requestId, businessId, cashSessionId: session?.id ?? null,
      createdAt: new Date().toISOString(),
    }
    notify({ ...state, expensesById: { ...state.expensesById, [expense.id]: expense } })
    return expense
  },

  async closeCashSession(
    businessId: string, sessionId: string, input: CashCloseInput,
    requestId: string,
  ): Promise<DemoCashSession> {
    activeBusiness(businessId)
    if (!/^demo-cash-close-[a-f0-9-]{36}$/.test(requestId)) throw new Error('Solicitud de cierre inválida.')
    const session = state.cashSessionsById[sessionId]
    if (!session || session.businessId !== businessId) throw new Error('Jornada no disponible para esta empresa.')
    if (session.status === 'CERRADA') {
      if (session.closeRequestId === requestId) return session
      throw new Error('Esta jornada ya está cerrada; su arqueo no se puede modificar.')
    }
    const used = Object.values(state.cashSessionsById).some((other) =>
      other.id !== session.id && other.closeRequestId === requestId)
    if (used) throw new Error('La solicitud ya fue usada para cerrar otra jornada.')
    const snapshot = makeCloseSnapshot(session,
      Object.values(state.salesById), Object.values(state.expensesById),
      input, new Date().toISOString())
    const closed: DemoCashSession = {
      ...session, status: 'CERRADA', closeRequestId: requestId, closeSnapshot: snapshot,
    }
    // Snapshot + estado CERRADA se guardan juntos; nunca se elimina el detalle.
    notify({ ...state, cashSessionsById: { ...state.cashSessionsById, [closed.id]: closed } })
    return closed
  },

  async countInventoryBatch(
    businessId: string, locationId: string, inputLines: InventoryCountInput[],
    reasonInput: string, requestId: string,
  ): Promise<InventoryOperation> {
    activeBusiness(businessId)
    if (!/^demo-inventory-request-[a-f0-9-]{36}$/.test(requestId)) throw new Error('Solicitud de conteo inválida.')
    const previous = Object.values(state.inventoryOperationsById).find((operation) => operation.requestId === requestId)
    if (previous) {
      if (previous.businessId !== businessId || previous.kind !== 'BATCH_COUNT') {
        throw new Error('La solicitud ya fue utilizada por otra operación.')
      }
      return previous
    }
    if (listDemoInventoryOperations(state, businessId).length >= 1500) {
      throw new Error('Se alcanzó el límite de operaciones DEMO por empresa.')
    }
    inventoryLocationOfBusiness(businessId, locationId)
    if (!Array.isArray(inputLines) || inputLines.length < 1 || inputLines.length > 200) {
      throw new Error('Contá al menos un artículo y no más de 200 por sesión.')
    }
    const reason = normalizeStockReason(reasonInput)
    const seen = new Set<string>()
    const lines: InventoryCountLine[] = inputLines.map((input) => {
      if (!input || typeof input.catalogItemId !== 'string' || seen.has(input.catalogItemId)) {
        throw new Error('Hay artículos duplicados o inválidos en el conteo.')
      }
      seen.add(input.catalogItemId)
      const item = inventoryItemOfBusiness(businessId, input.catalogItemId)
      validateStockMilli(input.expectedMilli, item.unit, true)
      validateStockMilli(input.countedMilli, item.unit, true)
      const current = inventoryBalanceMilli(state, businessId, item.id, locationId)
      const deltaMilli = checkedCountDifference(input.expectedMilli, current, input.countedMilli, item.unit)
      return {
        catalogItemId: item.id, itemNameSnapshot: item.name, unit: item.unit,
        expectedMilli: current, countedMilli: input.countedMilli, deltaMilli,
      }
    })
    const operation: InventoryOperation = {
      kind: 'BATCH_COUNT', id: 'demo-inventory-op-' + crypto.randomUUID(), requestId,
      businessId, locationId, reason, createdAt: new Date().toISOString(), lines,
    }
    // Un solo notify: no existe un estado intermedio con sólo una parte del conteo.
    notify({ ...state, inventoryOperationsById: { ...state.inventoryOperationsById, [operation.id]: operation } })
    return operation
  },

  async transferInventory(
    businessId: string, catalogItemId: string, sourceLocationId: string,
    destinationLocationId: string, quantityMilli: number, reasonInput: string, requestId: string,
  ): Promise<InventoryOperation> {
    activeBusiness(businessId)
    if (!/^demo-inventory-request-[a-f0-9-]{36}$/.test(requestId)) throw new Error('Solicitud inválida.')
    const previous = Object.values(state.inventoryOperationsById).find((operation) => operation.requestId === requestId)
    if (previous) {
      if (previous.businessId !== businessId || previous.kind !== 'TRANSFER')
        throw new Error('La solicitud de traslado ya fue utilizada.')
      return previous
    }
    if (listDemoInventoryOperations(state, businessId).length >= 1500)
      throw new Error('Se alcanzó el límite de operaciones DEMO por empresa.')
    const item = inventoryItemOfBusiness(businessId, catalogItemId)
    inventoryLocationOfBusiness(businessId, sourceLocationId)
    inventoryLocationOfBusiness(businessId, destinationLocationId)
    if (sourceLocationId === destinationLocationId) throw new Error('Elegí ubicaciones distintas.')
    const reason = normalizeStockReason(reasonInput)
    const available = inventoryBalanceMilli(state, businessId, item.id, sourceLocationId)
    requireTransferStock(available, quantityMilli, item.unit)
    const operation: InventoryOperation = {
      kind: 'TRANSFER', id: 'demo-inventory-op-' + crypto.randomUUID(), requestId,
      businessId, catalogItemId: item.id, itemNameSnapshot: item.name, unit: item.unit,
      sourceLocationId, destinationLocationId, quantityMilli, reason, createdAt: new Date().toISOString(),
    }
    notify({ ...state, inventoryOperationsById: { ...state.inventoryOperationsById, [operation.id]: operation } })
    return operation
  },

  async countInventory(
    businessId: string, catalogItemId: string, locationId: string,
    countedMilli: number, reasonInput: string, requestId: string,
  ): Promise<InventoryOperation> {
    activeBusiness(businessId)
    if (!/^demo-inventory-request-[a-f0-9-]{36}$/.test(requestId)) throw new Error('Solicitud inválida.')
    const previous = Object.values(state.inventoryOperationsById).find((operation) => operation.requestId === requestId)
    if (previous) {
      if (previous.businessId !== businessId || previous.kind !== 'COUNT')
        throw new Error('La solicitud de conteo ya fue utilizada.')
      return previous
    }
    if (listDemoInventoryOperations(state, businessId).length >= 1500)
      throw new Error('Se alcanzó el límite de operaciones DEMO por empresa.')
    const item = inventoryItemOfBusiness(businessId, catalogItemId)
    inventoryLocationOfBusiness(businessId, locationId)
    const reason = normalizeStockReason(reasonInput)
    const available = inventoryBalanceMilli(state, businessId, item.id, locationId)
    const deltaMilli = countDifference(available, countedMilli, item.unit)
    const operation: InventoryOperation = {
      kind: 'COUNT', id: 'demo-inventory-op-' + crypto.randomUUID(), requestId,
      businessId, catalogItemId: item.id, itemNameSnapshot: item.name, unit: item.unit,
      locationId, countedMilli, deltaMilli, reason, createdAt: new Date().toISOString(),
    }
    notify({ ...state, inventoryOperationsById: { ...state.inventoryOperationsById, [operation.id]: operation } })
    return operation
  },

  async registerSale(businessId: string, input: SaleInput, requestId: string): Promise<DemoSale> {
    activeBusiness(businessId)
    if (!/^demo-sale-request-[a-f0-9-]{36}$/.test(requestId)) {
      throw new Error('Identificador de venta inválido.')
    }
    const previous = Object.values(state.salesById).find((sale) => sale.requestId === requestId)
    if (previous) {
      if (previous.businessId !== businessId) throw new Error('La solicitud ya pertenece a otra empresa.')
      return previous
    }
    if (listDemoSales(state, businessId).length >= 500) {
      throw new Error('Esta empresa alcanzó el límite de ventas de demostración.')
    }
    const fields = normalizeSaleInput(input)
    const location = fields.locationId ? locationOfBusiness(businessId, fields.locationId) : null
    if (location && (location.status !== 'ACTIVA' || !location.canSell)) {
      throw new Error('Seleccioná una ubicación activa habilitada para vender.')
    }
    const seen = new Set<string>()
    const lines: SaleLineSnapshot[] = fields.lines.map((line) => {
      if (seen.has(line.catalogItemId)) throw new Error('Un mismo artículo no debe repetirse en el carrito. Sumá su cantidad.')
      seen.add(line.catalogItemId)
      const item = catalogItemOfBusiness(businessId, line.catalogItemId)
      if (item.status !== 'ACTIVO' || !item.sellable) {
        throw new Error('El artículo no está activo o no está disponible para vender.')
      }
      validSaleQuantity(line.quantityMilli, item.unit)
      const kind: SaleLineSnapshot['kind'] = item.kind === 'SERVICIO' ? 'SERVICIO' : 'BIEN'
      if (kind === 'BIEN') {
        if (!location || !location.canStore) {
          throw new Error('Para vender bienes elegí una ubicación activa que permita ventas y almacenamiento.')
        }
        requireTransferStock(inventoryBalanceMilli(state, businessId, item.id, location.id), line.quantityMilli, item.unit)
      }
      return {
        ...line, id: 'demo-sale-line-' + crypto.randomUUID(),
        name: item.name, sku: item.sku, unit: item.unit, kind,
        lineTotalCents: lineTotalCents(line.quantityMilli, line.unitPriceCents),
      }
    })
    const amounts = saleAmounts(lines, fields.discountCents)
    validateSalePayments(fields.payments, amounts.totalCents)
    const sale: DemoSale = {
      id: 'demo-sale-' + crypto.randomUUID(), requestId, businessId,
      locationId: location?.id ?? null, lines,
      ...amounts, payments: fields.payments.map((payment) => {
         const account = accountForDeclaredPayment(businessId, payment.method, payment.financialAccountId)
         return { ...payment, financialAccountId: account?.id ?? null,
           financialAccountLabelSnapshot: account?.label ?? null }
       }),
      notes: fields.notes, createdAt: new Date().toISOString(), status: 'REGISTRADA_DEMO',
      cashSessionId: activeCashSession(state, businessId, location?.id ?? null)?.id ?? null,
    }
    // El descuento de existencias y el registro de pagos se proyectan de esta
    // misma venta con un único notify; no se aplica otra salida de stock.
    notify({ ...state, salesById: { ...state.salesById, [sale.id]: sale } })
    return sale
  },

  async registerPurchase(businessId: string, input: PurchaseInput, requestId: string): Promise<DemoPurchase> {
    activeBusiness(businessId)
    if (!/^demo-request-[a-f0-9-]{36}$/.test(requestId)) throw new Error('Identificador de solicitud inválido.')
    const previous = Object.values(state.purchasesById).find((purchase) => purchase.requestId === requestId)
    if (previous) {
      if (previous.businessId !== businessId) throw new Error('La solicitud ya fue usada por otra empresa.')
      return previous // reintento de un mismo submit, sin duplicar una compra
    }
    if (listDemoPurchases(state, businessId).length >= 500) {
      throw new Error('La DEMO admite hasta 500 compras por empresa.')
    }
    const fields = normalizePurchaseInput(input)
    const supplier = fields.supplierId ? supplierOfBusiness(businessId, fields.supplierId) : null
    if (supplier && supplier.status !== 'ACTIVO') throw new Error('Seleccioná un proveedor activo o dejalo sin asignar.')
    const lines: PurchaseLineSnapshot[] = fields.lines.map((line) => {
      const item = line.catalogItemId ? catalogItemOfBusiness(businessId, line.catalogItemId) : null
      if (item && (item.status !== 'ACTIVO' || line.unit !== item.unit)) {
        throw new Error('Artículo inactivo o unidad modificada. Revisá los renglones de compra.')
      }
      const kind: PurchaseLineSnapshot['kind'] = !item ? 'CONCEPTO' : item.kind === 'SERVICIO' ? 'SERVICIO' : 'BIEN'
      return {
        ...line, description: item ? item.name : line.description, sku: item?.sku ?? '',
        kind, id: 'demo-purchase-line-' + crypto.randomUUID(),
        totalCents: lineTotalCents(line.quantityMilli, line.unitCostCents),
      }
    })
    const now = new Date().toISOString()
    const purchase: DemoPurchase = {
      id: 'demo-purchase-' + crypto.randomUUID(),
      requestId, businessId, supplierId: fields.supplierId,
      supplierNameSnapshot: supplier?.name ?? '',
      purchasedOn: fields.purchasedOn, reference: fields.reference,
      notes: fields.notes, lines, totalCents: sumLineTotals(lines),
      createdAt: now, receipt: null,
    }
    notify({ ...state, purchasesById: { ...state.purchasesById, [purchase.id]: purchase } })
    return purchase
  },

  async receivePurchase(businessId: string, purchaseId: string, locationId: string): Promise<PurchaseReceipt> {
    const purchase = purchaseOfBusiness(businessId, purchaseId)
    // Recepción única por compra, reintento idéntico = misma recepción sin segundo evento.
    if (purchase.receipt) return purchase.receipt
    const location = locationOfBusiness(businessId, locationId)
    if (location.status !== 'ACTIVA' || !location.canStore) {
      throw new Error('Elegí una ubicación activa que permita almacenar.')
    }
    const physical = physicalPurchaseLines(purchase.lines)
    if (!physical.length) throw new Error('Esta compra no contiene bienes del Catálogo que se puedan recibir.')
    for (const line of physical) {
      const item = catalogItemOfBusiness(businessId, line.catalogItemId!)
      if (item.kind === 'SERVICIO' || item.unit !== line.unit) {
        throw new Error('La unidad o tipo de un artículo cambió desde la compra. Revisalo antes de recibir.')
      }
    }
    const receipt: PurchaseReceipt = {
      id: 'demo-receipt-' + crypto.randomUUID(), locationId,
      createdAt: new Date().toISOString(),
      movements: physical.map((line) => ({
        id: 'demo-stock-' + crypto.randomUUID(),
        purchaseLineId: line.id,
        catalogItemId: line.catalogItemId!,
        unit: line.unit as PurchaseReceipt['movements'][number]['unit'],
        quantityMilli: line.quantityMilli,
      })),
    }
    const updated: DemoPurchase = { ...purchase, receipt }
    notify({ ...state, purchasesById: { ...state.purchasesById, [purchase.id]: updated } })
    return receipt
  },

  async createSupplier(businessId: string, input: SupplierInput): Promise<DemoSupplier> {
    activeBusiness(businessId)
    if (listDemoSuppliers(state, businessId).length >= 200) {
      throw new Error('El prototipo admite hasta 200 proveedores por empresa.')
    }
    const fields = normalizeSupplierInput(input)
    supplierUniqueness(businessId, fields.name)
    const now = new Date().toISOString()
    const supplier: DemoSupplier = {
      ...fields, id: 'demo-supplier-' + crypto.randomUUID(), businessId,
      status: 'ACTIVO', createdAt: now, updatedAt: now,
    }
    notify({ ...state, suppliersById: { ...state.suppliersById, [supplier.id]: supplier } })
    return supplier
  },

  async updateSupplier(businessId: string, supplierId: string, input: SupplierInput): Promise<DemoSupplier> {
    const previous = supplierOfBusiness(businessId, supplierId)
    const fields = normalizeSupplierInput(input)
    supplierUniqueness(businessId, fields.name, supplierId)
    const updated: DemoSupplier = { ...previous, ...fields, updatedAt: new Date().toISOString() }
    notify({ ...state, suppliersById: { ...state.suppliersById, [supplierId]: updated } })
    return updated
  },

  async setSupplierStatus(businessId: string, supplierId: string, status: DemoSupplier['status']): Promise<DemoSupplier> {
    const supplier = supplierOfBusiness(businessId, supplierId)
    if (status !== 'ACTIVO' && status !== 'INACTIVO') throw new Error('Estado de proveedor inválido.')
    if (supplier.status === status) return supplier
    const updated: DemoSupplier = { ...supplier, status, updatedAt: new Date().toISOString() }
    notify({ ...state, suppliersById: { ...state.suppliersById, [supplierId]: updated } })
    return updated
  },

  async createCatalogItem(businessId: string, input: CatalogInput): Promise<DemoCatalogItem> {
    activeBusiness(businessId)
    if (listDemoCatalog(state, businessId).length >= 500) {
      throw new Error('La DEMO admite hasta 500 artículos por empresa.')
    }
    const fields = normalizeCatalogInput(input)
    catalogUniqueness(businessId, fields)
    const now = new Date().toISOString()
    const item: DemoCatalogItem = {
      ...fields, id: 'demo-catalog-' + crypto.randomUUID(), businessId,
      status: 'ACTIVO', createdAt: now, updatedAt: now,
    }
    notify({ ...state, catalogItemsById: { ...state.catalogItemsById, [item.id]: item } })
    return item
  },

  async updateCatalogItem(businessId: string, itemId: string, input: CatalogInput): Promise<DemoCatalogItem> {
    const current = catalogItemOfBusiness(businessId, itemId)
    const fields = normalizeCatalogInput(input)
    catalogUniqueness(businessId, fields, itemId)
    if (fields.unit !== current.unit || (fields.kind === 'SERVICIO') !== (current.kind === 'SERVICIO')) {
      const hasHistory = Object.values(state.purchasesById).some((purchase) =>
        purchase.businessId === businessId && purchase.lines.some((line) => line.catalogItemId === itemId))
        || Object.values(state.inventoryOperationsById).some((operation) =>
          operation.businessId === businessId && (operation.kind === 'BATCH_COUNT'
            ? operation.lines.some((line) => line.catalogItemId === itemId)
            : operation.catalogItemId === itemId))
      if (hasHistory || Object.values(state.salesById).some((sale) =>
        sale.businessId === businessId && sale.lines.some((line) => line.catalogItemId === itemId))) {
        throw new Error('No podés cambiar la unidad ni convertir un bien en servicio mientras tenga compras, ventas o movimientos históricos.')
      }
    }
    const updated: DemoCatalogItem = { ...current, ...fields, updatedAt: new Date().toISOString() }
    notify({ ...state, catalogItemsById: { ...state.catalogItemsById, [itemId]: updated } })
    return updated
  },

  async setCatalogItemStatus(businessId: string, itemId: string, status: DemoCatalogItem['status']): Promise<DemoCatalogItem> {
    const current = catalogItemOfBusiness(businessId, itemId)
    if (status !== 'ACTIVO' && status !== 'INACTIVO') throw new Error('Estado inválido.')
    if (current.status === status) return current
    const updated: DemoCatalogItem = { ...current, status, updatedAt: new Date().toISOString() }
    notify({ ...state, catalogItemsById: { ...state.catalogItemsById, [itemId]: updated } })
    return updated
  },

  async createInvitation(businessId: string, emailInput: string, role: InviteRole): Promise<DemoInvitation> {
    activeBusiness(businessId)
    const { email } = normalizeInviteInput(emailInput, role)
    if (state.profile.email && email === state.profile.email.trim().toLowerCase()) {
      throw new Error('No podés invitar a tu mismo perfil DEMO.')
    }
    if (Object.values(state.teamMembersById).some((item) => item.businessId === businessId && item.email === email && item.status === 'ACTIVA')) {
      throw new Error('Ya existe una membresía DEMO activa para ese correo dentro de esta empresa.')
    }
    const existing = Object.values(state.teamInvitationsById).filter((item) => item.businessId === businessId)
    if (existing.length >= 100) throw new Error('La DEMO permite hasta 100 invitaciones históricas por empresa.')
    if (existing.some((item) => item.email === email && displayInvitationStatus(item) === 'PENDIENTE')) {
      throw new Error('Ya hay una invitación pendiente para ese correo en esta empresa.')
    }
    const createdAt = new Date().toISOString()
    const invitation: DemoInvitation = {
      id: 'demo-invite-' + crypto.randomUUID(), businessId, email, role, status: 'PENDIENTE',
      createdAt, expiresAt: invitationExpiresAt(createdAt),
    }
    notify({ ...state, teamInvitationsById: { ...state.teamInvitationsById, [invitation.id]: invitation } })
    return invitation
  },

  async cancelInvitation(businessId: string, invitationId: string): Promise<DemoInvitation> {
    const current = invitationInBusiness(businessId, invitationId)
    if (current.status === 'CANCELADA') return current
    if (!canReplyToInvitation(current)) throw new Error('Sólo puede cancelarse una invitación pendiente y vigente.')
    const updated: DemoInvitation = { ...current, status: 'CANCELADA' }
    notify({ ...state, teamInvitationsById: { ...state.teamInvitationsById, [invitationId]: updated } })
    return updated
  },

  async simulateInvitationResponse(businessId: string, invitationId: string, action: 'ACEPTAR' | 'RECHAZAR'): Promise<DemoInvitation> {
    const invitation = invitationInBusiness(businessId, invitationId)
    if (action !== 'ACEPTAR' && action !== 'RECHAZAR') throw new Error('Respuesta DEMO inválida.')
    if (invitation.status === 'ACEPTADA' && action === 'ACEPTAR' && invitation.memberId && state.teamMembersById[invitation.memberId]) {
      return invitation // doble click/reintento no duplica integrante
    }
    if (!canReplyToInvitation(invitation)) throw new Error('La invitación no está pendiente o ya venció.')
    if (action === 'RECHAZAR') {
      const rejected: DemoInvitation = { ...invitation, status: 'RECHAZADA' }
      notify({ ...state, teamInvitationsById: { ...state.teamInvitationsById, [invitationId]: rejected } })
      return rejected
    }
    if (Object.values(state.teamMembersById).some((item) => item.businessId === businessId && item.email === invitation.email)) {
      throw new Error('Ese correo ya tiene un integrante DEMO en esta empresa.')
    }
    if (listDemoTeamMembers(state, businessId).length >= 50) throw new Error('La DEMO admite hasta 50 integrantes invitados por empresa.')
    const member: DemoTeamMember = {
      id: 'demo-team-' + crypto.randomUUID(), businessId, email: invitation.email,
      role: invitation.role, status: 'ACTIVA', joinedAt: new Date().toISOString(),
      sourceInvitationId: invitation.id,
    }
    const accepted: DemoInvitation = { ...invitation, status: 'ACEPTADA', memberId: member.id }
    // Una única actualización local representa invitación ACEPTADA + nueva membresía.
    notify({
      ...state,
      teamInvitationsById: { ...state.teamInvitationsById, [invitation.id]: accepted },
      teamMembersById: { ...state.teamMembersById, [member.id]: member },
    })
    return accepted
  },

  async createLocation(businessId: string, input: LocationInput): Promise<DemoLocation> {
    activeBusiness(businessId)
    const current = Object.values(state.locationsById).filter((location) => location.businessId === businessId)
    if (current.length >= 100) throw new Error('El prototipo admite hasta 100 ubicaciones por empresa.')
    const fields = normalizeLocationInput(input)
    const location: DemoLocation = {
      ...fields, id: 'demo-location-' + crypto.randomUUID(), businessId,
      status: 'ACTIVA', isPrimary: !current.some((item) => item.isPrimary && item.status === 'ACTIVA'),
    }
    notify({ ...state, locationsById: { ...state.locationsById, [location.id]: location } })
    return location
  },

  async updateLocation(businessId: string, locationId: string, input: LocationInput): Promise<DemoLocation> {
    const previous = locationOfBusiness(businessId, locationId)
    const fields = normalizeLocationInput(input)
    if (previous.canStore && !fields.canStore) {
      const hasStock = listDemoCatalog(state, businessId).some((item) =>
        item.kind !== 'SERVICIO' && inventoryBalanceMilli(state, businessId, item.id, locationId) > 0)
      if (hasStock) throw new Error('La ubicación conserva existencias. Trasladá o ajustá el stock antes de deshabilitar el almacenamiento.')
    }
    const updated: DemoLocation = { ...previous, ...fields }
    notify({ ...state, locationsById: { ...state.locationsById, [locationId]: updated } })
    return updated
  },

  async setPrimaryLocation(businessId: string, locationId: string): Promise<DemoLocation> {
    const location = locationOfBusiness(businessId, locationId)
    if (location.status !== 'ACTIVA') throw new Error('Sólo una ubicación activa puede ser principal.')
    const locationsById = { ...state.locationsById }
    for (const item of Object.values(state.locationsById)) {
      if (item.businessId === businessId && item.isPrimary) locationsById[item.id] = { ...item, isPrimary: false }
    }
    locationsById[locationId] = { ...location, isPrimary: true }
    notify({ ...state, locationsById })
    return locationsById[locationId]
  },

  async setLocationStatus(businessId: string, locationId: string, status: DemoLocation['status']): Promise<DemoLocation> {
    const previous = locationOfBusiness(businessId, locationId)
    if (!['ACTIVA', 'PAUSADA'].includes(status)) throw new Error('Estado de ubicación inválido.')
    if (previous.status === status) return previous
    const updated: DemoLocation = { ...previous, status, isPrimary: status === 'PAUSADA' ? false : previous.isPrimary }
    notify({ ...state, locationsById: { ...state.locationsById, [locationId]: updated } })
    return updated
  },

  async saveProfile(input: ProfileInput): Promise<DemoProfile> {
    const displayName = requiredText(input.displayName, 'El nombre visible', 2, 70)
    const email = input.email.trim()
    if (email.length > 120 || (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      throw new Error('Ingresá un correo válido o dejá el campo vacío.')
    }
    const avatarInitials = input.avatarInitials.trim().toUpperCase()
    if (!/^[A-ZÁÉÍÓÚÜÑ]{0,4}$/.test(avatarInitials)) {
      throw new Error('Las iniciales pueden contener hasta 4 letras, sin números ni símbolos.')
    }
    const contactPhone = input.contactPhone.trim()
    if (contactPhone.length > 30 || !/^[+()\d\s.-]*$/.test(contactPhone)) {
      throw new Error('El contacto debe usar números y signos telefónicos, con hasta 30 caracteres.')
    }
    const profile: DemoProfile = { id: 'demo-user', displayName, email, avatarInitials, contactPhone }
    notify({ ...state, profile })
    return profile
  },

  async createBusiness(input: BusinessInput): Promise<DemoBusiness> {
    const name = requiredText(input.name, 'El nombre de la empresa', 2, 80)
    const category = input.category.trim()
    const description = input.description.trim()
    if (category.length > 120) throw new Error('El rubro puede tener hasta 120 caracteres.')
    if (description.length > 350) throw new Error('La descripción puede tener hasta 350 caracteres.')
    if (!['PRODUCTOS', 'SERVICIOS', 'MIXTO'].includes(input.kind)) throw new Error('Seleccioná un tipo de actividad válido.')
    if (Object.keys(state.businessesById).length >= 53) throw new Error('La demostración admite hasta 50 empresas nuevas.')
    const id = 'demo-business-' + crypto.randomUUID()
    const business: DemoBusiness = {
      id, name, category: category || 'Sin rubro especificado',
      kind: input.kind, description, slogan: '', taxId: '', initials: name.slice(0, 1).toUpperCase(),
      accent: 'blue', source: 'created',
      founderUserId: 'demo-user', administrativeOwnerUserId: 'demo-user',
    }
    notify({
      ...state,
      businessesById: { ...state.businessesById, [id]: business },
      membershipsByBusinessId: { ...state.membershipsByBusinessId, [id]: membership(id) },
    })
    return business
  },

  async saveMemberJobTitle(businessId: string, jobTitle: string): Promise<DemoMembership> {
    const current = state.membershipsByBusinessId[businessId]
    if (!current || current.status !== 'ACTIVA' || !state.businessesById[businessId]) {
      throw new Error('Membresía DEMO no disponible para esta empresa.')
    }
    const title = jobTitle.trim()
    if (title.length > 80) throw new Error('La función laboral admite hasta 80 caracteres.')
    const updated = { ...current, jobTitle: title }
    notify({
      ...state,
      membershipsByBusinessId: { ...state.membershipsByBusinessId, [businessId]: updated },
    })
    return updated
  },

  /** Edita exclusivamente los campos comerciales de la empresa solicitada. */
  async updateBusinessDetails(businessId: string, patch: BusinessDetailsPatch): Promise<DemoBusiness> {
    const current = findDemoBusiness(state, businessId)
    if (!current) throw new Error('Empresa DEMO no disponible.')
    if (Object.keys(patch).some((key) => !['name', 'category', 'description', 'slogan', 'taxId'].includes(key))) {
      throw new Error('Campo de empresa no permitido.')
    }
    const name = patch.name === undefined ? current.name : requiredText(patch.name, 'El nombre comercial', 2, 80)
    const category = patch.category === undefined ? current.category : patch.category.trim() || 'Sin rubro especificado'
    const description = patch.description === undefined ? current.description : patch.description.trim()
    const slogan = patch.slogan === undefined ? current.slogan : patch.slogan.trim()
    const taxId = patch.taxId === undefined ? current.taxId : patch.taxId.trim()
    if (category.length > 120) throw new Error('El rubro admite hasta 120 caracteres.')
    if (description.length > 350) throw new Error('La descripción admite hasta 350 caracteres.')
    if (slogan.length > 120) throw new Error('El eslogan admite hasta 120 caracteres.')
    if (taxId.length > 0 && !/^\d{11}$|^\d{2}-\d{8}-\d$/.test(taxId)) {
      throw new Error('El CUIT de prueba debe tener 11 dígitos, con guiones opcionales.')
    }
    const updated: DemoBusiness = { ...current, name, category, description, slogan, taxId, initials: name.slice(0, 1).toUpperCase() }
    notify({ ...state, businessesById: { ...state.businessesById, [businessId]: updated } })
    return updated
  },
}
