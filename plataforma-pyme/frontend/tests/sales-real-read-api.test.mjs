import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiHttpError, ApiTransportError } from '../src/api/httpClient.ts'
import {
  createSalesReadGateway, parseSaleReceipt, salesReadErrorMessage,
} from '../src/features/sales/realSalesReadGateway.ts'

const business = '6a940fae-5c3d-4eea-b155-e3b19426ff6f'
const foreignBusiness = '3da930ca-ef1a-4d11-8763-b2f96814733f'
const actor = 'e10df64f-672d-41bd-8af6-34aec404fede'
const saleId = '2f25d9eb-3328-4d6e-8d9d-a536c6d9b13d'
const requestId = 'aa4727c2-a6b0-4755-92e2-ed4f2d09a2d2'
const serviceItem = '9594e884-8b48-43ce-9fd8-a4bd37959da5'
const physicalItem = 'e8c760ed-9a4e-4dbb-a797-4563acff4ba6'
const site = '65c0d595-4976-4ac5-97f1-f2dc3da13f60'
const serviceLine = () => ({
  id: 'ccf1b391-13ae-43b5-b246-38a30e7a34a9', line_number: 1,
  catalog_item_id: serviceItem, description_snapshot: 'Servicio técnico',
  kind_snapshot: 'SERVICIO', unit_snapshot: 'SERVICIO', sku_snapshot: '',
  quantity_milli: 1000, unit_price_cents: 10000, line_total_cents: 10000,
})
const physicalLine = () => ({
  id: 'a2e71305-d1e4-40bf-9ac8-bb3693c3142f', line_number: 2,
  catalog_item_id: physicalItem, description_snapshot: 'Bien físico',
  kind_snapshot: 'BIEN', unit_snapshot: 'UNIDAD', sku_snapshot: 'SKU-A',
  quantity_milli: 1000, unit_price_cents: 8000, line_total_cents: 8000,
})
const payment = () => ({
  id: '5679d155-3a2e-4a8f-8e81-c3833b12a3f6', payment_number: 1,
  method: 'EFECTIVO', amount_cents: 10000, reference: '',
})
const sale = () => ({
  id: saleId, business_id: business, location_id: null, request_id: requestId,
  status: 'CONFIRMADA', subtotal_cents: 10000, discount_cents: 0,
  total_cents: 10000, notes: '', created_by_id: actor,
  created_at: '2026-11-10T17:00:00Z', balances_after: [],
  lines: [serviceLine()], payments: [payment()],
})
const mixed = () => ({
  ...sale(), location_id: site, subtotal_cents: 18000, discount_cents: 1000,
  total_cents: 17000, lines: [serviceLine(), physicalLine()],
  balances_after: [{ catalog_item_id: physicalItem, quantity_milli: 5000, version: 2 }],
  payments: [
    { ...payment(), amount_cents: 7000 },
    { id: 'dd73e14c-39d2-4a61-b2ef-f9b902f94ac4', payment_number: 2,
      method: 'TRANSFERENCIA', amount_cents: 10000, reference: 'Banco informado' },
  ],
})
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
function malformed(value) {
  assert.throws(() => parseSaleReceipt(value, business),
    err => err instanceof ApiTransportError && err.reason === 'invalid-response' &&
      err.outcomeUnknown === false)
}

test('T09-A GET por UUID usa Bearer opaco y nunca envía POST ni conserva token', async () => {
  const calls = []
  const gateway = createSalesReadGateway('token-opaque', business, async (url, init) => {
    calls.push([url, init])
    return json(sale())
  })
  const receipt = await gateway.get(saleId)
  assert.equal(receipt.id, saleId)
  assert.equal(receipt.location_id, null)
  assert.deepEqual(receipt.balances_after, [])
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], '/api/v1/businesses/' + business + '/sales/' + saleId)
  assert.equal(calls[0][1].method, 'GET')
  assert.equal(calls[0][1].body, undefined)
  assert.equal(calls[0][1].headers.get('Authorization'), 'Bearer token-opaque')
  assert.equal(calls[0][1].headers.has('Idempotency-Key'), false)
  assert.equal(calls[0][1].credentials, 'omit')
  assert.equal(Object.hasOwn(receipt, 'token'), false)
})

test('T09-A conserva snapshots reales, descuento y pagos declarados en venta mixta', () => {
  const got = parseSaleReceipt(mixed(), business)
  assert.equal(got.lines.length, 2)
  assert.equal(got.lines[0].kind_snapshot, 'SERVICIO')
  assert.equal(got.lines[1].kind_snapshot, 'BIEN')
  assert.equal(got.balances_after[0].version, 2)
  assert.equal(got.total_cents, 17000)
  assert.equal(got.payments[1].method, 'TRANSFERENCIA')
  assert.equal(got.payments[1].reference, 'Banco informado')
})

test('T09-A redondea línea fraccionable con HALF_UP sin floats', () => {
  const row = mixed()
  row.lines = [{
    ...physicalLine(), line_number: 1, quantity_milli: 500,
    unit_snapshot: 'GRAMO', unit_price_cents: 3, line_total_cents: 2,
  }]
  row.subtotal_cents = 2
  row.discount_cents = 0
  row.total_cents = 2
  row.payments = [{ ...payment(), amount_cents: 2 }]
  row.balances_after = [{ catalog_item_id: physicalItem, quantity_milli: 0, version: 4 }]
  assert.equal(parseSaleReceipt(row, business).lines[0].line_total_cents, 2)
})

