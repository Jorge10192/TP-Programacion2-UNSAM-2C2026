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
export type InventoryCountLine = {
  catalogItemId: string
  itemNameSnapshot: string
  unit: CatalogUnit
  expectedMilli: number
  countedMilli: number
  deltaMilli: number
}

export type InventoryCountInput = Pick<InventoryCountLine, 'catalogItemId' | 'expectedMilli' | 'countedMilli'>

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
    kind: 'BATCH_COUNT'
    id: string
    requestId: string
    businessId: string
    locationId: string
    reason: string
    createdAt: string
    lines: InventoryCountLine[]
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

/**
 * El conteo confirma una foto del saldo vista durante la revisión. Si otra
 * operación cambió ese saldo, se cancela toda la sesión antes de escribir.
 */
export function checkedCountDifference(
  expectedMilli: number, currentMilli: number, countedMilli: number, unit: CatalogUnit,
): number {
  validateStockMilli(expectedMilli, unit, true)
  validateStockMilli(currentMilli, unit, true)
  validateStockMilli(countedMilli, unit, true)
  if (currentMilli !== expectedMilli) {
    throw new Error('El stock cambió mientras contabas. Volvé a revisar los saldos antes de confirmar.')
  }
  return countedMilli - currentMilli
}

export function normalizeStockReason(reason: string): string {
  if (typeof reason !== 'string') throw new Error('Indicá un motivo para este movimiento.')
  if ([...reason].some((char) => { const code = char.charCodeAt(0); return code <= 31 || code === 127 })) {
    throw new Error('El motivo no admite caracteres de control.')
  }
  const text = reason.trim().replace(/\s+/g, ' ')
  if (text.length < 5 || text.length > 180) {
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
  if (operation.kind === 'BATCH_COUNT') return operation.lines
    .filter((line) => line.deltaMilli !== 0)
    .map((line) => ({
      id: operation.id + ':batch:' + line.catalogItemId,
      operationId: operation.id, businessId: operation.businessId,
      catalogItemId: line.catalogItemId, itemNameSnapshot: line.itemNameSnapshot,
      unit: line.unit, locationId: operation.locationId, deltaMilli: line.deltaMilli,
      type: 'AJUSTE_CONTEO' as const, createdAt: operation.createdAt,
      reason: operation.reason, reference: 'Control de stock DEMO',
    }))
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

/**
 * Vista del historial: un traslado se presenta como una única acción,
 * pero el ledger mantiene sus dos movimientos (salida y entrada).
 * Si falta una de las piernas o la pareja es inconsistente, se muestran
 * los movimientos originales para no ocultar evidencia.
 */
export type InventoryHistoryEntry =
  | {
      kind: 'BATCH_COUNT'; id: string; createdAt: string; businessId: string
      locationId: string; reason: string; lines: InventoryCountLine[]
    }
  | { kind: 'MOVEMENT'; id: string; createdAt: string; movement: InventoryMovement }
  | {
      kind: 'TRANSFER'; id: string; createdAt: string; businessId: string
      catalogItemId: string; itemNameSnapshot: string; unit: CatalogUnit
      sourceLocationId: string; destinationLocationId: string
      quantityMilli: number; reason: string; reference: string
    }

export function inventoryHistoryEntries(
  movements: InventoryMovement[], operations: InventoryOperation[] = [],
): InventoryHistoryEntry[] {
  const audits = operations.filter((operation) => operation.kind === 'BATCH_COUNT')
  const auditIds = new Set(audits.map((operation) => operation.id))
  const entries: InventoryHistoryEntry[] = audits.map((operation) => ({
    kind: 'BATCH_COUNT' as const, id: operation.id, createdAt: operation.createdAt,
    businessId: operation.businessId, locationId: operation.locationId,
    reason: operation.reason, lines: operation.lines,
  }))
  const transfers = new Map<string, InventoryMovement[]>()

  for (const movement of movements) {
    if (auditIds.has(movement.operationId)) continue
    if (movement.type === 'TRASLADO_SALIDA' || movement.type === 'TRASLADO_ENTRADA') {
      const bucket = transfers.get(movement.operationId) ?? []
      bucket.push(movement)
      transfers.set(movement.operationId, bucket)
    } else {
      entries.push({ kind: 'MOVEMENT', id: movement.id, createdAt: movement.createdAt, movement })
    }
  }

  for (const [operationId, pair] of transfers) {
    const outbound = pair.find((event) => event.type === 'TRASLADO_SALIDA')
    const inbound = pair.find((event) => event.type === 'TRASLADO_ENTRADA')
    const consistent = pair.length === 2 && outbound !== undefined && inbound !== undefined &&
      outbound.businessId === inbound.businessId &&
      outbound.catalogItemId === inbound.catalogItemId &&
      outbound.unit === inbound.unit &&
      outbound.itemNameSnapshot === inbound.itemNameSnapshot &&
      outbound.createdAt === inbound.createdAt &&
      outbound.reason === inbound.reason &&
      outbound.reference === inbound.reference &&
      outbound.locationId !== inbound.locationId &&
      Number.isSafeInteger(outbound.deltaMilli) &&
      outbound.deltaMilli < 0 && inbound.deltaMilli === -outbound.deltaMilli

    if (consistent && outbound && inbound) {
      entries.push({
        kind: 'TRANSFER', id: operationId, createdAt: outbound.createdAt,
        businessId: outbound.businessId, catalogItemId: outbound.catalogItemId,
        itemNameSnapshot: outbound.itemNameSnapshot, unit: outbound.unit,
        sourceLocationId: outbound.locationId, destinationLocationId: inbound.locationId,
        quantityMilli: inbound.deltaMilli, reason: outbound.reason, reference: outbound.reference,
      })
    } else {
      for (const movement of pair) {
        entries.push({ kind: 'MOVEMENT', id: movement.id, createdAt: movement.createdAt, movement })
      }
    }
  }

  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
}
