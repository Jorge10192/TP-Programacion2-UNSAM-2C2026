import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mapSnapshot, quantityMilli } from './snapshot.ts'
import { cashSessionTotals } from '../demo/cashPolicy.ts'
import { stockKey } from '../demo/inventoryPolicy.ts'
import { createApiGateway, decimalQuantity } from './apiGateway.ts'
import { GatewayError } from './httpClient.ts'

// Captured by the backend HTTP test using its production routers and an isolated SQL database.
const fixture = JSON.parse(readFileSync(new URL('../../../tests/fixtures/online-snapshot.http.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''))
const user = { id: 'user:' + fixture.contexto.user.id, name: fixture.contexto.user.nombre, role: fixture.contexto.user.rol }
const clone = () => structuredClone(fixture)
const tick = () => new Promise(resolve => setImmediate(resolve))
const requestId = '00000000-0000-4000-8000-000000000999'

test('snapshot HTTP real preserva descuento, pagos separados, conteo cero y ledger único', () => {
  const state = mapSnapshot(clone(), user)
  const sale = Object.values(state.salesById)[0]
  assert.equal(sale.discountCents, 150)
  assert.deepEqual(sale.payments.map(p => [p.method, p.amountCents]), [['EFECTIVO', 250000], ['TRANSFERENCIA', 500000]])
  const count = Object.values(state.inventoryOperationsById)[0]
  assert.equal(count.lines.length, 2)
  assert.equal(count.lines[1].deltaMilli, 0)
  assert.equal(state.apiInventoryMovements.length, fixture.movimientos.length)
  assert.equal(state.apiLegacyRecords.length, 0)
  assert.equal(state.suppliersById['proveedor:' + fixture.proveedores[0].id].updatedAt, null)
})

test('stock y arqueo se toman del servidor aunque no puedan reconstruirse desde las listas visibles', () => {
  const raw = clone()
  raw.movimientos = []; raw.ventas = []; raw.gastos = []
  const state = mapSnapshot(raw, user)
  for (const row of fixture.stock) assert.equal(state.apiStockBalances[stockKey('principal', 'insumo:' + row.insumo_id)], quantityMilli(row.cantidad))
  const closed = Object.values(state.cashSessionsById).find(row => row.status === 'CERRADA')
  assert.equal(cashSessionTotals(closed, [], []).expectedCashCents, 1100000)
  assert.equal(closed.closeSnapshot.expectedCashCents, 1100000)
})

test('histórico conserva cantidades de seis decimales y costos desconocidos sin redondear ni inventar', () => {
  const raw = clone()
  raw.stock[0].cantidad = '5.000001'
  raw.compras[0].items[0].costo_unitario_centavos = null
  raw.compras[0].legacy_readonly = true
  raw.compras[0].legacy_reasons = ['COSTO_UNITARIO_DESCONOCIDO']
  const state = mapSnapshot(raw, user)
  assert.equal(state.apiStockBalances[stockKey('principal', 'insumo:' + raw.stock[0].insumo_id)], undefined)
  assert.ok(state.apiLegacyRecords.some(row => row.fields.some(field => field.value.includes('5.000001'))))
  assert.ok(state.apiLegacyRecords.some(row => row.fields.some(field => field.value === 'No registrado en el histórico')))
  assert.equal(Object.keys(state.purchasesById).length, 0)
})

test('snapshot parcial, otra identidad o una cantidad redondeada se rechazan', () => {
  const raw = clone(); delete raw.gastos
  assert.throws(() => mapSnapshot(raw, user), GatewayError)
  assert.throws(() => mapSnapshot(clone(), { ...user, id: 'user:999' }), GatewayError)
  assert.throws(() => quantityMilli('1.2'), GatewayError)
  assert.equal(decimalQuantity(1234), '1.234000')
  const withoutSku = clone(); withoutSku.ventas[0].items[0].sku_snapshot = null
  assert.equal(Object.values(mapSnapshot(withoutSku, user).salesById)[0].lines[0].sku, '')
})

test('upgrade HTTP real conserva compra convertida, snapshot/costo desconocidos y stock 10.000001 sólo lectura', () => {
  const raw = JSON.parse(readFileSync(new URL('../../../tests/fixtures/online-legacy-snapshot.http.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''))
  const owner = { id: 'user:' + raw.contexto.user.id, name: raw.contexto.user.nombre, role: raw.contexto.user.rol }
  const state = mapSnapshot(raw, owner)
  assert.equal(Object.keys(state.purchasesById).length, 0)
  assert.equal(Object.keys(state.apiStockBalances).length, 0)
  assert.equal(Object.keys(state.suppliersById).length, raw.proveedores.length)
  const fields = state.apiLegacyRecords.flatMap(row => row.fields)
  assert.ok(fields.some(field => field.value.includes('10.000001 Kilogramo anterior')))
  assert.ok(fields.some(field => field.label === 'Cantidad comprada' && field.value === '2.000000 Bolsa anterior'))
  assert.ok(fields.some(field => field.label === 'Cantidad incorporada' && field.value === '10.000000 Kilogramo anterior'))
  assert.ok(fields.some(field => field.label === 'Renglón 1' && field.value === 'Nombre histórico no informado'))
  assert.ok(fields.some(field => field.label === 'Costo unitario' && field.value === 'No registrado en el histórico'))
  assert.ok(fields.some(field => field.label === 'Total original ARS' && field.value === (200050 / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 })))
})

function harness(handler) {
  const calls = [], updates = [], recoveries = []
  const session = { getSnapshot: () => ({ status: 'authenticated', user }),
    request: async (path, input) => { calls.push({ path, input: structuredClone(input) }); return handler(path, input) } }
  const api = createApiGateway(session, { snapshot: value => updates.push(value), recovery: value => recoveries.push(value) })
  return { api, calls, updates, recoveries }
}
const saleInput = state => {
  const original = Object.values(state.salesById)[0]
  return { locationId: 'principal', lines: original.lines.map(line => ({ catalogItemId: line.catalogItemId, quantityMilli: line.quantityMilli, unitPriceCents: line.unitPriceCents })),
    discountCents: 150, payments: original.payments, notes: 'Prueba aislada' }
}

test('un envío incierto conserva cuerpo/UUID, no se reintenta solo y termina con un resultado único', async () => {
  let posts = 0
  const h = harness((path, input) => {
    if (!input) return clone()
    posts++
    if (posts === 1) throw new GatewayError('network', 'respuesta perdida', undefined, 'unknown')
    return clone().ventas[0]
  })
  const state = await h.api.loadSnapshot(user)
  const input = saleInput(state)
  const pending = h.api.gateway.registerSale('walos', input, 'demo-sale-request-' + requestId)
  await tick()
  assert.equal(posts, 1)
  assert.ok(h.recoveries.at(-1))
  input.notes = 'No debe viajar'; input.payments[0].amountCents = 1
  await assert.rejects(h.api.gateway.registerSale('walos', input, requestId), { kind: 'conflict' })
  h.recoveries.at(-1).retry()
  const result = await pending
  assert.equal(result.totalCents, fixture.ventas[0].total_centavos)
  const sent = h.calls.filter(row => row.input?.method === 'POST')
  assert.deepEqual(sent[0].input.body, sent[1].input.body)
  assert.equal(sent[0].input.body.request_id, requestId)
  assert.equal(sent[0].input.body.pagos.length, 2)
  assert.equal(sent[0].input.body.descuento_centavos, 150)
  assert.equal(h.updates.length, 1)
  assert.equal(h.recoveries.at(-1), null)
})

test('una confirmación con lectura fallida reintenta sólo GET, nunca vuelve a registrar', async () => {
  let gets = 0
  const h = harness((path, input) => {
    if (input) return clone().ventas[0]
    if (++gets === 2) throw new GatewayError('network', 'lectura interrumpida')
    return clone()
  })
  const state = await h.api.loadSnapshot(user)
  const pending = h.api.gateway.registerSale('walos', saleInput(state), requestId)
  await tick(); h.recoveries.at(-1).retry(); await pending
  assert.equal(h.calls.filter(row => row.input).length, 1)
  assert.equal(gets, 3)
})

test('un 401 durante la comprobación no descarta un envío cuyo resultado anterior era incierto', async () => {
  let posts = 0
  const h = harness((path, options) => {
    if (!options) return clone()
    posts++
    if (posts === 1) throw new GatewayError('network', 'resultado incierto', undefined, 'unknown')
    if (posts === 2) throw new GatewayError('unauthenticated', 'sesión vencida', 401)
    return clone().ventas[0]
  })
  const state = await h.api.loadSnapshot(user)
  const pending = h.api.gateway.registerSale('walos', saleInput(state), requestId)
  await tick(); h.recoveries.at(-1).retry(); await tick()
  assert.ok(h.recoveries.at(-1), 'el envío permanece pendiente hasta reingresar y comprobar')
  h.recoveries.at(-1).retry(); await pending
  assert.deepEqual(h.calls.filter(row => row.input).map(row => row.input.body.request_id), [requestId, requestId, requestId])
  assert.equal(h.updates.length, 1)
})

test('conteo conserva versiones revisadas y sus dos filas en un comando atómico', async () => {
  const h = harness((path, input) => input ? clone().conteos[0] : clone())
  const state = await h.api.loadSnapshot(user)
  const lines = fixture.conteos[0].items.map(row => ({ catalogItemId: 'insumo:' + row.insumo_id,
    expectedMilli: quantityMilli(row.cantidad_anterior), countedMilli: quantityMilli(row.cantidad_contada), expectedVersion: row.version_anterior }))
  await h.api.gateway.countInventoryBatch('walos', 'principal', lines, 'Control completo', requestId)
  const body = h.calls.find(row => row.input).input.body
  assert.equal(body.items.length, 2)
  assert.deepEqual(body.items.map(row => row.expected_version), fixture.conteos[0].items.map(row => row.version_anterior))
  assert.equal(Object.keys(state.businessesById).length, 1)
})

test('venta por transferencia requiere jornada y un conflicto no se reproduce automáticamente', async () => {
  const raw = clone(); raw.jornadas = raw.jornadas.filter(row => row.estado === 'CERRADA')
  const h = harness(() => raw)
  const state = await h.api.loadSnapshot(user)
  const input = saleInput(state); input.payments = [{ method: 'TRANSFERENCIA', amountCents: 750000 }]
  await assert.rejects(h.api.gateway.registerSale('walos', input, requestId), /Abrí una jornada/)
  assert.equal(h.calls.length, 1)
  const conflict = harness((path, options) => { if (options) throw new GatewayError('conflict', 'Versión cambió', 409); return clone() })
  const fresh = await conflict.api.loadSnapshot(user)
  await assert.rejects(conflict.api.gateway.registerSale('walos', saleInput(fresh), requestId), { kind: 'conflict' })
  assert.equal(conflict.calls.filter(row => row.input).length, 1)
  assert.equal(conflict.updates.length, 1)
  assert.equal(conflict.recoveries.at(-1), null)
})