test('T09-A nunca acepta comprobante de otro tenant ni UUID inválidos', () => {
  for (const bad of [
    { ...sale(), business_id: foreignBusiness },
    { ...sale(), id: 'SALE-DEMO-01' },
    { ...sale(), request_id: 'sin-uuid' },
    { ...sale(), created_by_id: 'actor-Demo' },
    { ...sale(), location_id: foreignBusiness.slice(0, 6) },
    { ...sale(), created_at: 'fecha inválida' },
    { ...sale(), status: 'PENDIENTE' },
  ]) malformed(bad)
})

test('T09-A rechaza importes alterados, signos imposibles y pagos que no cuadran', () => {
  for (const bad of [
    { ...sale(), subtotal_cents: 12000 },
    { ...sale(), discount_cents: 10000 },
    { ...sale(), total_cents: -1 },
    { ...sale(), payments: [{ ...payment(), amount_cents: 9000 }] },
    { ...sale(), payments: [{ ...payment(), amount_cents: true }] },
    { ...sale(), lines: [{ ...serviceLine(), line_total_cents: 10001 }] },
    { ...sale(), lines: [{ ...serviceLine(), quantity_milli: 1500 }] },
    { ...sale(), lines: [{ ...serviceLine(), unit_snapshot: 'UNIDAD' }] },
    { ...sale(), lines: [{ ...serviceLine(), unit_price_cents: 1.5 }] },
    { ...sale(), lines: [{ ...serviceLine(), line_total_cents: 1.5 }] },
    { ...sale(), payments: [{ ...payment(), method: 'MP_ACREDITADO' }] },
  ]) malformed(bad)
})

test('T09-A rechaza duplicados de renglón/pago o números de orden y snapshots falsos', () => {
  const also = mixed()
  for (const bad of [
    { ...sale(), lines: [serviceLine(), { ...serviceLine(), line_number: 2 }] },
    { ...sale(), payments: [payment(), { ...payment(), payment_number: 2 }] },
    { ...mixed(), lines: [serviceLine(), { ...physicalLine(), line_number: 1 }] },
    { ...mixed(), payments: [payment(), { ...mixed().payments[1], payment_number: 1 }] },
    { ...mixed(), balances_after: [] },
    { ...mixed(), balances_after: [{ catalog_item_id: serviceItem, quantity_milli: 5000, version: 2 }] },
    { ...mixed(), balances_after: [{ catalog_item_id: physicalItem, quantity_milli: -1, version: 2 }] },
    { ...mixed(), location_id: null },
  ]) malformed(bad)
  assert.equal(also.balances_after.length, 1)
})

test('T09-A valida UUID antes de solicitar datos y no inventa listado ni búsqueda request_id', async () => {
  let calls = 0
  const gateway = createSalesReadGateway('token', business, async () => {
    calls++
    return json(sale())
  })
  for (const bad of ['', '../ventas', '/x', 'SALE-DEMO', foreignBusiness + '/sales']) {
    await assert.rejects(gateway.get(bad), TypeError)
  }
  assert.equal(calls, 0)
  assert.deepEqual(Object.keys(gateway), ['get'])
  assert.throws(() => createSalesReadGateway('', business), TypeError)
  assert.throws(() => createSalesReadGateway('token', 'id-demo'), TypeError)
})

test('T09-A propaga 401, 403, 404, 500 sin reemplazarlos por datos DEMO', async () => {
  for (const status of [401, 403, 404, 500]) {
    let called = 0
    const gateway = createSalesReadGateway('token', business, async () => {
      called++
      return json({ detail: 'no disponible' }, status)
    })
    await assert.rejects(gateway.get(saleId),
      err => err instanceof ApiHttpError && err.status === status)
    assert.equal(called, 1)
  }
})

test('T09-A fallo de red o respuesta corrupta en GET no crea venta ni resultado de escritura incierto', async () => {
  for (const fake of [
    async () => { throw new TypeError('red desconectada') },
    async () => json({ ...sale(), business_id: foreignBusiness }),
  ]) {
    let attempts = 0
    const gateway = createSalesReadGateway('token', business, async (...args) => {
      attempts++
      assert.equal(args[1].method, 'GET')
      return fake(...args)
    })
    await assert.rejects(gateway.get(saleId),
      err => err instanceof ApiTransportError && !err.outcomeUnknown)
    assert.equal(attempts, 1)
  }
})

test('T09-A mensajes 401/403/404/timeout conservan semántica de consulta', () => {
  assert.match(salesReadErrorMessage(new ApiHttpError(401, 'expired')), /sesión/i)
  assert.match(salesReadErrorMessage(new ApiHttpError(403, 'denied')), /permiso/i)
  assert.match(salesReadErrorMessage(new ApiHttpError(404, 'missing')), /no existe/i)
  assert.match(salesReadErrorMessage(new ApiTransportError('timeout', false)), /tiempo/i)
})
