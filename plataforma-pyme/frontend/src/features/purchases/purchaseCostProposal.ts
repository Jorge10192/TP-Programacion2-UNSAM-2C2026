import { centsToPesos, pesosToCents } from '../catalog/realCatalogGateway.ts'
import type { CatalogItem } from '../catalog/realCatalogGateway.ts'
import { MAX_CENTS } from '../catalog/realCatalogGateway.ts'
import { decimalToMilli, lineTotalCents, priceInputCents } from './realSupplyGateway.ts'

type CatalogCost = Pick<CatalogItem, 'reference_cost_cents' | 'price_cents'>

/**
 * A catalog reference cost is a proposal for a NEW purchase line only.
 * It is not a historical price, and it must never overwrite a saved purchase.
 */
export function suggestedUnitCost(item: CatalogCost | null | undefined): string {
  const reference = item?.reference_cost_cents
  return reference == null ? '' : centsToPesos(reference)
}

/** Informational only: the purchase is not blocked when its actual cost is higher. */
export function costExceedsSalePrice(unitCostInput: string, item: CatalogCost | null | undefined): boolean {
  const price = item?.price_cents
  if (price == null) return false
  try {
    const actual = pesosToCents(unitCostInput)
    return actual !== null && actual > price
  } catch {
    // The existing purchase validation will report an invalid amount separately.
    return false
  }
}

/** Preview the exact persisted HALF_UP subtotal, or no value while an input is invalid. */
export function previewLineTotalCents(quantityInput: string, unitCostInput: string): number | null {
  try {
    return lineTotalCents(decimalToMilli(quantityInput), priceInputCents(unitCostInput))
  } catch {
    return null
  }
}

/** Sum persisted subtotals, not floats, and respect the backend's maximum amount. */
export function previewPurchaseTotalCents(lines: ReadonlyArray<{ quantity: string; unitCost: string }>): number | null {
  if (!lines.length) return null
  let total = 0
  for (const line of lines) {
    const subtotal = previewLineTotalCents(line.quantity, line.unitCost)
    if (subtotal === null) return null
    total += subtotal
    if (total > MAX_CENTS) return null
  }
  return total
}

/**
 * Reverse edit of a line total, without silently losing cents.
 * There is no total override in FastAPI: only integer quantity_milli and
 * unit_cost_cents are persisted. Reject totals not exactly representable.
 */
export function unitCostFromExactLineTotal(quantityInput: string, totalInput: string): string {
  const quantity = decimalToMilli(quantityInput)
  const total = priceInputCents(totalInput)
  // Round to the nearest unit cent with exact BigInt arithmetic.
  const unit = (BigInt(total) * 1000n + BigInt(quantity) / 2n) / BigInt(quantity)
  if (unit > BigInt(MAX_CENTS)) {
    throw new RangeError('El costo unitario calculado supera el máximo permitido.')
  }
  const unitCents = Number(unit)
  if (lineTotalCents(quantity, unitCents) !== total) {
    throw new RangeError('Este total no puede representarse exactamente con un costo unitario en centavos para esa cantidad. Cambiá el total o utilizá otro concepto de ajuste en una etapa posterior.')
  }
  return centsToPesos(unitCents)
}
