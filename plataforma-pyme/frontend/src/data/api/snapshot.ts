import { emptySnapshot } from '../models.ts'
import type { Snapshot } from '../models.ts'
import type { SessionUser } from './session.ts'
import { GatewayError } from './httpClient.ts'

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new GatewayError('server', 'Respuesta de datos inválida.')
  return value as Record<string, unknown>
}

/** Se acepta únicamente un snapshot completo de esta cuenta, nunca fixtures DEMO. */
export function mapSnapshot(value: unknown, user: SessionUser): Snapshot {
  const root = object(value)
  if (root.schema_version !== 2 || root.complete !== true) throw new GatewayError('server', 'La lectura del servidor está incompleta o usa otro contrato.')
  const data = object(root.snapshot)
  if (data.mode !== 'api' || data.version !== 1 || object(data.profile).id !== user.id) throw new GatewayError('forbidden', 'La lectura no corresponde a la cuenta activa.')
  const businesses = object(data.businessesById)
  const memberships = object(data.membershipsByBusinessId)
  for (const [id, raw] of Object.entries(businesses)) {
    const member = object(memberships[id])
    if (object(raw).id !== id || member.businessId !== id || member.userId !== user.id || member.status !== 'ACTIVA') throw new GatewayError('forbidden', 'Membresía de empresa inválida.')
  }
  for (const field of ['locationsById','catalogItemsById','suppliersById','purchasesById',
    'inventoryOperationsById','salesById','expensesById','cashSessionsById','financialAccountsById']) {
    for (const [id, raw] of Object.entries(object(data[field]))) {
      const record = object(raw)
      if (record.id !== id || typeof record.businessId !== 'string' || !businesses[record.businessId]) throw new GatewayError('forbidden', 'Se descartó un recurso de otra empresa.')
    }
  }
  if (!Array.isArray(data.apiInventoryMovements)) throw new GatewayError('server', 'Falta el historial de inventario.')
  for (const raw of data.apiInventoryMovements) {
    const movement = object(raw)
    if (typeof movement.businessId !== 'string' || !businesses[movement.businessId]) throw new GatewayError('forbidden', 'Se descartó un movimiento ajeno.')
  }
  for (const [key, value] of Object.entries(object(data.apiStockBalances))) {
    let pair: unknown
    try { pair = JSON.parse(key) } catch { throw new GatewayError('server', 'Clave de existencia inválida.') }
    if (!Array.isArray(pair) || pair.length !== 2) throw new GatewayError('server', 'Clave de existencia inválida.')
    const location = object(object(data.locationsById)[pair[0]])
    const item = object(object(data.catalogItemsById)[pair[1]])
    if (location.businessId !== item.businessId || typeof value !== 'number' || value < 0) throw new GatewayError('forbidden', 'Existencia inconsistente entre empresas.')
  }
  function validNumbers(value: unknown): void {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new GatewayError('server', 'El servidor devolvió un importe o una cantidad imprecisa.')
    if (Array.isArray(value)) value.forEach(validNumbers)
    else if (value && typeof value === 'object') Object.values(value).forEach(validNumbers)
  }
  validNumbers(data)
  return { ...emptySnapshot, ...data } as Snapshot
}
