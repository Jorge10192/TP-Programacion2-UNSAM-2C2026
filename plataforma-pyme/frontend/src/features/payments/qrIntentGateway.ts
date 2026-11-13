/** B2: QR MOCK_QA. Jamás equivale a una orden ni un pago de Mercado Pago. */
import { ApiHttpError, ApiTransportError, createApiClient } from '../../api/httpClient.ts'
import { UUID_PATTERN, UUID_V4_PATTERN } from '../businesses/businessGateway.ts'
import type { PosCartLine } from '../sales/realPosDraft.ts'
import { calculateSaleTotals } from '../sales/realSaleCommand.ts'
import { parseSaleReceipt } from '../sales/realSalesReadGateway.ts'
import type { SaleReceipt } from '../sales/realSalesReadGateway.ts'

export type QrIntentCommand = {
  location_id: string | null
  lines: PosCartLine[]
  discount_cents: number
  notes: string
}

export type QrIntentLine = {
  line_number: number
  catalog_item_id: string
  description_snapshot: string
  sku_snapshot: string
  kind_snapshot: 'BIEN' | 'SERVICIO'
  unit_snapshot: string
  quantity_milli: number
  unit_price_cents: number
  line_total_cents: number
}

export type QrSimAction = 'APROBAR' | 'RECHAZAR' | 'EXPIRAR' | 'INDETERMINAR'
export type QrPaymentEvent = {
  id: string
  business_id: string
  intent_id: string
  event_key: string
  sequence: number
  action: 'CREAR' | 'CANCELAR' | 'FINALIZAR' | 'REVISION' | QrSimAction
  from_status: string
  to_status: QrIntent['status']
  actor_id: string
  created_at: string
}
export type QrIntent = {
  id: string
  business_id: string
  location_id: string | null
  request_id: string
  provider: 'MOCK_QA'
  currency: 'ARS'
  status: 'ESPERANDO_PAGO' | 'CANCELADA' | 'EXPIRADA' |
    'APROBADA_DEMO' | 'RECHAZADA' | 'INDETERMINADA' | 'REQUIERE_REVISION' | 'FINALIZADA'
  reference: string
  subtotal_cents: number
  discount_cents: number
  total_cents: number
  notes: string
  created_at: string
  expires_at: string
  qr_png_data_uri: string
  sale_id?: string | null
  lines: QrIntentLine[]
}

export type QrFinalized = { intent: QrIntent; sale: SaleReceipt; replayed: boolean }

export type QrIntentSummary = {
  id: string
  business_id: string
  location_id: string | null
  created_by_id: string
  status: QrIntent['status']
  provider: 'MOCK_QA'
  currency: 'ARS'
  reference: string
  total_cents: number
  created_at: string
  expires_at: string
  sale_id: string | null
}
export const QR_HISTORY_PAGE_SIZE = 20

export function parseQrSummary(raw: unknown, businessId: string): QrIntentSummary {
  if (!isObject(raw) || raw.business_id !== businessId ||
      !UUID_PATTERN.test(String(raw.id)) ||
      !(raw.location_id === null || UUID_PATTERN.test(String(raw.location_id))) ||
      !UUID_PATTERN.test(String(raw.created_by_id)) ||
      !['ESPERANDO_PAGO','CANCELADA','EXPIRADA','APROBADA_DEMO','RECHAZADA',
        'INDETERMINADA','REQUIERE_REVISION','FINALIZADA'].includes(String(raw.status)) ||
      raw.provider !== 'MOCK_QA' || raw.currency !== 'ARS' ||
      typeof raw.reference !== 'string' || !/^PYME-DEMO-[A-F0-9]{32}$/.test(raw.reference) ||
      !isCents(raw.total_cents) || (raw.total_cents as number) <= 0 ||
      typeof raw.created_at !== 'string' || !Number.isFinite(Date.parse(raw.created_at)) ||
      typeof raw.expires_at !== 'string' || !Number.isFinite(Date.parse(raw.expires_at)) ||
      !(raw.sale_id === null || UUID_PATTERN.test(String(raw.sale_id))) ||
      (raw.status === 'FINALIZADA') !== (raw.sale_id !== null))
    throw new ApiTransportError('invalid-response', false)
  return raw as QrIntentSummary
}


const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const isCents = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0 &&
  (value as number) <= 99_999_999_999

