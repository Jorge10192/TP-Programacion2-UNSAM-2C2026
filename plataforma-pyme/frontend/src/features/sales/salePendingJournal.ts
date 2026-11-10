/**
 * T10-B: durable sale command identity before ANY future POS POST.
 * No Bearer token. No network. All commercial content stays browser-local and
 * UNENCRYPTED; avoid shared devices. Pending records are never removed by TTL.
 */
import { UUID_PATTERN, UUID_V4_PATTERN } from '../businesses/businessGateway.ts'
import { parseSaleReceipt } from './realSalesReadGateway.ts'
import type { SaleReceipt } from './realSalesReadGateway.ts'
import { validateSaleCommand } from './realSaleCommand.ts'
import type { SaleCommand } from './realSaleCommand.ts'

export type SalePending = {
  scope: string
  actorId: string
  businessId: string
  kind: 'sale.create'
  key: string
  body: SaleCommand
  createdAt: string
}

export type SalePendingPort = {
  read(scope: string): Promise<unknown>
  reserve(intent: SalePending): Promise<void>
  remove(scope: string, key: string): Promise<void>
}

export class SalePendingConflict extends Error {
  constructor() {
    super('Existe una venta pendiente incompatible. No se envió ninguna venta.')
  }
}
export class SalePendingUnavailable extends Error {
  constructor() {
    super('No fue posible verificar IndexedDB. No se envió ninguna venta.')
  }
}

const keys = (row: Record<string, unknown>, expected: string[]) =>
  Object.keys(row).sort().join('|') === [...expected].sort().join('|')

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export function salePendingScope(actorId: string, businessId: string): string {
  if (!UUID_PATTERN.test(actorId) || !UUID_PATTERN.test(businessId))
    throw new TypeError('Actor o empresa inválidos para guardar la venta.')
  return actorId + ':' + businessId + ':sale.create'
}

export function parseSalePending(value: unknown, scope: string): SalePending {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new SalePendingConflict()
  const row = value as Record<string, unknown>
  if (!keys(row, ['scope', 'actorId', 'businessId', 'kind', 'key', 'body', 'createdAt']) ||
    typeof row.actorId !== 'string' || typeof row.businessId !== 'string' ||
    typeof row.scope !== 'string' || typeof row.key !== 'string' ||
    row.kind !== 'sale.create' || !UUID_V4_PATTERN.test(row.key) ||
    row.scope !== scope || row.scope !== salePendingScope(row.actorId, row.businessId) ||
    typeof row.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(row.createdAt)) ||
    !(row.body && typeof row.body === 'object' && !Array.isArray(row.body)))
    throw new SalePendingConflict()
  try {
    const validated = validateSaleCommand(row.body)
    // Do not silently normalize a corrupted persisted body: it must be exactly
    // the bytes/JSON values reserved before the original HTTP request.
    if (!same(validated.body, row.body)) throw new SalePendingConflict()
    return structuredClone(row) as SalePending
  } catch {
    throw new SalePendingConflict()
  }
}

/** Called ONLY on deliberate user confirmation, never while rendering. */
export function newSalePending(
  actorId: string, businessId: string, rawBody: unknown,
  key: string = crypto.randomUUID(),
): SalePending {
  const scope = salePendingScope(actorId, businessId)
  if (!UUID_V4_PATTERN.test(key)) throw new TypeError('Idempotency-Key debe ser UUID4.')
  const { body } = validateSaleCommand(rawBody)
  return {
    scope, actorId, businessId, kind: 'sale.create', key,
    body, createdAt: new Date().toISOString(),
  }
}

/**
 * A confirmed receipt is allowed to close a pending command ONLY if it
 * describes the SAME actor, tenant, key, location, lines, prices, discount
 * and payments. Do not clear an uncertain request on HTTP 404/409/timeouts.
 */
