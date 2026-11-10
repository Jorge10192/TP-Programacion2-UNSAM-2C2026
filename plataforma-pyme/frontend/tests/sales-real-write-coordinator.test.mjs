import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiHttpError, ApiTransportError } from '../src/api/httpClient.ts'
import {
  createSalePendingJournal, SalePendingConflict, SalePendingUnavailable,
} from '../src/features/sales/salePendingJournal.ts'
import { createSaleWriteCoordinator } from '../src/features/sales/realSaleWriteCoordinator.ts'

const business = '6a940fae-5c3d-4eea-b155-e3b19426ff6f'
const anotherBusiness = '3da930ca-ef1a-4d11-8763-b2f96814733f'
const actor = 'e10df64f-672d-41bd-8af6-34aec404fede'
const anotherActor = '43d694a6-1098-49a3-8dc2-975469915745'
const item = '9594e884-8b48-43ce-9fd8-a4bd37959da5'
const saleId = '2f25d9eb-3328-4d6e-8d9d-a536c6d9b13d'
const key = 'aa4727c2-a6b0-4755-92e2-ed4f2d09a2d2'
const body = () => ({
  location_id: null, discount_cents: 0, notes: '',
  lines: [{ catalog_item_id: item, quantity_milli: 1000, unit_price_cents: 12345 }],
  payments: [{ method: 'EFECTIVO', amount_cents: 12345, reference: '' }],
})
const sale = () => ({
  id: saleId, business_id: business, location_id: null,
  request_id: key, status: 'CONFIRMADA',
  subtotal_cents: 12345, discount_cents: 0, total_cents: 12345,
  notes: '', created_by_id: actor, created_at: '2026-11-10T18:00:00Z',
  balances_after: [],
  lines: [{
    id: 'ccf1b391-13ae-43b5-b246-38a30e7a34a9', line_number: 1,
    catalog_item_id: item, description_snapshot: 'Servicio REAL',
    kind_snapshot: 'SERVICIO', unit_snapshot: 'SERVICIO', sku_snapshot: '',
    quantity_milli: 1000, unit_price_cents: 12345, line_total_cents: 12345,
  }],
  payments: [{
    id: '5679d155-3a2e-4a8f-8e81-c3833b12a3f6', payment_number: 1,
    method: 'EFECTIVO', amount_cents: 12345, reference: '',
  }],
})
const response = (payload, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })

function setup(fetchImpl) {
  const saved = new Map()
  let failReads = false
  let failReserves = false
  let failDeletes = false
  const port = {
    async read(scope) {
      if (failReads) throw new SalePendingUnavailable()
      return structuredClone(saved.get(scope))
    },
    async reserve(value) {
      if (failReserves) throw new SalePendingUnavailable()
      const old = saved.get(value.scope)
      if (old && JSON.stringify(old) !== JSON.stringify(value))
        throw new SalePendingConflict()
      saved.set(value.scope, structuredClone(value))
    },
    async remove(scope, originalKey) {
      if (failDeletes) throw new SalePendingUnavailable()
      if (saved.get(scope)?.key !== originalKey) throw new SalePendingConflict()
      saved.delete(scope)
    },
  }
  const journal = createSalePendingJournal(port)
  const coordinator = createSaleWriteCoordinator(
    'token-opaque', actor, business, journal, fetchImpl,
  )
  return {
    saved, journal, coordinator,
    failRead: value => { failReads = value },
    failReserve: value => { failReserves = value },
    failDelete: value => { failDeletes = value },
  }
}

test('T10-B2 preparar escribe y relee intento sin emitir ningún HTTP', async () => {
  let requests = 0
  const { coordinator } = setup(async () => { requests++; return response(sale()) })
  const prepared = await coordinator.prepare(body(), key)
  assert.equal(prepared.key, key)
  assert.deepEqual(prepared.body, body())
  assert.deepEqual(await coordinator.pending(), prepared)
  assert.equal(requests, 0)
  assert.deepEqual(await coordinator.recover(), { state: 'not-found', pending: prepared } === null ? {} : { state: 'not-found', pending: prepared })
})

test('T10-B2 sin confirmación explícita, clave distinta o journal ausente no hace POST', async () => {
  let calls = 0
  const { coordinator } = setup(async () => { calls++; return response(sale(), 201) })
  await assert.rejects(coordinator.sendApproved(key, false), SalePendingConflict)
  await assert.rejects(coordinator.sendApproved(key, true), SalePendingConflict)
  await coordinator.prepare(body(), key)
  await assert.rejects(coordinator.sendApproved('644cc7b4-68b1-4dae-8848-fcdf70f960c1', true), SalePendingConflict)
  assert.equal(calls, 0)
})

test('T10-B2 reserva/relectura antes del POST; venta confirmada cierra sólo con comprobante idéntico', async () => {
  const calls = []
  const { coordinator } = setup(async (url, options) => {
    calls.push({ url, options })
    return response(sale(), 201)
  })
  await coordinator.prepare(body(), key)
  const finished = await coordinator.sendApproved(key, true)
  assert.equal(finished.state, 'confirmed')
  assert.equal(finished.journalCleared, true)
  assert.equal(finished.receipt.id, saleId)
  assert.equal(await coordinator.pending(), null)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, '/api/v1/businesses/' + business + '/sales')
  assert.equal(calls[0].options.method, 'POST')
  assert.equal(calls[0].options.headers.get('Idempotency-Key'), key)
  assert.equal(calls[0].options.headers.get('Authorization'), 'Bearer token-opaque')
  assert.deepEqual(JSON.parse(calls[0].options.body), body())
  assert.equal(calls[0].options.credentials, 'omit')
})

