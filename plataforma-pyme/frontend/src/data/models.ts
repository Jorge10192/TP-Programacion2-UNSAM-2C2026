import type { InviteRole, InvitationStatus } from './demo/teamPolicy'
import type { CatalogInput } from './demo/catalogPolicy'
import type { SupplierInput } from './demo/supplierPolicy'
import type { PurchaseInput, PurchaseLineSnapshot, PurchaseReceipt } from './demo/purchasePolicy'
import type { InventoryMovement, InventoryOperation } from './demo/inventoryPolicy'
import type { SaleLineSnapshot, SalePayment } from './demo/salePolicy'
import type { CashSession, Expense } from './demo/cashPolicy'
import type { FinancialAccount } from './demo/financialAccountPolicy'
import type { QrIntent } from './demo/qrDemoPolicy'

export type BusinessKind = 'PRODUCTOS' | 'SERVICIOS' | 'MIXTO'
export type Accent = 'mint' | 'blue' | 'violet'
export type Profile = { id: string; displayName: string; email: string; avatarInitials: string; contactPhone: string }
export function profileInitials(profile: Pick<Profile, 'displayName' | 'avatarInitials'>): string {
  return profile.avatarInitials ||
    profile.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() ||
    'UD'
}

export type Business = {
  id: string
  name: string
  category: string
  kind: BusinessKind
  description: string
  slogan: string
  taxId: string
  initials: string
  accent: Accent
  source: 'fixture' | 'created' | 'server'
  founderUserId: string | null
  administrativeOwnerUserId: string | null
}
export type Membership = {
  businessId: string
  userId: string
  role: 'TITULAR_ADMINISTRATIVO'
  status: 'ACTIVA'
  jobTitle: string
}
export type LocationKind = 'LOCAL' | 'FERIA' | 'DEPOSITO' | 'OFICINA' | 'OTRO'
export type Location = {
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
export type LocationInput = Pick<Location, 'name' | 'kind' | 'address' | 'mapUrl' | 'canSell' | 'canStore'>
export const locationKindLabels: Record<LocationKind, string> = {
  LOCAL: 'Local o sucursal',
  FERIA: 'Feria o punto temporal',
  DEPOSITO: 'Depósito',
  OFICINA: 'Oficina o espacio de trabajo',
  OTRO: 'Otro espacio',
}

export type Invitation = {
  id: string
  businessId: string
  email: string
  role: InviteRole
  status: InvitationStatus
  createdAt: string
  expiresAt: string
  memberId?: string
}
export type TeamMember = {
  id: string
  businessId: string
  email: string
  role: InviteRole
  status: 'ACTIVA'
  joinedAt: string
  sourceInvitationId: string
}

export type CatalogItem = CatalogInput & {
  id: string
  businessId: string
  status: 'ACTIVO' | 'INACTIVO'
  createdAt: string
  updatedAt: string
  readonlyReason?: string
}

export type Supplier = SupplierInput & {
  id: string
  businessId: string
  status: 'ACTIVO' | 'INACTIVO'
  createdAt: string
  updatedAt: string | null
}

export type Purchase = Omit<PurchaseInput, 'lines'> & {
  id: string
  requestId: string
  businessId: string
  supplierNameSnapshot: string
  lines: PurchaseLineSnapshot[]
  totalCents: number
  createdAt: string
  receipt: PurchaseReceipt | null
  serverStatus?: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA'
}

export type Sale = {
  id: string; requestId: string; businessId: string; locationId: string | null
  lines: SaleLineSnapshot[]; subtotalCents: number; discountCents: number
  totalCents: number; payments: SalePayment[]; notes: string
  createdAt: string; status: 'REGISTRADA_DEMO' | 'REGISTRADA'; cashSessionId?: string | null
}

export type ReceiptMovement = PurchaseReceipt['movements'][number] & {
  businessId: string
  purchaseId: string
  receiptId: string
  locationId: string
  createdAt: string
  source: 'RECEPCION_COMPRA'
}

export type Snapshot = {
  version: 1
  mode?: 'demo' | 'api'
  apiInventoryMovements?: InventoryMovement[]
  apiStockBalances?: Record<string, number>
  apiStockVersions?: Record<string, number>
  apiUnitIds?: Record<string, number>
  apiCategoryIds?: Record<string, number>
  apiCashVersions?: Record<string, number>
  apiCapabilities?: Record<string, boolean>
  apiAsOf?: string
  apiLegacyRecords?: LegacyRecord[]
  apiSourceCounts?: Record<string, number>
  profile: Profile
  businessesById: Record<string, Business>
  membershipsByBusinessId: Record<string, Membership>
  locationsById: Record<string, Location>
  teamInvitationsById: Record<string, Invitation>
  teamMembersById: Record<string, TeamMember>
  catalogItemsById: Record<string, CatalogItem>
  suppliersById: Record<string, Supplier>
  purchasesById: Record<string, Purchase>
  inventoryOperationsById: Record<string, InventoryOperation>
  salesById: Record<string, Sale>
  expensesById: Record<string, Expense>
  cashSessionsById: Record<string, CashSession>
  financialAccountsById: Record<string, FinancialAccount>
  qrIntentsById: Record<string, QrIntent>
}

export type LegacyRecord = {
  id: string; kind: string; label: string; reasons: string[]
  fields: { label: string; value: string }[]
}

export const kindLabels: Record<BusinessKind, string> = {
  PRODUCTOS: 'Venta o elaboración de productos',
  SERVICIOS: 'Prestación de servicios',
  MIXTO: 'Productos y servicios',
}

export type EditableBusinessField = 'name' | 'category' | 'description' | 'slogan' | 'taxId'
export type BusinessDetailsPatch = Partial<Pick<Business, EditableBusinessField>>

export type BusinessInput = { name: string; category: string; kind: BusinessKind; description: string }
export type ProfileInput = { displayName: string; email: string; avatarInitials: string; contactPhone: string }

export type { CashSession } from './demo/cashPolicy'
export type { Expense } from './demo/cashPolicy'
export type { FinancialAccount } from './demo/financialAccountPolicy'
export type { QrIntent } from './demo/qrDemoPolicy'

export const emptySnapshot: Snapshot = {
  version: 1, mode: 'api', profile: { id: '', displayName: '', email: '', avatarInitials: '', contactPhone: '' },
  businessesById: {}, membershipsByBusinessId: {}, locationsById: {}, teamInvitationsById: {},
  teamMembersById: {}, catalogItemsById: {}, suppliersById: {}, purchasesById: {},
  inventoryOperationsById: {}, salesById: {}, expensesById: {}, cashSessionsById: {},
  financialAccountsById: {}, qrIntentsById: {},
}