export function receiptMatchesPending(row: SalePending, value: SaleReceipt): boolean {
  const command = parseSalePending(row, row.scope)
  let receipt: SaleReceipt
  try { receipt = parseSaleReceipt(value, command.businessId) }
  catch { return false }
  const { totals } = validateSaleCommand(command.body)
  if (receipt.request_id !== command.key ||
    receipt.business_id !== command.businessId ||
    receipt.created_by_id !== command.actorId ||
    receipt.location_id !== command.body.location_id ||
    receipt.subtotal_cents !== totals.subtotal_cents ||
    receipt.discount_cents !== totals.discount_cents ||
    receipt.total_cents !== totals.total_cents ||
    receipt.notes !== command.body.notes ||
    receipt.lines.length !== command.body.lines.length ||
    receipt.payments.length !== command.body.payments.length) return false

  const lines = [...receipt.lines].sort((a, b) => a.line_number - b.line_number)
  for (let i = 0; i < lines.length; i++) {
    const expected = command.body.lines[i], actual = lines[i]
    if (actual.line_number !== i + 1 ||
      actual.catalog_item_id !== expected.catalog_item_id ||
      actual.quantity_milli !== expected.quantity_milli ||
      actual.unit_price_cents !== expected.unit_price_cents ||
      actual.line_total_cents !== totals.line_totals_cents[i]) return false
  }
  const payments = [...receipt.payments].sort((a, b) => a.payment_number - b.payment_number)
  for (let i = 0; i < payments.length; i++) {
    const expected = command.body.payments[i], actual = payments[i]
    if (actual.payment_number !== i + 1 ||
      actual.method !== expected.method ||
      actual.amount_cents !== expected.amount_cents ||
      actual.reference !== expected.reference) return false
  }
  return true
}

export function createSalePendingJournal(port: SalePendingPort) {
  return {
    async load(scope: string): Promise<SalePending | null> {
      const stored = await port.read(scope)
      return stored == null ? null : parseSalePending(stored, scope)
    },
    /** Reserve AND read back the exact command before allowing a future POST. */
    async reserve(intent: SalePending): Promise<SalePending> {
      const checked = parseSalePending(intent, intent.scope)
      await port.reserve(checked)
      const confirmed = await port.read(checked.scope)
      const saved = parseSalePending(confirmed, checked.scope)
      if (!same(saved, checked)) throw new SalePendingConflict()
      return saved
    },
    /** No arbitrary discard: only a matching, confirmed SaleView can close. */
    async closeConfirmed(scope: string, key: string, receipt: SaleReceipt): Promise<void> {
      const stored = await port.read(scope)
      if (stored == null) throw new SalePendingConflict()
      const pending = parseSalePending(stored, scope)
      if (pending.key !== key || !receiptMatchesPending(pending, receipt))
        throw new SalePendingConflict()
      await port.remove(scope, key)
    },
  }
}

const DATABASE = 'asistente-pyme-real-sales-v1'
const STORE = 'pending'
const MAX_ROWS = 60

function open(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new SalePendingUnavailable())
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE, { keyPath: 'scope' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new SalePendingUnavailable())
    request.onblocked = () => reject(new SalePendingUnavailable())
  })
}
async function read(scope: string): Promise<unknown> {
  const db = await open()
  return new Promise((resolve, reject) => {
    let result: unknown
    const tx = db.transaction(STORE, 'readonly')
    tx.objectStore(STORE).get(scope).onsuccess = event => {
      result = (event.target as IDBRequest).result
    }
    tx.oncomplete = () => { db.close(); resolve(result) }
    tx.onerror = () => { db.close(); reject(new SalePendingUnavailable()) }
    tx.onabort = () => { db.close(); reject(new SalePendingUnavailable()) }
  })
}
async function reserve(intent: SalePending): Promise<void> {
  const db = await open()
  return new Promise((resolve, reject) => {
    let reason: Error = new SalePendingConflict()
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const get = store.get(intent.scope)
    get.onsuccess = () => {
      if (get.result !== undefined) {
        try {
          if (!same(parseSalePending(get.result, intent.scope), intent)) tx.abort()
        } catch { tx.abort() }
        return
      }
      const count = store.count()
      count.onsuccess = () => {
        if (count.result >= MAX_ROWS) {
          reason = new SalePendingUnavailable()
          tx.abort()
          return
        }
        store.add(intent)
      }
    }
    get.onerror = () => { reason = new SalePendingUnavailable(); tx.abort() }
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(reason) }
    tx.onabort = () => { db.close(); reject(reason) }
  })
}
async function remove(scope: string, key: string): Promise<void> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const get = store.get(scope)
    get.onsuccess = () => {
      try {
        if (get.result === undefined || parseSalePending(get.result, scope).key !== key) {
          tx.abort()
          return
        }
        store.delete(scope)
      } catch { tx.abort() }
    }
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(new SalePendingConflict()) }
    tx.onabort = () => { db.close(); reject(new SalePendingConflict()) }
  })
}

export const salePendingJournal = createSalePendingJournal({ read, reserve, remove })
/** Old records are flagged, NEVER automatically deleted. */
export function salePendingOld(row: SalePending): boolean {
  return Date.now() - Date.parse(row.createdAt) > 30 * 86_400_000
}
