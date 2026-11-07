import { unavailableGateway } from '../gateway.ts'
import type { AppGateway } from '../gateway.ts'
import type { Snapshot } from '../models.ts'
import type { SessionClient, SessionUser } from './session.ts'
import { GatewayError } from './httpClient.ts'
import { id, integer, object, mapSnapshot } from './snapshot.ts'
import { stockKey } from '../demo/inventoryPolicy.ts'
import type { InventoryCountInput } from '../demo/inventoryPolicy.ts'

export type RecoveryOperation = { message: string; busy: boolean; retry: () => void }
export type ApiEvents = { snapshot?: (snapshot: Snapshot) => void; recovery?: (operation: RecoveryOperation | null) => void }
export type ApiConnection = { gateway: AppGateway; loadSnapshot(user: SessionUser): Promise<Snapshot>; reset?: () => void }
function sqlId(value: string, prefix: string): number {
  const match = new RegExp('^' + prefix + ':([1-9][0-9]*)$').exec(value)
  if (!match || !Number.isSafeInteger(Number(match[1]))) throw new GatewayError('validation', 'Identificador de servidor inválido.')
  return Number(match[1])
}
function uuid(value: string): string {
  const match = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(value)
  if (!match) throw new GatewayError('validation', 'La operación necesita un identificador estable.')
  return match[1]
}
export function decimalQuantity(milli: number): string {
  if (!Number.isSafeInteger(milli) || milli < 0) throw new GatewayError('validation', 'Cantidad inválida.')
  const micro = BigInt(milli) * 1000n
  return (micro / 1_000_000n).toString() + '.' + (micro % 1_000_000n).toString().padStart(6, '0')
}