test('T10-B2 replay 200 confirmado cierra el mismo request_id', async () => {
  let postCalls = 0
  const { coordinator } = setup(async (url, options) => {
    assert.equal(options.method, 'POST')
    postCalls++
    return response(sale(), 200)
  })
  await coordinator.prepare(body(), key)
  assert.equal((await coordinator.sendApproved(key, true)).journalCleared, true)
  assert.equal(postCalls, 1)
})

test('T10-B2 409 por stock o por clave conflictiva mantiene el intento para recuperación', async () => {
  let postCalls = 0
  const { coordinator } = setup(async (url, options) => {
    assert.equal(options.method, 'POST')
    postCalls++
    return response({ detail: 'Stock insuficiente o clave duplicada' }, 409)
  })
  await coordinator.prepare(body(), key)
  await assert.rejects(coordinator.sendApproved(key, true),
    error => error instanceof ApiHttpError && error.status === 409)
  assert.equal((await coordinator.pending()).key, key)
  assert.equal(postCalls, 1)
})

test('T10-B2 respuesta POST corrupta es resultado incierto, nunca descarta la clave', async () => {
  const { coordinator } = setup(async () => response({ status: 'CONFIRMADA', id: saleId }, 201))
  await coordinator.prepare(body(), key)
  await assert.rejects(coordinator.sendApproved(key, true),
    error => error instanceof ApiTransportError && error.reason === 'invalid-response' &&
      error.outcomeUnknown === true)
  assert.equal((await coordinator.pending()).key, key)
})

test('T10-B2 red perdida después de enviar POST conserva solicitud y no reintenta sola', async () => {
  let requests = 0
  const { coordinator } = setup(async () => { requests++; throw new TypeError('Sin respuesta') })
  await coordinator.prepare(body(), key)
  await assert.rejects(coordinator.sendApproved(key, true),
    error => error instanceof ApiTransportError && error.reason === 'network' &&
      error.outcomeUnknown === true)
  assert.equal(requests, 1)
  assert.deepEqual((await coordinator.pending()).body, body())
})

test('T10-B2 GET 404 no demuestra que no se creó: conserva pendiente y no envía POST', async () => {
  const methods = []
  const { coordinator } = setup(async (url, options) => {
    methods.push(options.method)
    assert.ok(url.endsWith('/sales/by-request/' + key))
    return response({ detail: 'No encontrada' }, 404)
  })
  await coordinator.prepare(body(), key)
  assert.deepEqual((await coordinator.recover()).state, 'not-found')
  assert.equal((await coordinator.pending()).key, key)
  assert.deepEqual(methods, ['GET'])
})

test('T10-B2 F5 o login nuevo: GET recupera comprobante y cierra pendiente sin POST', async () => {
  const methods = []
  const harness = setup(async (url, options) => {
    methods.push(options.method)
    assert.ok(url.endsWith('/sales/by-request/' + key))
    return response(sale())
  })
  await harness.coordinator.prepare(body(), key)
  const afterRefresh = createSaleWriteCoordinator(
    'token-fresco', actor, business, harness.journal, async (url, options) => {
      methods.push(options.method)
      return response(sale())
    },
  )
  const outcome = await afterRefresh.recover()
  assert.equal(outcome.state, 'confirmed')
  assert.equal(outcome.journalCleared, true)
  assert.equal(await afterRefresh.pending(), null)
  assert.deepEqual(methods, ['GET'])
})

test('T10-B2 no confirma recibo alterado ni borra un pendiente al cambiar tenant/actor/importes', async () => {
  for (const modified of [
    { ...sale(), business_id: anotherBusiness },
    { ...sale(), created_by_id: anotherActor },
    { ...sale(), total_cents: 12344 },
    { ...sale(), payments: [{ ...sale().payments[0], method: 'TARJETA' }] },
  ]) {
    const { coordinator } = setup(async () => response(modified))
    await coordinator.prepare(body(), key)
    await assert.rejects(coordinator.recover(), SalePendingConflict)
    assert.equal((await coordinator.pending()).key, key)
  }
})

test('T10-B2 si falla la lectura o reserva del journal NO envía POST', async () => {
  let calls = 0
  const harness = setup(async () => { calls++; return response(sale(), 201) })
  await harness.coordinator.prepare(body(), key)
  harness.failRead(true)
  await assert.rejects(harness.coordinator.sendApproved(key, true), SalePendingUnavailable)
  harness.failRead(false)
  harness.failReserve(true)
  await assert.rejects(harness.coordinator.sendApproved(key, true), SalePendingUnavailable)
  assert.equal(calls, 0)
})

test('T10-B2 comprobante confirmado pero fallo de limpieza: informar confirmado y conservar pendiente', async () => {
  const harness = setup(async () => response(sale(), 201))
  await harness.coordinator.prepare(body(), key)
  harness.failDelete(true)
  const result = await harness.coordinator.sendApproved(key, true)
  assert.equal(result.state, 'confirmed')
  assert.equal(result.journalCleared, false)
  assert.equal((await harness.coordinator.pending()).key, key)
})