export function makeQrIntentCommand(
  locationId: string | null, cart: readonly PosCartLine[],
  discountCents: number, notes: string,
): QrIntentCommand {
  if (locationId !== null && !UUID_PATTERN.test(locationId)) throw new TypeError('Sede inválida')
  const totals = calculateSaleTotals(cart, discountCents)
  if (typeof notes !== 'string') throw new TypeError('Notas inválidas')
  const cleaned = notes.normalize('NFKC').trim().replace(/\s+/gu, ' ')
  if (cleaned.length > 500 || /\p{C}/u.test(cleaned)) throw new RangeError('Notas inválidas')
  if (totals.total_cents <= 0 || new Set(cart.map(line => line.catalog_item_id)).size !== cart.length)
    throw new RangeError('Detalle de cobro inválido')
  return { location_id: locationId, lines: cart.map(row => ({ ...row })),
    discount_cents: discountCents, notes: cleaned }
}

export function parseQrIntent(raw: unknown, businessId: string): QrIntent {
  if (!isObject(raw) || raw.business_id !== businessId || !UUID_PATTERN.test(String(raw.id)) ||
      !UUID_V4_PATTERN.test(String(raw.request_id)) || raw.provider !== 'MOCK_QA' || raw.currency !== 'ARS' ||
      !['ESPERANDO_PAGO','CANCELADA','EXPIRADA','APROBADA_DEMO','RECHAZADA','INDETERMINADA',
        'REQUIERE_REVISION','FINALIZADA'].includes(String(raw.status)) ||
      !(raw.location_id === null || UUID_PATTERN.test(String(raw.location_id))) ||
      !isCents(raw.subtotal_cents) || !isCents(raw.discount_cents) || !isCents(raw.total_cents) ||
      (raw.total_cents as number) < 1 ||
      (raw.subtotal_cents as number) - (raw.discount_cents as number) !== raw.total_cents ||
      typeof raw.reference !== 'string' || !/^PYME-DEMO-[A-F0-9]{32}$/.test(raw.reference) ||
      !(raw.sale_id === undefined || raw.sale_id === null || UUID_PATTERN.test(String(raw.sale_id))) ||
      (raw.status === 'FINALIZADA' && !UUID_PATTERN.test(String(raw.sale_id))) ||
      (raw.status !== 'FINALIZADA' && raw.sale_id !== undefined && raw.sale_id !== null) ||
      typeof raw.notes !== 'string' || typeof raw.created_at !== 'string' ||
      typeof raw.expires_at !== 'string' || !Number.isFinite(Date.parse(raw.expires_at)) ||
      typeof raw.qr_png_data_uri !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(raw.qr_png_data_uri) ||
      !Array.isArray(raw.lines) || raw.lines.length === 0 || raw.lines.length > 30) {
    throw new ApiTransportError('invalid-response', false)
  }
  let sum = 0
  const ids = new Set<string>()
  for (const [i, line] of raw.lines.entries()) {
    if (!isObject(line) || line.line_number !== i + 1 ||
        !UUID_PATTERN.test(String(line.catalog_item_id)) || ids.has(String(line.catalog_item_id)) ||
        typeof line.description_snapshot !== 'string' || typeof line.sku_snapshot !== 'string' ||
        typeof line.unit_snapshot !== 'string' || !['BIEN','SERVICIO'].includes(String(line.kind_snapshot)) ||
        !Number.isSafeInteger(line.quantity_milli) || (line.quantity_milli as number) <= 0 ||
        !isCents(line.unit_price_cents) || !isCents(line.line_total_cents) ||
        (BigInt(line.quantity_milli as number) * BigInt(line.unit_price_cents as number) + 500n) / 1000n !==
          BigInt(line.line_total_cents as number)) throw new ApiTransportError('invalid-response', false)
    ids.add(String(line.catalog_item_id))
    sum += line.line_total_cents as number
  }
  if (sum !== raw.subtotal_cents) throw new ApiTransportError('invalid-response', false)
  return raw as QrIntent
}

