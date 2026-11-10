import { ApiHttpError, ApiTransportError, createApiClient } from '../../api/httpClient.ts'
import { UUID_PATTERN, UUID_V4_PATTERN } from '../businesses/businessGateway.ts'

/**
 * T09-A: lectura del contrato EXISTENTE E2-6: GET /businesses/{id}/sales/{sale_id}.
 * No inventa GET /sales ni búsqueda por request_id (pendientes de P02/P03).
 * No utiliza DEMO, no crea ventas ni registra tokens en almacenamiento.
 */
export type SaleKind = 'BIEN' | 'SERVICIO'
export type DeclaredPaymentMethod =
  'EFECTIVO' | 'TRANSFERENCIA' | 'CUENTA_DNI' | 'TARJETA' | 'MERCADO_PAGO_DECLARADO'

export type SaleLine = {
  id: string
  line_number: number
  catalog_item_id: string
  description_snapshot: string
  kind_snapshot: SaleKind
  unit_snapshot: string
  sku_snapshot: string
  quantity_milli: number
  unit_price_cents: number
  line_total_cents: number
}
export type SalePayment = {
  id: string
  payment_number: number
  method: DeclaredPaymentMethod
  amount_cents: number
  reference: string
}
export type SaleBalanceSnapshot = {
  catalog_item_id: string
  quantity_milli: number
  version: number
}
export type SaleReceipt = {
  id: string
  business_id: string
  location_id: string | null
  request_id: string
  status: 'CONFIRMADA'
  subtotal_cents: number
  discount_cents: number
  total_cents: number
  notes: string
  created_by_id: string
  created_at: string
  balances_after: SaleBalanceSnapshot[]
  lines: SaleLine[]
  payments: SalePayment[]
}

const MAX_CENTS = 99_999_999_999
const MAX_MILLI = 999_999_999
const MAX_BALANCE_MILLI = 999_999_999_999_999
const units = new Set([
  'UNIDAD', 'GRAMO', 'KILOGRAMO', 'MILILITRO', 'LITRO',
  'PAQUETE', 'CAJA', 'SERVICIO',
])
const discreteUnits = new Set(['UNIDAD', 'PAQUETE', 'CAJA', 'SERVICIO'])
const methods = new Set([
  'EFECTIVO', 'TRANSFERENCIA', 'CUENTA_DNI', 'TARJETA', 'MERCADO_PAGO_DECLARADO',
])
const obj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const uuid = (v: unknown): v is string =>
  typeof v === 'string' && UUID_PATTERN.test(v)
const integer = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max
const validDate = (v: unknown): v is string =>
  typeof v === 'string' && Number.isFinite(Date.parse(v))
function invalid(): never {
  throw new ApiTransportError('invalid-response', false)
}
function preciseLineTotal(milli: number, cents: number): number {
  // HALF_UP; same units as FastAPI. Never multiply JS floats for money.
  return Number((BigInt(milli) * BigInt(cents) + 500n) / 1000n)
}
function noRepeatedRecords<T>(
  records: T[], primary: (row: T) => string, ordinal?: (row: T) => number,
): void {
  if (new Set(records.map(primary)).size !== records.length) invalid()
  if (ordinal) {
    const positions = records.map(ordinal)
    if (new Set(positions).size !== positions.length ||
      positions.some(n => n > records.length)) invalid()
  }
}

