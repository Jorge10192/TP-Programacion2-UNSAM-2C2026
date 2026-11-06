import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseCountedMilli, requireTransferStock, countDifference, stockBalances,
  stockBalance, stockKey, inventoryOperationMovements, inventoryHistoryEntries, normalizeStockReason,
} from '../src/data/demo/inventoryPolicy.ts'
import { parseQuantityMilli } from '../src/data/demo/purchasePolicy.ts'

const id = 'demo-inventory-op-11111111-1111-4111-8111-111111111111'
const common = {
  id, requestId: 'demo-inventory-request-11111111-1111-4111-8111-111111111111',
  businessId: 'walos-demo', catalogItemId: 'catalog-1', itemNameSnapshot: 'Artículo de prueba',
  unit: 'UNIDAD', reason: 'Reposición de sucursal', createdAt: '2026-11-06T16:00:00.000Z',
}
const receipt = {
  id: 'demo-stock-1', operationId: 'demo-receipt-1', businessId: 'walos-demo',
  catalogItemId: 'catalog-1', itemNameSnapshot: 'Artículo de prueba', unit: 'UNIDAD',
  locationId: 'dep-1', deltaMilli: 10000, type: 'RECEPCION_COMPRA',
  createdAt: '2026-11-06T15:00:00.000Z', reason: 'Recepción confirmada', reference: 'FACT-1',
}

test('no se suman saldos de otra ubicación o artículo', () => {
  const movements = [
    receipt,
    { ...receipt, id: 'demo-stock-2', locationId: 'local-1', deltaMilli: 2000 },
    { ...receipt, id: 'demo-stock-3', catalogItemId: 'catalog-2', deltaMilli: 5000 },
  ]
  const balances = stockBalances(movements)
  assert.equal(balances.get(stockKey('dep-1', 'catalog-1')), 10000)
  assert.equal(stockBalance(movements, 'local-1', 'catalog-1'), 2000)
  assert.equal(stockBalance(movements, 'dep-1', 'catalog-2'), 5000)
})

test('traslado genera salida y entrada de igual cantidad y conserva total', () => {
  const operation = {
    ...common, kind: 'TRANSFER', sourceLocationId: 'dep-1',
    destinationLocationId: 'local-1', quantityMilli: 3000,
  }
  const events = inventoryOperationMovements(operation)
  assert.equal(events.length, 2)
  assert.equal(events[0].deltaMilli, -3000)
  assert.equal(events[1].deltaMilli, 3000)
  assert.equal(events[0].operationId, events[1].operationId)
  const before = stockBalance([receipt], 'dep-1', 'catalog-1')
  const after = stockBalance([receipt, ...events], 'dep-1', 'catalog-1')
  assert.equal(before, 10000)
  assert.equal(after, 7000)
  assert.equal(stockBalance([...events], 'local-1', 'catalog-1'), 3000)
  assert.equal(events.reduce((total, event) => total + event.deltaMilli, 0), 0)
})

test('la salida rechaza existencia insuficiente y fracciones de cajas', () => {
  assert.doesNotThrow(() => requireTransferStock(5000, 5000, 'UNIDAD'))
  assert.throws(() => requireTransferStock(4000, 5000, 'UNIDAD'), /insuficiente/)
  assert.throws(() => requireTransferStock(0, 1000, 'UNIDAD'))
  assert.throws(() => requireTransferStock(5000, 500, 'CAJA'))
  assert.equal(parseQuantityMilli('0,250', 'KILOGRAMO'), 250)
})

test('conteo desde cero crea entrada y conteo a cero crea salida, sin saldo negativo', () => {
  assert.equal(parseCountedMilli('0', 'UNIDAD'), 0)
  assert.equal(countDifference(0, 5000, 'UNIDAD'), 5000)
  assert.equal(countDifference(5000, 0, 'UNIDAD'), -5000)
  assert.throws(() => countDifference(5000, 5000, 'UNIDAD'), /coincide/)
  assert.throws(() => countDifference(2000, 100, 'UNIDAD'))
  assert.throws(() => parseCountedMilli('-1', 'UNIDAD'))
  const events = inventoryOperationMovements({
    ...common, kind: 'COUNT', locationId: 'dep-1',
    countedMilli: 7000, deltaMilli: -3000,
  })
  assert.equal(events.length, 1)
  assert.equal(events[0].deltaMilli, -3000)
  assert.equal(stockBalance([receipt, ...events], 'dep-1', 'catalog-1'), 7000)
})

