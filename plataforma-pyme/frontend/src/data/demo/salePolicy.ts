/**
 * E1-C1: Ventas DEMO. Importe en centavos ARS, cantidad en milésimas
 * de la unidad del Catálogo. Pago DECLARADO no significa cobro verificado.
 */
import type { CatalogUnit } from './catalogPolicy.ts'
import type { InventoryMovement } from './inventoryPolicy.ts'
import { isDiscreteUnit, lineTotalCents } from './purchasePolicy.ts'

export type SalePaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'CUENTA_DNI' | 'TARJETA' | 'MERCADO_PAGO_DECLARADO'

export const salePaymentLabels: Record<SalePaymentMethod, string> = {
  EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', CUENTA_DNI: 'Cuenta DNI',
  TARJETA: 'Tarjeta (declarado)', MERCADO_PAGO_DECLARADO: 'Mercado Pago (declarado, no verificado)',
}

export type SaleLineInput = {
  catalogItemId: string
  quantityMilli: number
  unitPriceCents: number
}

export type SalePayment = { method: SalePaymentMethod; amountCents: number }

export type SaleInput = {
  locationId: string | null
  lines: SaleLineInput[]
  discountCents: number
  payments: SalePayment[]
  notes: string
}

export type SaleLineSnapshot = SaleLineInput & {
  id: string; name: string; sku: string; unit: CatalogUnit
  kind: 'BIEN' | 'SERVICIO'; lineTotalCents: number
}

/**
 * Una venta produce una salida por renglón físico. No hay stock mutable
 * paralelo ni una segunda operación que pueda descontar las mismas unidades.
 */
export function saleInventoryMovements(sale: {
  id: string; businessId: string; locationId: string | null
  createdAt: string; lines: SaleLineSnapshot[]
}): InventoryMovement[] {
  if (sale.locationId === null) return []
  return sale.lines.filter((line) => line.kind === 'BIEN').map((line) => ({
    id: 'demo-sale-stock-' + line.id, operationId: sale.id,
    businessId: sale.businessId, catalogItemId: line.catalogItemId,
    itemNameSnapshot: line.name, unit: line.unit, locationId: sale.locationId!,
    deltaMilli: -line.quantityMilli, type: 'VENTA_SALIDA' as const,
    createdAt: sale.createdAt, reason: 'Venta registrada DEMO', reference: sale.id,
  }))
}

const MAX_SALE_CENTS = 99_999_999_999

export function validSaleQuantity(value: number, unit: CatalogUnit): void {
  if (!Number.isSafeInteger(value) || value <= 0 || value >= 1_000_000_000 ||
      (isDiscreteUnit(unit) && value % 1000 !== 0)) {
    throw new Error('Cantidad inválida para la unidad seleccionada.')
  }
}

export function saleAmounts(lines: { quantityMilli: number; unitPriceCents: number }[], discountCents: number) {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 30) {
    throw new Error('Agregá entre 1 y 30 renglones a la venta.')
  }
  let subtotal = 0n
  for (const line of lines) {
    if (!line || !Number.isSafeInteger(line.unitPriceCents) || line.unitPriceCents < 0) {
      throw new Error('Ingresá un precio unitario válido para cada artículo.')
    }
    subtotal += BigInt(lineTotalCents(line.quantityMilli, line.unitPriceCents))
    if (subtotal > BigInt(MAX_SALE_CENTS)) throw new Error('El total supera el límite de la DEMO.')
  }
  if (subtotal === 0n) throw new Error('La venta debe tener un total mayor a cero.')
  if (!Number.isSafeInteger(discountCents) || discountCents < 0 ||
      BigInt(discountCents) >= subtotal) {
    throw new Error('El descuento debe ser menor que el subtotal de la venta.')
  }
  const total = subtotal - BigInt(discountCents)
  if (total <= 0n) throw new Error('La venta debe tener un total mayor a cero.')
  return { subtotalCents: Number(subtotal), discountCents, totalCents: Number(total) }
}

export function validateSalePayments(payments: SalePayment[], totalCents: number): void {
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0 || totalCents > MAX_SALE_CENTS) {
    throw new Error('Total de venta inválido.')
  }
  if (!Array.isArray(payments) || payments.length < 1 || payments.length > 6) {
    throw new Error('Indicá entre 1 y 6 medios de pago.')
  }
  let paid = 0n
  for (const payment of payments) {
    if (!payment || !Object.hasOwn(salePaymentLabels, payment.method) ||
        !Number.isSafeInteger(payment.amountCents) || payment.amountCents <= 0 ||
        payment.amountCents > MAX_SALE_CENTS) {
      throw new Error('Medio de pago o importe declarado inválido.')
    }
    paid += BigInt(payment.amountCents)
  }
  if (paid !== BigInt(totalCents)) {
    throw new Error('Los pagos declarados deben sumar exactamente el total de la venta.')
  }
}

export function normalizeSaleInput(input: SaleInput): SaleInput {
  if (!input || (input.locationId !== null &&
      (typeof input.locationId !== 'string' || !/^demo-location-[a-f0-9-]{36}$/.test(input.locationId)))) {
    throw new Error('Ubicación de venta inválida.')
  }
  if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 30) {
    throw new Error('Una venta requiere entre 1 y 30 artículos.')
  }
  const lines = input.lines.map((line) => {
    if (!line || typeof line.catalogItemId !== 'string' ||
        !/^demo-catalog-[a-f0-9-]{36}$/.test(line.catalogItemId) ||
        !Number.isSafeInteger(line.quantityMilli) ||
        line.quantityMilli <= 0 || line.quantityMilli >= 1_000_000_000) {
      throw new Error('Artículo o cantidad inválida en el carrito.')
    }
    lineTotalCents(line.quantityMilli, line.unitPriceCents)
    return { catalogItemId: line.catalogItemId, quantityMilli: line.quantityMilli,
      unitPriceCents: line.unitPriceCents }
  })
  const totals = saleAmounts(lines, input.discountCents)
  validateSalePayments(input.payments, totals.totalCents)
  if (typeof input.notes !== 'string' || input.notes.trim().length > 500 ||
      [...input.notes].some((char) => {
        const code = char.charCodeAt(0)
        return code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127
      })) throw new Error('Las observaciones admiten hasta 500 caracteres sin controles.')
  return { locationId: input.locationId, lines, discountCents: totals.discountCents,
    payments: input.payments.map(({ method, amountCents }) => ({ method, amountCents })),
    notes: input.notes.trim() }
}
