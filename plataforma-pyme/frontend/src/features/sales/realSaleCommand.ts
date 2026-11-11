/**
 * E2-7 T10-A — validation/preview only. NO NETWORK REQUESTS.
 *
 * Mirrors FastAPI's CreateSaleRequest monetary invariants. This module is not
 * authorization and does not approve P01 (price/discount permissions by role).
 * Keep normalized immutable commands for the future durable T10-B journal.
 */
import { UUID_PATTERN } from '../businesses/businessGateway.ts'
import { MAX_CENTS } from '../catalog/realCatalogGateway.ts'

export const SALE_PAYMENT_METHODS = [
  'EFECTIVO', 'TRANSFERENCIA', 'CUENTA_DNI', 'TARJETA', 'MERCADO_PAGO_DECLARADO',
] as const

export type SalePaymentMethod = typeof SALE_PAYMENT_METHODS[number]
export type SaleCommandLine = {
  catalog_item_id: string
  quantity_milli: number
  unit_price_cents: number
}
export type SaleCommandPayment = {
  method: SalePaymentMethod
  amount_cents: number
  reference: string
}
export type SaleCommand = {
  location_id: string | null
  discount_cents: number
  notes: string
  lines: SaleCommandLine[]
  payments: SaleCommandPayment[]
}
export type SaleTotals = {
  line_totals_cents: number[]
  subtotal_cents: number
  discount_cents: number
  total_cents: number
}

const PAYMENT_METHODS: ReadonlySet<string> = new Set(SALE_PAYMENT_METHODS)
const MAX_MILLI = 999_999_999
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const keysAre = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).sort().join('|') === [...keys].sort().join('|')

const cents = (value: unknown, min = 0): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) &&
  value >= min && value <= MAX_CENTS
const milli = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) &&
  value >= 1 && value <= MAX_MILLI

function normalizedText(value: unknown, max: number, field: string): string {
  if (typeof value !== 'string') throw new RangeError(field + ': texto inválido')
  // The backend uses NFKC + collapsing Unicode whitespace before validation.
  const normalized = value.normalize('NFKC').trim().replace(/\s+/gu, ' ')
  if (normalized.length > max || /\p{C}/u.test(normalized))
    throw new RangeError(field + ': excede el máximo o contiene caracteres de control')
  return normalized
}

export function calculateSaleTotals(lines: readonly SaleCommandLine[],
                                    discount_cents: number): SaleTotals {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 30)
    throw new RangeError('La venta necesita entre 1 y 30 renglones.')
  if (!cents(discount_cents)) throw new RangeError('Descuento inválido.')
  const line_totals_cents: number[] = []
  let subtotal = 0n
  for (const line of lines) {
    if (!isRecord(line) ||
      !keysAre(line, ['catalog_item_id', 'quantity_milli', 'unit_price_cents']) ||
      typeof line.catalog_item_id !== 'string' || !UUID_PATTERN.test(line.catalog_item_id) ||
      !milli(line.quantity_milli) || !cents(line.unit_price_cents))
      throw new RangeError('Renglón de venta inválido.')
    // Same HALF_UP per line as purchases.schemas.line_total_cents in FastAPI.
    const amount = (BigInt(line.quantity_milli) * BigInt(line.unit_price_cents) + 500n) / 1000n
    if (amount > BigInt(MAX_CENTS)) throw new RangeError('Total de renglón excedido.')
    line_totals_cents.push(Number(amount))
    subtotal += amount
  }
  if (subtotal < 1n || subtotal > BigInt(MAX_CENTS))
    throw new RangeError('Subtotal fuera del rango permitido.')
  const total = subtotal - BigInt(discount_cents)
  if (total < 1n || total > BigInt(MAX_CENTS))
    throw new RangeError('El total de la venta debe ser positivo.')
  return {
    line_totals_cents,
    subtotal_cents: Number(subtotal),
    discount_cents,
    total_cents: Number(total),
  }
}

/** Returns a freshly normalized command; does not mutate the original draft. */
export function validateSaleCommand(raw: unknown): { body: SaleCommand; totals: SaleTotals } {
  if (!isRecord(raw) ||
    !keysAre(raw, ['location_id', 'discount_cents', 'notes', 'lines', 'payments']))
    throw new RangeError('Campos de venta no permitidos.')
  if (!(raw.location_id === null ||
    (typeof raw.location_id === 'string' && UUID_PATTERN.test(raw.location_id))))
    throw new RangeError('Sede inválida.')
  const notes = normalizedText(raw.notes, 500, 'Notas')
  const lines = raw.lines
  if (!Array.isArray(lines)) throw new RangeError('Renglones inválidos.')
  const totals = calculateSaleTotals(lines, raw.discount_cents as number)

  if (!Array.isArray(raw.payments) || raw.payments.length < 1 || raw.payments.length > 6)
    throw new RangeError('Se requieren entre 1 y 6 pagos declarados.')
  const payments: SaleCommandPayment[] = []
  let paid = 0n
  for (const payment of raw.payments) {
    if (!isRecord(payment) ||
      !keysAre(payment, ['method', 'amount_cents', 'reference']) ||
      typeof payment.method !== 'string' || !PAYMENT_METHODS.has(payment.method) ||
      !cents(payment.amount_cents, 1))
      throw new RangeError('Pago declarado inválido.')
    const reference = normalizedText(payment.reference, 120, 'Referencia')
    paid += BigInt(payment.amount_cents)
    payments.push({
      method: payment.method as SalePaymentMethod,
      amount_cents: payment.amount_cents,
      reference,
    })
  }
  if (paid !== BigInt(totals.total_cents))
    throw new RangeError('Los pagos declarados deben sumar exactamente el total.')

  const body: SaleCommand = {
    location_id: raw.location_id as string | null,
    discount_cents: totals.discount_cents,
    notes,
    lines: lines.map((line: SaleCommandLine) => ({
      catalog_item_id: line.catalog_item_id,
      quantity_milli: line.quantity_milli,
      unit_price_cents: line.unit_price_cents,
    })),
    payments,
  }
  return { body, totals }
}
