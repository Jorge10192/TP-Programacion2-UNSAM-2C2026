import { unavailableGateway } from '../gateway.ts'
import type { AppGateway } from '../gateway.ts'
import type { Snapshot } from '../models.ts'
import type { SessionClient, SessionUser } from './session.ts'
import { GatewayError } from './httpClient.ts'
import { mapSnapshot, object } from './snapshot.ts'
import { stockKey } from '../demo/inventoryPolicy.ts'

export type RecoveryOperation = { message: string; busy: boolean; retry: () => void }
export type ApiEvents = { snapshot?: (snapshot: Snapshot) => void; recovery?: (operation: RecoveryOperation | null) => void }
export type ApiConnection = { gateway: AppGateway; loadSnapshot(user: SessionUser): Promise<Snapshot>; reset?: () => void }

function uuid(value: string): string {
  const match = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(value)
  if (!match) throw new GatewayError('validation', 'La operación necesita un identificador estable.')
  return match[1]
}

export function createApiGateway(session: SessionClient, events: ApiEvents = {}): ApiConnection {
  let snapshot: Snapshot | null = null
  let active: { cancel: () => void } | null = null
  let readSequence = 0, appliedSequence = 0
  function currentUser() {
    const state = session.getSnapshot()
    if (state.status !== 'authenticated' || !state.user) throw new GatewayError('unauthenticated', 'Ingresá para continuar.', 401)
    return state.user
  }
  async function loadSnapshot(user: SessionUser) {
    const sequence = ++readSequence
    const mapped = mapSnapshot(await session.request('/api/v1/snapshot'), user)
    if (sequence >= appliedSequence) { snapshot = mapped; appliedSequence = sequence }
    return snapshot!
  }
  function ready(businessId: string, capability?: string) {
    currentUser()
    if (!snapshot?.businessesById[businessId]) throw new GatewayError('forbidden', 'Empresa no disponible.', 404)
    if (capability && !snapshot.apiCapabilitiesByBusiness?.[businessId]?.[capability]) throw new GatewayError('forbidden', 'Tu membresía no permite esta operación.', 403)
    return '/api/v1/businesses/' + encodeURIComponent(businessId)
  }
  function run<T>(path: string, body: unknown, select: (fresh: Snapshot, response: unknown) => T,
    method = 'POST', key: string = crypto.randomUUID()): Promise<T> {
    if (active) return Promise.reject(new GatewayError('conflict', 'Comprobá primero la operación pendiente.'))
    const owner = currentUser().id
    const frozen = JSON.parse(JSON.stringify(body)) as unknown
    return new Promise<T>((resolve, reject) => {
      let finished = false, busy = false, confirmed = false, uncertain = false, response: unknown
      const done = () => { finished = true; active = null; events.recovery?.(null) }
      active = { cancel() { if (!finished) { done(); reject(new GatewayError('stale', 'Se cerró la sesión. Comprobá el historial al volver a ingresar.')) } } }
      async function attempt() {
        if (busy || finished) return
        busy = true
        try {
          if (currentUser().id !== owner) throw new GatewayError('stale', 'La operación pertenece a otra cuenta.')
          if (!confirmed) { response = await session.request(path, { method, body: frozen, idempotencyKey: key }); confirmed = true }
          const fresh = await loadSnapshot(currentUser())
          if (finished) return
          const result = select(fresh, response)
          events.snapshot?.(fresh)
          done(); resolve(result)
        } catch (error) {
          if (finished) return
          if (error instanceof GatewayError && (error.outcome === 'unknown' || error.kind === 'stale')) uncertain = true
          const recoverable = confirmed || uncertain && error instanceof GatewayError &&
            (error.outcome === 'unknown' || error.kind === 'stale' || error.kind === 'unauthenticated')
          if (recoverable) events.recovery?.({ busy: false,
            retry: () => { events.recovery?.({ busy: true, retry: () => {}, message: 'Comprobando la misma operación…' }); void attempt() },
            message: confirmed ? 'El servidor confirmó la operación. Reintentá la lectura para actualizar los datos.'
              : 'El resultado no pudo comprobarse. Reintentá la misma operación; el servidor conserva su clave para evitar duplicados.' })
          else {
            if (error instanceof GatewayError && error.kind === 'conflict') {
              try { const fresh = await loadSnapshot(currentUser()); if (!finished) events.snapshot?.(fresh) } catch { /* No replay of a conflicting command. */ }
            }
            if (!finished) { done(); reject(error) }
          }
        } finally { busy = false }
      }
      void attempt()
    })
  }
  function record<T>(values: Record<string, T>, response: unknown): T {
    const identifier = object(response).id
    if (typeof identifier !== 'string' || !values[identifier]) throw new GatewayError('server', 'La operación confirmada no aparece en la lectura completa.')
    return values[identifier]
  }
  const gateway: AppGateway = {
    ...unavailableGateway(),
    createBusiness: input => run('/api/v1/businesses', { name: input.name, category: input.category,
      activity_kind: input.kind, description: input.description }, (fresh, response) => record(fresh.businessesById, response)),
    saveProfile: input => run('/api/v1/profile', input, fresh => fresh.profile, 'PUT'),
    saveMemberJobTitle: (businessId, jobTitle) => run(ready(businessId) + '/membership/job-title', { jobTitle }, fresh => fresh.membershipsByBusinessId[businessId], 'PUT'),
    updateBusinessDetails: (businessId, input) => run(ready(businessId, 'business'), input, fresh => fresh.businessesById[businessId], 'PATCH'),
    createLocation: (businessId, input) => run(ready(businessId, 'resources') + '/locations', input, (fresh,r) => record(fresh.locationsById,r)),
    updateLocation: (businessId, identifier, input) => run(ready(businessId, 'resources') + '/locations/' + uuid(identifier), input, (fresh,r) => record(fresh.locationsById,r), 'PUT'),
    setLocationStatus: (businessId, identifier, status) => run(ready(businessId, 'resources') + '/locations/' + uuid(identifier) + '/status', {status}, (fresh,r) => record(fresh.locationsById,r), 'PATCH'),
    setPrimaryLocation: (businessId, identifier) => run(ready(businessId, 'resources') + '/locations/' + uuid(identifier) + '/primary', {}, (fresh,r) => record(fresh.locationsById,r)),
    createSupplier: (businessId, input) => run(ready(businessId, 'resources') + '/suppliers', input, (fresh,r) => record(fresh.suppliersById,r)),
    updateSupplier: (businessId, identifier, input) => run(ready(businessId, 'resources') + '/suppliers/' + uuid(identifier), input, (fresh,r) => record(fresh.suppliersById,r), 'PUT'),
    setSupplierStatus: (businessId, identifier, status) => run(ready(businessId, 'resources') + '/suppliers/' + uuid(identifier) + '/status', {status}, (fresh,r) => record(fresh.suppliersById,r), 'PATCH'),
    createCatalogItem: (businessId, input) => run(ready(businessId, 'resources') + '/catalog', input, (fresh,r) => record(fresh.catalogItemsById,r)),
    updateCatalogItem: (businessId, identifier, input) => run(ready(businessId, 'resources') + '/catalog/' + uuid(identifier), input, (fresh,r) => record(fresh.catalogItemsById,r), 'PUT'),
    setCatalogItemStatus: (businessId, identifier, status) => run(ready(businessId, 'resources') + '/catalog/' + uuid(identifier) + '/status', {status}, (fresh,r) => record(fresh.catalogItemsById,r), 'PATCH'),
    createFinancialAccount: (businessId, input) => run(ready(businessId, 'resources') + '/accounts', input, (fresh,r) => record(fresh.financialAccountsById,r)),
    updateFinancialAccount: (businessId, identifier, input) => run(ready(businessId, 'resources') + '/accounts/' + uuid(identifier), input, (fresh,r) => record(fresh.financialAccountsById,r), 'PUT'),
    setFinancialAccountStatus: (businessId, identifier, status) => run(ready(businessId, 'resources') + '/accounts/' + uuid(identifier) + '/status', {status}, (fresh,r) => record(fresh.financialAccountsById,r), 'PATCH'),
    setPrimaryFinancialAccount: (businessId, identifier) => run(ready(businessId, 'resources') + '/accounts/' + uuid(identifier) + '/primary', {}, (fresh,r) => record(fresh.financialAccountsById,r)),
    registerPurchase: (businessId, input, requestId) => run(ready(businessId, 'purchase') + '/purchases', input, (fresh,r) => record(fresh.purchasesById,r), 'POST', uuid(requestId)),
    receivePurchase: (businessId, identifier, locationId) => run(ready(businessId, 'receipt') + '/purchases/' + uuid(identifier) + '/receive', {locationId},
      fresh => fresh.purchasesById[identifier].receipt!, 'POST', uuid(identifier)),
    countInventoryBatch: (businessId, locationId, lines, reason, requestId) => run(ready(businessId, 'count') + '/inventory/counts',
      {locationId, reason, lines: lines.map(line => ({catalogItemId:line.catalogItemId, expectedMilli:line.expectedMilli, countedMilli:line.countedMilli, expectedVersion: line.expectedVersion ?? snapshot!.apiStockVersions?.[stockKey(locationId,line.catalogItemId)] ?? 0}))},
      (fresh,r) => record(fresh.inventoryOperationsById,r), 'POST', uuid(requestId)),
    async countInventory(businessId, catalogItemId, locationId, countedMilli, reason, requestId) {
      const key = stockKey(locationId,catalogItemId)
      return gateway.countInventoryBatch(businessId, locationId, [{catalogItemId, countedMilli,
        expectedMilli:snapshot?.apiStockBalances?.[key] ?? 0, expectedVersion:snapshot?.apiStockVersions?.[key] ?? 0}], reason, requestId)
    },
    transferInventory: (businessId, catalogItemId, sourceLocationId, destinationLocationId, quantityMilli, reason, requestId) => run(ready(businessId, 'count') + '/inventory/transfers',
      {catalogItemId, sourceLocationId, destinationLocationId, quantityMilli, reason}, (fresh,r) => record(fresh.inventoryOperationsById,r), 'POST', uuid(requestId)),
    registerSale: (businessId, input, requestId) => run(ready(businessId, 'sale') + '/sales', input, (fresh,r) => record(fresh.salesById,r), 'POST', uuid(requestId)),
    registerExpense: (businessId, input, requestId) => run(ready(businessId, 'expense') + '/expenses', input, (fresh,r) => record(fresh.expensesById,r), 'POST', uuid(requestId)),
    openCashSession: (businessId, locationId, openingCashCents, requestId) => run(ready(businessId, 'cash') + '/cash-sessions', {locationId, openingCashCents},
      (fresh,r) => record(fresh.cashSessionsById,r), 'POST', uuid(requestId)),
    closeCashSession: (businessId, identifier, input, requestId) => run(ready(businessId, 'cash') + '/cash-sessions/' + uuid(identifier) + '/close', input,
      (fresh,r) => record(fresh.cashSessionsById,r), 'POST', uuid(requestId)),
  }
  return { gateway, loadSnapshot, reset() { active?.cancel(); snapshot = null } }
}
