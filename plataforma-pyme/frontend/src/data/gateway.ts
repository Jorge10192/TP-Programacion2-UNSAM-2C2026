import type { BusinessInput, ProfileInput, BusinessDetailsPatch, LocationInput, Business, Profile, Membership, Location, CatalogItem, Supplier, Purchase, Sale, Invitation } from './models.ts'
import type { CatalogInput } from './demo/catalogPolicy.ts'
import type { SupplierInput } from './demo/supplierPolicy.ts'
import type { PurchaseInput, PurchaseReceipt } from './demo/purchasePolicy.ts'
import type { SaleInput } from './demo/salePolicy.ts'
import type { ExpenseInput, Expense, CashSession, CashCloseInput } from './demo/cashPolicy.ts'
import type { InventoryCountInput, InventoryOperation } from './demo/inventoryPolicy.ts'
import type { FinancialAccountInput, FinancialAccount } from './demo/financialAccountPolicy.ts'
import type { InviteRole } from './demo/teamPolicy.ts'
import type { QrIntent } from './demo/qrDemoPolicy.ts'
import { GatewayError } from './api/httpClient.ts'

export interface AppGateway {
  createFinancialAccount(businessId: string, input: FinancialAccountInput): Promise<FinancialAccount>;
  updateFinancialAccount( businessId: string, accountId: string, input: FinancialAccountInput, ): Promise<FinancialAccount>;
  setFinancialAccountStatus( businessId: string, accountId: string, status: FinancialAccount['status'], ): Promise<FinancialAccount>;
  setPrimaryFinancialAccount( businessId: string, accountId: string, ): Promise<FinancialAccount>;
  openCashSession( businessId: string, locationId: string | null, openingCashCents: number, requestId: string, ): Promise<CashSession>;
  registerExpense(businessId: string, input: ExpenseInput, requestId: string): Promise<Expense>;
  closeCashSession( businessId: string, sessionId: string, input: CashCloseInput, requestId: string, ): Promise<CashSession>;
  countInventoryBatch( businessId: string, locationId: string, inputLines: InventoryCountInput[], reasonInput: string, requestId: string, ): Promise<InventoryOperation>;
  transferInventory( businessId: string, catalogItemId: string, sourceLocationId: string, destinationLocationId: string, quantityMilli: number, reasonInput: string, requestId: string, ): Promise<InventoryOperation>;
  countInventory( businessId: string, catalogItemId: string, locationId: string, countedMilli: number, reasonInput: string, requestId: string, ): Promise<InventoryOperation>;
  createQrDemoIntent(businessId: string, input: SaleInput, requestId: string, saleRequestId: string): Promise<QrIntent>;
  cancelQrDemoIntent(businessId: string, intentId: string): Promise<QrIntent>;
  simulateQrDemoApproval(businessId: string, intentId: string): Promise<Sale>;
  registerSale(businessId: string, input: SaleInput, requestId: string): Promise<Sale>;
  registerPurchase(businessId: string, input: PurchaseInput, requestId: string): Promise<Purchase>;
  receivePurchase(businessId: string, purchaseId: string, locationId: string): Promise<PurchaseReceipt>;
  createSupplier(businessId: string, input: SupplierInput): Promise<Supplier>;
  updateSupplier(businessId: string, supplierId: string, input: SupplierInput): Promise<Supplier>;
  setSupplierStatus(businessId: string, supplierId: string, status: Supplier['status']): Promise<Supplier>;
  createCatalogItem(businessId: string, input: CatalogInput): Promise<CatalogItem>;
  updateCatalogItem(businessId: string, itemId: string, input: CatalogInput): Promise<CatalogItem>;
  setCatalogItemStatus(businessId: string, itemId: string, status: CatalogItem['status']): Promise<CatalogItem>;
  createInvitation(businessId: string, emailInput: string, role: InviteRole): Promise<Invitation>;
  cancelInvitation(businessId: string, invitationId: string): Promise<Invitation>;
  simulateInvitationResponse(businessId: string, invitationId: string, action: 'ACEPTAR' | 'RECHAZAR'): Promise<Invitation>;
  createLocation(businessId: string, input: LocationInput): Promise<Location>;
  updateLocation(businessId: string, locationId: string, input: LocationInput): Promise<Location>;
  setPrimaryLocation(businessId: string, locationId: string): Promise<Location>;
  setLocationStatus(businessId: string, locationId: string, status: Location['status']): Promise<Location>;
  saveProfile(input: ProfileInput): Promise<Profile>;
  createBusiness(input: BusinessInput): Promise<Business>;
  saveMemberJobTitle(businessId: string, jobTitle: string): Promise<Membership>;
  updateBusinessDetails(businessId: string, patch: BusinessDetailsPatch): Promise<Business>;
}

export function unavailableGateway(): AppGateway {
  const unavailable = async (): Promise<never> => { throw new GatewayError('unsupported', 'Esta operación todavía no está habilitada en el servidor. No se guardaron datos locales.') }
  return {
    createFinancialAccount: unavailable,
    updateFinancialAccount: unavailable,
    setFinancialAccountStatus: unavailable,
    setPrimaryFinancialAccount: unavailable,
    openCashSession: unavailable,
    registerExpense: unavailable,
    closeCashSession: unavailable,
    countInventoryBatch: unavailable,
    transferInventory: unavailable,
    countInventory: unavailable,
    createQrDemoIntent: unavailable,
    cancelQrDemoIntent: unavailable,
    simulateQrDemoApproval: unavailable,
    registerSale: unavailable,
    registerPurchase: unavailable,
    receivePurchase: unavailable,
    createSupplier: unavailable,
    updateSupplier: unavailable,
    setSupplierStatus: unavailable,
    createCatalogItem: unavailable,
    updateCatalogItem: unavailable,
    setCatalogItemStatus: unavailable,
    createInvitation: unavailable,
    cancelInvitation: unavailable,
    simulateInvitationResponse: unavailable,
    createLocation: unavailable,
    updateLocation: unavailable,
    setPrimaryLocation: unavailable,
    setLocationStatus: unavailable,
    saveProfile: unavailable,
    createBusiness: unavailable,
    saveMemberJobTitle: unavailable,
    updateBusinessDetails: unavailable,
  }
}