/** A pending command lives only in memory. It is never replayed automatically. */
export function createApiGateway(session: SessionClient, events: ApiEvents = {}): ApiConnection {
  let snapshot: Snapshot | null = null
  let active: { cancel: () => void } | null = null
  let readSequence = 0, appliedSequence = 0
  function currentUser() {
    const state = session.getSnapshot()
    if (state.status !== 'authenticated' || !state.user) throw new GatewayError('unauthenticated', 'Volvé a ingresar para continuar.', 401)
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
    if (businessId !== 'walos' || !snapshot) throw new GatewayError('validation', 'Primero recuperá los datos de WALOS.')
    if (capability && snapshot.apiCapabilities?.[capability] !== true) throw new GatewayError('forbidden', 'Tu usuario no tiene permiso para esta operación.', 403)
    return snapshot
  }
  function location(value: string | null) {
    if (value !== 'principal') throw new GatewayError('validation', 'Seleccioná la ubicación principal.')
    return 'principal'
  }
  function cashSession() {
    const open = Object.values(snapshot!.cashSessionsById).find(row => row.status === 'ABIERTA' && row.locationId === 'principal')
    if (!open) throw new GatewayError('validation', 'Abrí una jornada antes de registrar ventas o gastos, incluso por transferencia.')
    return sqlId(open.id, 'jornada')
  }
  function unit(code: string) {
    const result = snapshot!.apiUnitIds?.[code]
    if (!result || code === 'SERVICIO') throw new GatewayError('validation', 'La unidad no está configurada en el servidor.')
    return result
  }
  function item(value: string) {
    const record = snapshot!.catalogItemsById[value]
    if (!record || record.readonlyReason || record.status !== 'ACTIVO' || record.kind === 'SERVICIO') throw new GatewayError('validation', 'El artículo no está disponible para operar.')
    return sqlId(value, 'insumo')
  }
  function run<T>(path: string, body: unknown, select: (fresh: Snapshot, response: unknown) => T): Promise<T> {
    if (active) return Promise.reject(new GatewayError('conflict', 'Terminá de comprobar la operación pendiente antes de registrar otra.'))
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
          if (currentUser().id !== owner) throw new GatewayError('stale', 'La operación pertenece a otra sesión.')
          if (!confirmed) { response = await session.request(path, { method: 'POST', body: frozen }); confirmed = true }
          const fresh = await loadSnapshot(currentUser())
          if (finished) return
          const result = select(fresh, response)
          events.snapshot?.(fresh)
          done(); resolve(result)
        } catch (error) {
          if (finished) return
          if (error instanceof GatewayError && (error.outcome === 'unknown' || error.kind === 'stale')) uncertain = true
          const recoverable = confirmed || uncertain && error instanceof GatewayError && (error.outcome === 'unknown' || error.kind === 'stale' || error.kind === 'unauthenticated')
          if (recoverable) {
            events.recovery?.({ busy: false, retry: () => { events.recovery?.({ busy: true, retry: () => {}, message: 'Comprobando la misma operación…' }); void attempt() },
              message: confirmed ? 'El servidor confirmó la operación. Falta actualizar los datos; reintentá la lectura para terminar.' : 'No se pudo comprobar el resultado. Reintentá la misma operación con sus valores originales; el servidor evita duplicados.' })
          } else {
            if (error instanceof GatewayError && error.kind === 'conflict') {
              try { const fresh = await loadSnapshot(currentUser()); if (!finished) events.snapshot?.(fresh) } catch { /* Keep the original rejection; never replay a conflicting command. */ }
            }
            if (!finished) { done(); reject(error) }
          }
        } finally { busy = false }
      }
      void attempt()
    })
  }
  function select<T>(values: Record<string, T>, prefix: string, response: unknown): T {
    const result = values[id(prefix, object(response).id)]
    if (!result) throw new GatewayError('server', 'La operación confirmada no está disponible en la lectura completa.')
    return result
  }
  const gateway: AppGateway = {
    ...unavailableGateway(),
    async createSupplier(businessId, input) {
      ready(businessId)
      if (input.offerings || input.contactPerson || input.phone || input.whatsapp || input.email || input.address || input.mapsUrl || input.website || input.instagram || input.paymentMethods.length || input.promotions.length) throw new GatewayError('validation', 'Online sólo se guardan nombre y observaciones del proveedor.')
      return run('/api/v1/proveedores', { request_id: crypto.randomUUID(), nombre: input.name, observaciones: input.notes }, (fresh, response) => select(fresh.suppliersById, 'proveedor', response))
    },
    async createCatalogItem(businessId, input) {
      const state = ready(businessId)
      const categoryId = state.apiCategoryIds?.[input.category]
      if (!categoryId || input.kind === 'SERVICIO') throw new GatewayError('validation', 'Elegí una categoría del servidor y un artículo físico.')
      return run('/api/v1/catalogo', { request_id: crypto.randomUUID(), nombre: input.name, tipo: input.kind, sku: input.sku,
        categoria_id: categoryId, unidad_stock_id: unit(input.unit), vendible: input.sellable, precio_centavos: input.priceCents,
        costo_referencia_centavos: input.referenceCostCents, descripcion: input.description, observaciones: input.observations }, (fresh, response) => select(fresh.catalogItemsById, 'insumo', response))
    },
    async registerPurchase(businessId, input, requestId) {
      ready(businessId, 'purchase')
      if (!input.supplierId) throw new GatewayError('validation', 'Seleccioná un proveedor.')
      return run('/api/v1/compras', { request_id: uuid(requestId), proveedor_id: sqlId(input.supplierId, 'proveedor'), fecha: input.purchasedOn,
        referencia_comercial: input.reference, observaciones: input.notes, items: input.lines.map(line => {
          if (!line.catalogItemId) throw new GatewayError('validation', 'Online sólo se compran artículos físicos del catálogo.')
          return { insumo_id: item(line.catalogItemId), cantidad: decimalQuantity(line.quantityMilli), unidad_compra_id: unit(line.unit), costo_unitario_centavos: line.unitCostCents }
        }) }, (fresh, response) => select(fresh.purchasesById, 'compra', response))
    },
    async receivePurchase(businessId, purchaseId, locationId) {
      ready(businessId, 'receipt')
      return run('/api/v1/compras/' + sqlId(purchaseId, 'compra') + '/recibir', { ubicacion_id: location(locationId) }, fresh => {
        const receipt = fresh.purchasesById[purchaseId]?.receipt
        if (!receipt) throw new GatewayError('server', 'Falta la recepción confirmada en el historial.')
        return receipt
      })
    },
    async countInventoryBatch(businessId, locationId, lines, reason, requestId) {
      const state = ready(businessId, 'count')
      return run('/api/v1/stock/conteos', { request_id: uuid(requestId), ubicacion_id: location(locationId), motivo: reason,
        items: lines.map(line => ({ insumo_id: item(line.catalogItemId), cantidad_esperada: decimalQuantity(line.expectedMilli),
          cantidad_contada: decimalQuantity(line.countedMilli), expected_version: integer(line.expectedVersion ?? state.apiStockVersions?.[line.catalogItemId] ?? 0) })) },
      (fresh, response) => select(fresh.inventoryOperationsById, 'conteo', response))
    },
    async countInventory(businessId, catalogItemId, locationId, countedMilli, reason, requestId) {
      const state = ready(businessId, 'count')
      const line: InventoryCountInput = { catalogItemId, expectedMilli: state.apiStockBalances?.[stockKey(locationId, catalogItemId)] ?? 0,
        countedMilli, expectedVersion: state.apiStockVersions?.[catalogItemId] ?? 0 }
      return gateway.countInventoryBatch(businessId, locationId, [line], reason, requestId)
    },
    async openCashSession(businessId, locationId, openingCashCents, requestId) {
      ready(businessId, 'cash')
      return run('/api/v1/jornadas', { request_id: uuid(requestId), ubicacion_id: location(locationId), fondo_centavos: openingCashCents }, (fresh, response) => select(fresh.cashSessionsById, 'jornada', response))
    },
    async closeCashSession(businessId, sessionId, input, requestId) {
      const state = ready(businessId, 'cash')
      return run('/api/v1/jornadas/' + sqlId(sessionId, 'jornada') + '/cerrar', { request_id: uuid(requestId), expected_version: integer(state.apiCashVersions?.[sessionId]), contado_centavos: input.countedCashCents, motivo: input.notes }, (fresh, response) => select(fresh.cashSessionsById, 'jornada', response))
    },
    async registerSale(businessId, input, requestId) {
      ready(businessId, 'sale')
      if (input.payments.some(payment => payment.financialAccountId)) throw new GatewayError('validation', 'Las cuentas financieras no están habilitadas online.')
      return run('/api/v1/ventas', { request_id: uuid(requestId), jornada_id: cashSession(), ubicacion_id: location(input.locationId), descuento_centavos: input.discountCents,
        observaciones: input.notes, items: input.lines.map(line => ({ insumo_id: item(line.catalogItemId), cantidad: decimalQuantity(line.quantityMilli), precio_unitario_centavos: line.unitPriceCents })),
        pagos: input.payments.map(payment => ({ medio: payment.method, importe_centavos: payment.amountCents })) }, (fresh, response) => select(fresh.salesById, 'venta', response))
    },
    async registerExpense(businessId, input, requestId) {
      ready(businessId, 'expense')
      if (input.financialAccountId) throw new GatewayError('validation', 'Las cuentas financieras no están habilitadas online.')
      return run('/api/v1/gastos', { request_id: uuid(requestId), jornada_id: cashSession(), ubicacion_id: location(input.locationId), fecha: input.paidOn,
        categoria: input.category, concepto: input.description, importe_centavos: input.amountCents, medio: input.paymentMethod, observaciones: input.notes }, (fresh, response) => select(fresh.expensesById, 'gasto', response))
    },
  }
  return { gateway, loadSnapshot, reset() { active?.cancel(); snapshot = null; appliedSequence = ++readSequence } }
}
