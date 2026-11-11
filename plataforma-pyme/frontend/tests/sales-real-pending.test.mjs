import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createSalePendingJournal, newSalePending, parseSalePending,
  receiptMatchesPending, salePendingOld, salePendingScope,
  SalePendingConflict, SalePendingUnavailable,
} from '../src/features/sales/salePendingJournal.ts'

const business = '6a940fae-5c3d-4eea-b155-e3b19426ff6f'
const otherBusiness = '3da930ca-ef1a-4d11-8763-b2f96814733f'
const actor = 'e10df64f-672d-41bd-8af6-34aec404fede'
const otherActor = '43d694a6-1098-49a3-8dc2-975469915745'
const key = 'aa4727c2-a6b0-4755-92e2-ed4f2d09a2d2'
const anotherKey = '0441c7b0-1d38-4f82-b563-c95ee389ab42'
const serviceId = '9594e884-8b48-43ce-9fd8-a4bd37959da5'
const saleId = '2f25d9eb-3328-4d6e-8d9d-a536c6d9b13d'

const command = () => ({
  location_id: null, discount_cents: 0, notes: '',
  lines: [{ catalog_item_id: serviceId, quantity_milli: 1000, unit_price_cents: 10000 }],
  payments: [{ method: 'EFECTIVO', amount_cents: 10000, reference: '' }],
})
const receipt = () => ({
  id: saleId, business_id: business, location_id: null, request_id: key,
  status: 'CONFIRMADA', subtotal_cents: 10000, discount_cents: 0,
  total_cents: 10000, notes: '', created_by_id: actor,
  created_at: '2026-11-10T17:00:00Z', balances_after: [],
  lines: [{
    id: 'ccf1b391-13ae-43b5-b246-38a30e7a34a9', line_number: 1,
    catalog_item_id: serviceId, description_snapshot: 'Servicio REAL',
    kind_snapshot: 'SERVICIO', unit_snapshot: 'SERVICIO', sku_snapshot: '',
    quantity_milli: 1000, unit_price_cents: 10000, line_total_cents: 10000,
  }],
  payments: [{
    id: '5679d155-3a2e-4a8f-8e81-c3833b12a3f6', payment_number: 1,
    method: 'EFECTIVO', amount_cents: 10000, reference: '',
  }],
})

function fakePort() {
  const saved = new Map()
  let failRead = false, failReserve = false, failRemove = false
  const port = {
    async read(scope) {
      if (failRead) throw new SalePendingUnavailable()
      return structuredClone(saved.get(scope))
    },
    async reserve(row) {
      if (failReserve) throw new SalePendingUnavailable()
      const existing = saved.get(row.scope)
      if (existing !== undefined &&
        JSON.stringify(existing) !== JSON.stringify(row)) throw new SalePendingConflict()
      if (existing === undefined) saved.set(row.scope, structuredClone(row))
    },
    async remove(scope, originalKey) {
      if (failRemove) throw new SalePendingUnavailable()
      const existing = saved.get(scope)
      if (existing === undefined || existing.key !== originalKey) throw new SalePendingConflict()
      saved.delete(scope)
    },
  }
  return {
    port, saved,
    flags: {
      failReads: value => { failRead = value },
      failReserves: value => { failReserve = value },
      failRemoves: value => { failRemove = value },
    },
  }
}

test('T10-B conserva UUID4 y cuerpo idéntico al recrear journal tras F5', async () => {
  const { port } = fakePort()
  const intent = newSalePending(actor, business, command(), key)
  const first = createSalePendingJournal(port)
  assert.deepEqual(await first.reserve(intent), intent)
  const fresh = createSalePendingJournal(port)
  assert.deepEqual(await fresh.load(intent.scope), intent)
  assert.equal((await fresh.load(intent.scope)).key, key)
  assert.equal(intent.kind, 'sale.create')
  assert.ok(!Object.hasOwn(intent, 'token'))
})

test('T10-B aisla por actor y por empresa, no expone pendientes ajenos', async () => {
  const { port } = fakePort()
  const journal = createSalePendingJournal(port)
  const original = newSalePending(actor, business, command(), key)
  await journal.reserve(original)
  assert.equal(await journal.load(salePendingScope(otherActor, business)), null)
  assert.equal(await journal.load(salePendingScope(actor, otherBusiness)), null)
  assert.equal((await journal.load(original.scope)).actorId, actor)
  assert.throws(() => parseSalePending({ ...original, businessId: otherBusiness }, original.scope),
    SalePendingConflict)
})

test('T10-B reserva el mismo intento sin reemplazar clave o cuerpo', async () => {
  const { port } = fakePort()
  const j = createSalePendingJournal(port)
  const first = newSalePending(actor, business, command(), key)
  await j.reserve(first)
  assert.deepEqual(await j.reserve(first), first)
  await assert.rejects(j.reserve({ ...first, key: anotherKey }), SalePendingConflict)
  await assert.rejects(j.reserve({
    ...first, body: { ...first.body, notes: 'Edición después de POST' },
  }), SalePendingConflict)
  assert.deepEqual(await j.load(first.scope), first)
})

