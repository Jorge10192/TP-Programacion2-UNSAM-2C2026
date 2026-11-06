/**
 * Inventario E1-B8. Cantidades en milésimas de la unidad de control del catálogo.
 * Reglas puras: NO almacena saldos paralelos, NO convierte cajas/paquetes/kg.
 */
import type { CatalogUnit } from './catalogPolicy.ts'
import { isDiscreteUnit, parseQuantityMilli } from './purchasePolicy.ts'

export type InventoryMovementType =
  | 'RECEPCION_COMPRA' | 'TRASLADO_SALIDA' | 'TRASLADO_ENTRADA' | 'AJUSTE_CONTEO'

export type InventoryMovement = {
  id: string
  operationId: string
  businessId: string
  catalogItemId: string
  itemNameSnapshot: string
  unit: CatalogUnit
  locationId: string
  deltaMilli: number
  type: InventoryMovementType
  createdAt: string
  reason: string
  reference: string
}

/** Una transferencia es una sola operación con DOS movimientos firmados. */
export type InventoryOperation =
  | {
    kind: 'TRANSFER'
    id: string
    requestId: string
    businessId: string
    catalogItemId: string
    itemNameSnapshot: string
    unit: CatalogUnit
    sourceLocationId: string
    destinationLocationId: string
    quantityMilli: number
    reason: string
    createdAt: string
  }
  | {
    kind: 'COUNT'
    id: string
    requestId: string
    businessId: string
    catalogItemId: string
    itemNameSnapshot: string
    unit: CatalogUnit
    locationId: string
    countedMilli: number
    deltaMilli: number
    reason: string
    createdAt: string
  }

export const inventoryMovementLabels: Record<InventoryMovementType, string> = {
  RECEPCION_COMPRA: 'Recepción de compra',
  TRASLADO_SALIDA: 'Traslado · salida',
  TRASLADO_ENTRADA: 'Traslado · entrada',
  AJUSTE_CONTEO: 'Ajuste por conteo',
}

export function stockKey(locationId: string, catalogItemId: string): string {
  return JSON.stringify([locationId, catalogItemId])
}

export function parseCountedMilli(text: string, unit: CatalogUnit): number {
  if (text.trim() === '0') return 0
  return parseQuantityMilli(text, unit)
}

export function validateStockMilli(value: number, unit: CatalogUnit, canBeZero: boolean): void {
  if (!Number.isSafeInteger(value) || value < 0 || value >= 1_000_000_000 ||
      (!canBeZero && value === 0) ||
      isDiscreteUnit(unit) && value % 1000 !== 0) {
    throw new Error('Cantidad fuera de rango o incompatible con la unidad de control.')
  }
}

/** Valida la salida antes de generar el par atómico de un traslado. */
export function requireTransferStock(available: number, requested: number, unit: CatalogUnit): void {
  validateStockMilli(requested, unit, false)
  if (!Number.isSafeInteger(available) || available < 0 || available < requested) {
    throw new Error('Stock insuficiente: no se permiten saldos negativos.')
  }
}

/** Un conteo fija la existencia observada y genera sólo la diferencia. */
export function countDifference(current: number, counted: number, unit: CatalogUnit): number {
  validateStockMilli(counted, unit, true)
  if (!Number.isSafeInteger(current) || current < 0) throw new Error('Saldo actual inválido.')
  const delta = counted - current
  if (delta === 0) throw new Error('El conteo coincide con el saldo actual. No hay ajuste que registrar.')
  return delta
}

export function normalizeStockReason(reason: string): string {
  if (typeof reason !== 'string') throw new Error('Indicá un motivo para este movimiento.')
  const text = reason.trim().replace(/\s+/g, ' ')
  if (text.length < 5 || text.length > 180 ||
      /[\u0000-\u001f\u007f]/.test(text)) {
    throw new Error('El motivo es obligatorio (entre 5 y 180 caracteres).')
  }
  return text
}

/** Proyección única por empresa, artículo y ubicación, sin copia de cantidades mutables. */
export function stockBalances(movements: InventoryMovement[]): Map<string, number> {
  const result = new Map<string, number>()
  for (const movement of movements) {
    if (!Number.isSafeInteger(movement.deltaMilli)) throw new Error('Movimiento de inventario no válido.')
    const key = stockKey(movement.locationId, movement.catalogItemId)
    const next = (result.get(key) ?? 0) + movement.deltaMilli
    if (!Number.isSafeInteger(next)) throw new Error('Saldo fuera del rango seguro.')
    result.set(key, next)
  }
  return result
}

export function stockBalance(
  movements: InventoryMovement[], locationId: string, catalogItemId: string,
): number {
  return stockBalances(movements).get(stockKey(locationId, catalogItemId)) ?? 0
}

export function inventoryOperationMovements(operation: InventoryOperation): InventoryMovement[] {
  const common = {
    operationId: operation.id, businessId: operation.businessId,
    catalogItemId: operation.catalogItemId, itemNameSnapshot: operation.itemNameSnapshot,
    unit: operation.unit, createdAt: operation.createdAt, reason: operation.reason,
    reference: operation.kind === 'TRANSFER' ? 'Traslado DEMO' : 'Conteo físico DEMO',
  }
  if (operation.kind === 'TRANSFER') return [
    { ...common, id: operation.id + ':out', locationId: operation.sourceLocationId,
      deltaMilli: -operation.quantityMilli, type: 'TRASLADO_SALIDA' },
    { ...common, id: operation.id + ':in', locationId: operation.destinationLocationId,
      deltaMilli: operation.quantityMilli, type: 'TRASLADO_ENTRADA' },
  ]
  return [{
    ...common, id: operation.id + ':count', locationId: operation.locationId,
    deltaMilli: operation.deltaMilli, type: 'AJUSTE_CONTEO',
  }]
}