test('se mantiene el conteo histórico si después se confirma otra compra', () => {
  const before = [receipt]
  const count = inventoryOperationMovements({
    ...common, kind: 'COUNT', locationId: 'dep-1',
    countedMilli: 8000, deltaMilli: -2000,
  })
  const laterReceipt = { ...receipt, id: 'demo-stock-later', deltaMilli: 2000,
    createdAt: '2026-11-06T18:00:00.000Z' }
  const historyAtCount = [...before, ...count, laterReceipt]
    .filter((event) => event.createdAt <= common.createdAt)
  assert.equal(stockBalance(historyAtCount, 'dep-1', 'catalog-1'), 8000)
  assert.equal(stockBalance([...before, ...count, laterReceipt], 'dep-1', 'catalog-1'), 10000)
})

test('motivos obligatorios sin caracteres de control', () => {
  assert.equal(normalizeStockReason('  Conteo   semanal   del   depósito  '), 'Conteo semanal del depósito')
  assert.throws(() => normalizeStockReason('x'))
  assert.throws(() => normalizeStockReason('Saldo\nincorrecto'))
})

test('historial agrupa un traslado en una única acción sin perder sus dos movimientos', () => {
  const transfer = inventoryOperationMovements({
    ...common, kind: 'TRANSFER', sourceLocationId: 'dep-1',
    destinationLocationId: 'local-1', quantityMilli: 5000,
  })
  const ledger = [receipt, ...transfer]
  assert.equal(ledger.length, 3)
  const history = inventoryHistoryEntries(ledger)
  assert.equal(history.length, 2)
  assert.equal(history[0].kind, 'TRANSFER')
  assert.equal(history[0].sourceLocationId, 'dep-1')
  assert.equal(history[0].destinationLocationId, 'local-1')
  assert.equal(history[0].quantityMilli, 5000)
  assert.equal(history[1].kind, 'MOVEMENT')
  assert.equal(stockBalance(ledger, 'dep-1', 'catalog-1'), 5000)
  assert.equal(stockBalance(ledger, 'local-1', 'catalog-1'), 5000)
})

test('historial no oculta registros si un traslado tiene una sola pierna', () => {
  const legs = inventoryOperationMovements({
    ...common, kind: 'TRANSFER', sourceLocationId: 'dep-1',
    destinationLocationId: 'local-1', quantityMilli: 2000,
  })
  const history = inventoryHistoryEntries([receipt, legs[0]])
  assert.equal(history.length, 2)
  assert.equal(history.filter((entry) => entry.kind === 'TRANSFER').length, 0)
  assert.equal(history.filter((entry) => entry.kind === 'MOVEMENT').length, 2)
})

test('historial no agrupa parejas inconsistentes ni movimientos de distinto negocio', () => {
  const legs = inventoryOperationMovements({
    ...common, kind: 'TRANSFER', sourceLocationId: 'dep-1',
    destinationLocationId: 'local-1', quantityMilli: 2000,
  })
  for (const incompatible of [
    { ...legs[1], businessId: 'otra-empresa' },
    { ...legs[1], deltaMilli: 1000 },
    { ...legs[1], locationId: legs[0].locationId },
    { ...legs[1], reason: 'Motivo diferente' },
  ]) {
    const history = inventoryHistoryEntries([legs[0], incompatible])
    assert.equal(history.length, 2)
    assert.ok(history.every((entry) => entry.kind === 'MOVEMENT'))
  }
})

test('historial conserva recepciones y conteos como operaciones individuales', () => {
  const count = inventoryOperationMovements({
    ...common, kind: 'COUNT', locationId: 'dep-1',
    countedMilli: 8000, deltaMilli: -2000,
  })
  const history = inventoryHistoryEntries([receipt, ...count])
  assert.equal(history.length, 2)
  assert.ok(history.every((entry) => entry.kind === 'MOVEMENT'))
  assert.equal(history[0].movement.type, 'AJUSTE_CONTEO')
  assert.equal(history[1].movement.type, 'RECEPCION_COMPRA')
})