/** Reject incompatible/off-tenant receipts instead of presenting invented financial data. */
export function parseSaleReceipt(value: unknown, businessId: string): SaleReceipt {
  if (!obj(value) || !uuid(value.id) || value.business_id !== businessId ||
    !uuid(value.business_id) ||
    !(value.location_id === null || uuid(value.location_id)) ||
    typeof value.request_id !== 'string' || !UUID_V4_PATTERN.test(value.request_id) ||
    value.status !== 'CONFIRMADA' || !uuid(value.created_by_id) ||
    !validDate(value.created_at) || typeof value.notes !== 'string' ||
    !integer(value.subtotal_cents, 1, MAX_CENTS) ||
    !integer(value.discount_cents, 0, MAX_CENTS) ||
    !integer(value.total_cents, 1, MAX_CENTS) ||
    value.subtotal_cents - value.discount_cents !== value.total_cents ||
    !Array.isArray(value.lines) || value.lines.length < 1 || value.lines.length > 30 ||
    !Array.isArray(value.payments) || value.payments.length < 1 || value.payments.length > 6 ||
    !Array.isArray(value.balances_after)) return invalid()

  const lines = value.lines.map(raw => {
    if (!obj(raw) || !uuid(raw.id) ||
      !integer(raw.line_number, 1, 30) || !uuid(raw.catalog_item_id) ||
      typeof raw.description_snapshot !== 'string' || !raw.description_snapshot.trim() ||
      (raw.kind_snapshot !== 'BIEN' && raw.kind_snapshot !== 'SERVICIO') ||
      typeof raw.unit_snapshot !== 'string' || !units.has(raw.unit_snapshot) ||
      (raw.kind_snapshot === 'SERVICIO') !== (raw.unit_snapshot === 'SERVICIO') ||
      typeof raw.sku_snapshot !== 'string' ||
      !integer(raw.quantity_milli, 1, MAX_MILLI) ||
      !integer(raw.unit_price_cents, 0, MAX_CENTS) ||
      !integer(raw.line_total_cents, 0, MAX_CENTS)) return invalid()
    if (discreteUnits.has(raw.unit_snapshot) && raw.quantity_milli % 1000 !== 0) return invalid()
    if (preciseLineTotal(raw.quantity_milli, raw.unit_price_cents) !== raw.line_total_cents) return invalid()
    return raw as SaleLine
  })
  noRepeatedRecords(lines, x => x.id, x => x.line_number)
  if (lines.reduce((sum, line) => sum + line.line_total_cents, 0) !== value.subtotal_cents) return invalid()

  const payments = value.payments.map(raw => {
    if (!obj(raw) || !uuid(raw.id) || !integer(raw.payment_number, 1, 6) ||
      typeof raw.method !== 'string' || !methods.has(raw.method) ||
      !integer(raw.amount_cents, 1, MAX_CENTS) ||
      typeof raw.reference !== 'string') return invalid()
    return raw as SalePayment
  })
  noRepeatedRecords(payments, x => x.id, x => x.payment_number)
  if (payments.reduce((sum, payment) => sum + payment.amount_cents, 0) !== value.total_cents) return invalid()

  const balances = value.balances_after.map(raw => {
    if (!obj(raw) || !uuid(raw.catalog_item_id) ||
      !integer(raw.quantity_milli, 0, MAX_BALANCE_MILLI) ||
      !integer(raw.version, 1, Number.MAX_SAFE_INTEGER)) return invalid()
    return raw as SaleBalanceSnapshot
  })
  noRepeatedRecords(balances, x => x.catalog_item_id)
  const physical = new Set(lines.filter(line => line.kind_snapshot === 'BIEN')
    .map(line => line.catalog_item_id))
  if (balances.length !== physical.size ||
    balances.some(balance => !physical.has(balance.catalog_item_id)) ||
    (physical.size > 0 && value.location_id === null)) return invalid()

  return {
    id: value.id, business_id: value.business_id, location_id: value.location_id,
    request_id: value.request_id, status: 'CONFIRMADA',
    subtotal_cents: value.subtotal_cents, discount_cents: value.discount_cents,
    total_cents: value.total_cents, notes: value.notes,
    created_by_id: value.created_by_id, created_at: value.created_at,
    balances_after: balances, lines, payments,
  }
}

export function createSalesReadGateway(
  token: string, businessId: string, fetchImpl?: typeof fetch,
) {
  if (!token || !UUID_PATTERN.test(businessId))
    throw new TypeError('Se requiere sesión y empresa REAL válidas')
  const api = createApiClient({ getAccessToken: () => token, fetchImpl })
  return {
    /** Only an existing GET by sale UUID. This is NOT GET by request_id. */
    async get(saleId: string, signal?: AbortSignal): Promise<SaleReceipt> {
      if (!UUID_PATTERN.test(saleId)) throw new TypeError('ID de venta inválido')
      const raw = await api.request<unknown>(
        '/businesses/' + businessId + '/sales/' + saleId, { signal },
      )
      return parseSaleReceipt(raw, businessId)
    },
  }
}

export function salesReadErrorMessage(error: unknown): string {
  if (error instanceof ApiHttpError) {
    if (error.status === 401) return 'Sesión vencida o revocada. Volvé a iniciar sesión.'
    if (error.status === 403) return 'No tenés permiso para leer esta venta.'
    if (error.status === 404) return 'No existe una venta accesible con este ID en la empresa.'
    return 'FastAPI no pudo consultar el comprobante de venta.'
  }
  if (error instanceof ApiTransportError) {
    if (error.reason === 'invalid-response') return 'La API devolvió un comprobante incompatible.'
    if (error.reason === 'timeout') return 'Se agotó el tiempo de consulta.'
    if (error.reason === 'aborted') return 'Consulta cancelada.'
    return 'No se pudo consultar FastAPI. Verificá tu conexión.'
  }
  return error instanceof Error ? error.message : 'No se pudo consultar el comprobante.'
}