test('T10-B un registro corrupto, no canónico o con secretos bloquea lectura y reescritura', async () => {
  const { port, saved } = fakePort()
  const j = createSalePendingJournal(port)
  const row = newSalePending(actor, business, command(), key)
  for (const damaged of [
    { ...row, token: 'Bearer fake' },
    { ...row, body: { ...row.body, notes: '  sin normalizar  ' } },
    { ...row, body: { ...row.body, password: 'secreto' } },
    { ...row, actorId: 'DEMO' },
    { ...row, scope: salePendingScope(otherActor, business) },
    { ...row, createdAt: 'no-es-fecha' },
  ]) {
    saved.set(row.scope, damaged)
    await assert.rejects(j.load(row.scope), SalePendingConflict)
    await assert.rejects(j.reserve(row), SalePendingConflict)
  }
  assert.equal(saved.has(row.scope), true)
})

test('T10-B IndexedDB inaccesible impide confirmar reserva: no hay degradación a memoria', async () => {
  const { port, flags } = fakePort()
  const j = createSalePendingJournal(port)
  const row = newSalePending(actor, business, command(), key)
  flags.failReserves(true)
  await assert.rejects(j.reserve(row), SalePendingUnavailable)
  flags.failReserves(false)
  flags.failReads(true)
  await assert.rejects(j.reserve(row), SalePendingUnavailable)
  await assert.rejects(j.load(row.scope), SalePendingUnavailable)
})

test('T10-B no elimina un pendiente con comprobante de otro tenant, actor o request_id', async () => {
  const { port } = fakePort()
  const j = createSalePendingJournal(port)
  const row = newSalePending(actor, business, command(), key)
  await j.reserve(row)
  for (const bad of [
    { ...receipt(), business_id: otherBusiness },
    { ...receipt(), created_by_id: otherActor },
    { ...receipt(), request_id: anotherKey },
  ]) {
    assert.equal(receiptMatchesPending(row, bad), false)
    await assert.rejects(j.closeConfirmed(row.scope, row.key, bad), SalePendingConflict)
    assert.deepEqual(await j.load(row.scope), row)
  }
})

test('T10-B no cierra con comprobante que cambia precio, cantidad, importe, pago, nota o sede', async () => {
  const { port } = fakePort()
  const j = createSalePendingJournal(port)
  const row = newSalePending(actor, business, command(), key)
  await j.reserve(row)
  for (const bad of [
    { ...receipt(), lines: [{ ...receipt().lines[0], unit_price_cents: 20000, line_total_cents: 20000 }] },
    { ...receipt(), lines: [{ ...receipt().lines[0], quantity_milli: 2000, line_total_cents: 20000 }] },
    { ...receipt(), total_cents: 9999 },
    { ...receipt(), payments: [{ ...receipt().payments[0], method: 'TARJETA' }] },
    { ...receipt(), notes: 'nota agregada' },
    { ...receipt(), location_id: '65c0d595-4976-4ac5-97f1-f2dc3da13f60' },
  ]) {
    assert.equal(receiptMatchesPending(row, bad), false)
    await assert.rejects(j.closeConfirmed(row.scope, row.key, bad), SalePendingConflict)
  }
  assert.deepEqual(await j.load(row.scope), row)
})

test('T10-B comprobante válido confirmado libera el scope una sola vez', async () => {
  const { port } = fakePort()
  const j = createSalePendingJournal(port)
  const row = newSalePending(actor, business, command(), key)
  await j.reserve(row)
  assert.equal(receiptMatchesPending(row, receipt()), true)
  await j.closeConfirmed(row.scope, row.key, receipt())
  assert.equal(await j.load(row.scope), null)
  await assert.rejects(j.closeConfirmed(row.scope, row.key, receipt()), SalePendingConflict)
})

test('T10-B fallo del borrado conserva pendiente confirmado para recuperación', async () => {
  const { port, flags } = fakePort()
  const j = createSalePendingJournal(port)
  const row = newSalePending(actor, business, command(), key)
  await j.reserve(row)
  flags.failRemoves(true)
  await assert.rejects(j.closeConfirmed(row.scope, row.key, receipt()), SalePendingUnavailable)
  assert.deepEqual(await j.load(row.scope), row)
})

test('T10-B antigüedad solo advierte: no ejecuta borrados automáticos', async () => {
  const { port, saved } = fakePort()
  const j = createSalePendingJournal(port)
  const row = newSalePending(actor, business, command(), key)
  await j.reserve(row)
  saved.get(row.scope).createdAt = '2026-01-01T00:00:00Z'
  const old = await j.load(row.scope)
  assert.equal(salePendingOld(old), true)
  assert.deepEqual(await j.load(row.scope), old)
})

test('T10-B crea UUID4 y normaliza una sola vez antes del guardado', () => {
  const body = command()
  body.notes = '  ＰＯＳ   confirmado  '
  const intent = newSalePending(actor, business, body)
  assert.match(intent.key, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  assert.equal(intent.body.notes, 'POS confirmado')
  assert.equal(body.notes, '  ＰＯＳ   confirmado  ')
  assert.equal(parseSalePending(intent, intent.scope).key, intent.key)
})

test('T10-B el journal sólo tiene operaciones de almacenamiento, sin POST ni token', async () => {
  const { port } = fakePort()
  const operations = []
  const j = createSalePendingJournal({
    async read(scope) { operations.push('GET-LOCAL'); return port.read(scope) },
    async reserve(row) { operations.push('WRITE-LOCAL'); return port.reserve(row) },
    async remove(scope, key) { operations.push('DELETE-LOCAL'); return port.remove(scope, key) },
  })
  const row = newSalePending(actor, business, command(), key)
  await j.reserve(row)
  assert.deepEqual(operations, ['WRITE-LOCAL', 'GET-LOCAL'])
  assert.equal(JSON.stringify(row).includes('Authorization'), false)
  assert.equal(JSON.stringify(row).includes('Bearer'), false)
})
