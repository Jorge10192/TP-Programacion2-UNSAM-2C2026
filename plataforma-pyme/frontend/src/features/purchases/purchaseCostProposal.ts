import { centsToPesos, pesosToCents } from '../catalog/realCatalogGateway.ts'
import type { CatalogItem } from '../catalog/realCatalogGateway.ts'

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
