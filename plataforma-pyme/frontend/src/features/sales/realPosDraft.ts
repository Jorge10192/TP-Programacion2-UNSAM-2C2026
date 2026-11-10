/**
 * T10-C: pure POS cart and quantity rules; NO POST and no payments.
 * The final price permission is enforced by FastAPI (T10-P01), not these UI hints.
 */
import type { CatalogItem, CatalogUnit } from '../catalog/realCatalogGateway.ts'
import type { LocationRecord } from '../businesses/realOperationsGateway.ts'
import type { SaleCommandLine, SaleTotals } from './realSaleCommand.ts'
import { calculateSaleTotals } from './realSaleCommand.ts'

export type PosCartLine = SaleCommandLine

/** Subtotal por artículo, usando HALF_UP en centavos sin errores de floats. */
export function posLineTotalCents(quantityMilli: number, unitPriceCents: number): number {
  if (!Number.isSafeInteger(quantityMilli) || quantityMilli < 1 || quantityMilli > 999_999_999 ||
      !Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0 || unitPriceCents > 99_999_999_999)
    throw new RangeError('Cantidad o precio unitario inválidos.')
  const cents = (BigInt(quantityMilli) * BigInt(unitPriceCents) + 500n) / 1000n
  if (cents > 99_999_999_999n) throw new RangeError('Subtotal del producto fuera de rango.')
  return Number(cents)
}
const DISCRETE = new Set<CatalogUnit>(['UNIDAD', 'PAQUETE', 'CAJA', 'SERVICIO'])
export const canOverrideSalesPrice = (role: string): boolean =>
  role === 'TITULAR_ADMINISTRATIVO' || role === 'ADMINISTRADOR'
export const canOperateSales = (role: string): boolean =>
  canOverrideSalesPrice(role) || role === 'TRABAJADOR' || role === 'ENCARGADO'

/** Decimal text in the article's own unit, maximum 3 fractional digits. */
export function parsePosQuantity(raw: string, unit: CatalogUnit): number {
  const text = raw.trim()
  if (!/^(?:0|[1-9]\d{0,5})(?:[.,]\d{1,3})?$/.test(text))
    throw new RangeError('Cantidad inválida: sin separadores de miles y hasta tres decimales.')
  const [whole, fraction = ''] = text.replace(',', '.').split('.')
  if (DISCRETE.has(unit) && fraction && Number(fraction) !== 0)
    throw new RangeError('Este artículo solo admite cantidades enteras.')
  const milli = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'))
  if (!Number.isSafeInteger(milli) || milli < 1 || milli > 999_999_999)
    throw new RangeError('Cantidad fuera del rango permitido.')
  return milli
}
export function posQuantityText(milli: number): string {
  if (!Number.isSafeInteger(milli) || milli < 1 || milli > 999_999_999)
    throw new RangeError('Cantidad en milésimas inválida.')
  const main = Math.floor(milli / 1000)
  const rest = String(milli % 1000).padStart(3, '0').replace(/0+$/, '')
  return rest ? main + ',' + rest : String(main)
}

export function previewPosCart(
  role: string,
  businessActive: boolean,
  location: LocationRecord | null,
  catalog: readonly CatalogItem[],
  cart: readonly PosCartLine[],
  discountCents: number,
): { lines: PosCartLine[]; totals: SaleTotals } {
  if (!businessActive || !canOperateSales(role))
    throw new RangeError('No hay autorización para preparar ventas en la empresa.')
  if (cart.length < 1 || cart.length > 30)
    throw new RangeError('El carrito requiere entre 1 y 30 renglones.')
  const manager = canOverrideSalesPrice(role)
  if (!location && !manager)
    throw new RangeError('Seleccioná la sede donde tenés asignación para vender.')
  if (location && (location.status !== 'ACTIVA' || !location.can_sell))
    throw new RangeError('La sede no está habilitada para vender.')

  const byId = new Map(catalog.map(row => [row.id, row]))
  const seen = new Set<string>()
  const result = cart.map(line => {
    const item = byId.get(line.catalog_item_id)
    if (!item || item.status !== 'ACTIVO' || !item.sellable)
      throw new RangeError('Hay artículos sin disponibilidad comercial en este carrito.')
    if (seen.has(item.id)) throw new RangeError('No dupliques renglones del mismo artículo.')
    seen.add(item.id)
    if (DISCRETE.has(item.unit) && line.quantity_milli % 1000 !== 0)
      throw new RangeError('Este artículo requiere unidades enteras.')
    if (item.item_type === 'BIEN' && (!location || !location.can_store))
      throw new RangeError('Los bienes físicos requieren una sede activa que gestione stock.')
    if (!manager) {
      if (item.price_cents === null)
        throw new RangeError('Un artículo sin precio requiere definición del titular o administrador.')
      if (line.unit_price_cents !== item.price_cents)
        throw new RangeError('Tu rol solo puede vender al precio del catálogo.')
    }
    return { ...line }
  })
  if (!manager && discountCents !== 0)
    throw new RangeError('Tu rol no puede aplicar descuentos.')
  return { lines: result, totals: calculateSaleTotals(result, discountCents) }
}