export function createQrIntentGateway(token: string, businessId: string, transport?: typeof fetch) {
  if (!token || !UUID_PATTERN.test(businessId)) throw new TypeError('Token/empresa no válidos')
  const api = createApiClient({ getAccessToken: () => token, fetchImpl: transport })
  const path = '/businesses/' + businessId + '/qr-payment-intents'
  return {
    list(offset=0, limit=QR_HISTORY_PAGE_SIZE, signal?: AbortSignal): Promise<QrIntentSummary[]> {
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10_000_000 ||
          !Number.isSafeInteger(limit) || limit < 1 || limit > 50)
        throw new RangeError('Paginación QR inválida')
      return api.request<unknown>(path + '?offset=' + offset + '&limit=' + limit, { signal })
        .then(raw => {
          if (!Array.isArray(raw) || raw.length > limit)
            throw new ApiTransportError('invalid-response', false)
          const rows = raw.map(row => parseQrSummary(row, businessId))
          if (new Set(rows.map(row => row.id)).size !== rows.length)
            throw new ApiTransportError('invalid-response', false)
          return rows
        })
    },
    create(body: QrIntentCommand, requestId: string): Promise<QrIntent> {
      if (!UUID_V4_PATTERN.test(requestId)) throw new TypeError('Solicitud UUID4 inválida')
      return api.request<unknown>(path, {
        method: 'POST', body, idempotencyKey: requestId,
      }).then(raw => parseQrIntent(raw, businessId))
    },
    get(intentId: string, signal?: AbortSignal): Promise<QrIntent> {
      if (!UUID_PATTERN.test(intentId)) throw new TypeError('Intento inválido')
      return api.request<unknown>(path + '/' + intentId, { signal })
        .then(raw => parseQrIntent(raw, businessId))
    },
    byRequest(requestId: string, signal?: AbortSignal): Promise<QrIntent> {
      if (!UUID_V4_PATTERN.test(requestId)) throw new TypeError('Solicitud inválida')
      return api.request<unknown>(path + '/by-request/' + requestId, { signal })
        .then(raw => parseQrIntent(raw, businessId))
    },
    events(intentId: string, signal?: AbortSignal): Promise<QrPaymentEvent[]> {
      if (!UUID_PATTERN.test(intentId)) throw new TypeError('Intento inválido')
      return api.request<unknown>(path + '/' + intentId + '/events', { signal }).then(raw => {
        if (!Array.isArray(raw) || raw.length > 1000) throw new ApiTransportError('invalid-response', false)
        return raw.map((entry, i) => {
          if (!isObject(entry) || !UUID_PATTERN.test(String(entry.id)) ||
              entry.business_id !== businessId || entry.intent_id !== intentId ||
              !UUID_PATTERN.test(String(entry.actor_id)) || !UUID_PATTERN.test(String(entry.event_key)) ||
              entry.sequence !== i + 1 || typeof entry.from_status !== 'string' ||
              !['CREAR','CANCELAR','APROBAR','RECHAZAR','EXPIRAR','INDETERMINAR','FINALIZAR','REVISION'].includes(String(entry.action)) ||
              !['ESPERANDO_PAGO','CANCELADA','EXPIRADA','APROBADA_DEMO','RECHAZADA','INDETERMINADA',
                'REQUIERE_REVISION','FINALIZADA'].includes(String(entry.to_status)) ||
              typeof entry.created_at !== 'string' || !Number.isFinite(Date.parse(entry.created_at)))
            throw new ApiTransportError('invalid-response', false)
          return entry as QrPaymentEvent
        })
      })
    },
    simulate(intentId: string, action: QrSimAction, eventKey: string): Promise<QrIntent> {
      if (!UUID_PATTERN.test(intentId) || !UUID_V4_PATTERN.test(eventKey) ||
          !['APROBAR','RECHAZAR','EXPIRAR','INDETERMINAR'].includes(action))
        throw new TypeError('Acción de laboratorio inválida')
      return api.request<unknown>(path + '/' + intentId + '/simulate', {
        method: 'POST', body: { action }, idempotencyKey: eventKey,
      }).then(raw => parseQrIntent(raw, businessId))
    },
    async decideExhibition(intentId: string, action: 'COBRAR' | 'RECHAZAR',
      eventKey: string): Promise<{ intent: QrIntent; sale: SaleReceipt | null; replayed: boolean }> {
      if (!UUID_PATTERN.test(intentId) || !UUID_V4_PATTERN.test(eventKey) ||
          !['COBRAR', 'RECHAZAR'].includes(action))
        throw new TypeError('Simulación de exhibición inválida')
      const raw = await api.request<unknown>(path + '/' + intentId + '/exhibition-simulation', {
        method: 'POST', body: { action }, idempotencyKey: eventKey,
      })
      if (!isObject(raw) || typeof raw.replayed !== 'boolean')
        throw new ApiTransportError('invalid-response', true)
      const intent = parseQrIntent(raw.intent, businessId)
      const sale = raw.sale === null ? null : parseSaleReceipt(raw.sale, businessId)
      if (intent.id !== intentId || (action === 'COBRAR'
        ? intent.status !== 'FINALIZADA' || !sale || intent.sale_id !== sale.id ||
          intent.total_cents !== sale.total_cents ||
          sale.payments.length !== 1 || sale.payments[0].method !== 'MERCADO_PAGO_DEMO_QA'
        : intent.status !== 'RECHAZADA' || sale !== null || intent.sale_id != null))
        throw new ApiTransportError('invalid-response', true)
      return { intent, sale, replayed: raw.replayed }
    },
    async finalize(intentId: string): Promise<QrFinalized> {
      if (!UUID_PATTERN.test(intentId)) throw new TypeError('Intento inválido')
      // El servidor usa el ID del QR como identidad idempotente: no generar una venta nueva al reintentar.
      const raw = await api.request<unknown>(path + '/' + intentId + '/finalize-demo', {
        method: 'POST',
      })
      try {
        if (!isObject(raw) || typeof raw.replayed !== 'boolean') throw Error('Respuesta de cierre inválida')
        const intent = parseQrIntent(raw.intent, businessId)
        const sale = parseSaleReceipt(raw.sale, businessId)
        if (intent.id !== intentId || intent.status !== 'FINALIZADA' ||
            intent.sale_id !== sale.id || intent.total_cents !== sale.total_cents ||
            intent.subtotal_cents !== sale.subtotal_cents ||
            intent.discount_cents !== sale.discount_cents ||
            sale.payments.length !== 1 ||
            sale.payments[0].method !== 'MERCADO_PAGO_DEMO_QA' ||
            sale.payments[0].reference !== intent.reference ||
            sale.payments[0].amount_cents !== intent.total_cents ||
            sale.location_id !== intent.location_id || sale.notes !== intent.notes ||
            sale.lines.length !== intent.lines.length ||
            sale.lines.some((l,i) => l.catalog_item_id !== intent.lines[i].catalog_item_id ||
              l.description_snapshot !== intent.lines[i].description_snapshot ||
              l.quantity_milli !== intent.lines[i].quantity_milli ||
              l.unit_price_cents !== intent.lines[i].unit_price_cents ||
              l.line_total_cents !== intent.lines[i].line_total_cents))
          throw Error('Comprobante distinto del QR original')
        return { intent, sale, replayed: raw.replayed }
      } catch { throw new ApiTransportError('invalid-response', true) }
    },
    receipt(intentId: string, signal?: AbortSignal): Promise<SaleReceipt> {
      if (!UUID_PATTERN.test(intentId)) throw new TypeError('Intento inválido')
      return api.request<unknown>(path + '/' + intentId + '/receipt', {signal})
        .then(raw => {
          const sale = parseSaleReceipt(raw, businessId)
          if (sale.payments.length !== 1 ||
              sale.payments[0].method !== 'MERCADO_PAGO_DEMO_QA')
            throw new ApiTransportError('invalid-response', false)
          return sale
        })
    },
    cancel(intentId: string): Promise<QrIntent> {
      if (!UUID_PATTERN.test(intentId)) throw new TypeError('Intento inválido')
      return api.request<unknown>(path + '/' + intentId + '/cancel', { method: 'POST' })
        .then(raw => parseQrIntent(raw, businessId))
    },
  }
}

export function qrIntentError(error: unknown): string {
  if (error instanceof ApiHttpError) {
    if (error.status === 401) return 'La sesión venció. Iniciá sesión nuevamente.'
    if (error.status === 403) return 'No tenés permiso para cobrar en la sede o cambiar precios.'
    if (error.status === 404) return 'El QR no está disponible para tu empresa o usuario.'
    if (error.status === 409) return 'No se pudo generar el QR: vinculá una cuenta DEMO, revisá el stock y la vigencia del intento.'
    if (error.status === 422) return 'El backend rechazó los datos del carrito. Revisá artículos y cantidades.'
  }
  if (error instanceof ApiTransportError) return 'No se pudo confirmar la respuesta de la API (' +
    error.reason + '). Recuperá el intento original sin generar una clave nueva.'
  return error instanceof Error ? error.message : 'No se pudo completar la operación QR.'
}
