import test from 'node:test'
import assert from 'node:assert/strict'

import { ApiTransportError } from '../src/api/httpClient.ts'
import {
  createQrIntentGateway, makeQrIntentCommand, parseQrIntent,
} from '../src/features/payments/qrIntentGateway.ts'
import { realWorkspaceBusinessId, realWorkspaceTitle } from '../src/features/auth/realWorkspaceNavigation.ts'

const business = 'e5a347a3-d8e9-4a1a-9f51-72b1b2539c67'
const other = '713fa8a7-5c21-4c3b-9b39-ade992cf8df2'
const intentId = 'a49e944c-e8f9-4794-b2c1-8c5524c1bbd6'
const item = '74f29998-41f4-4eba-b960-b1578146a9bb'
const key = '14401a24-37b6-47db-8986-8a048edc005a'
const url = '/api/v1/businesses/' + business + '/qr-payment-intents'
const body = () => makeQrIntentCommand(null, [
  { catalog_item_id: item, quantity_milli: 2000, unit_price_cents: 2000 },
], 500, ' QR prueba ')
const result = () => ({
  id: intentId, business_id: business, location_id: null,
  request_id: key, provider: 'MOCK_QA', status: 'ESPERANDO_PAGO',
  currency: 'ARS', reference: 'PYME-DEMO-' + 'A'.repeat(32),
  subtotal_cents: 4000, discount_cents: 500, total_cents: 3500,
  notes: 'QR prueba', created_at: '2026-11-12T16:00:00+00:00',
  expires_at: '2026-11-12T16:15:00+00:00',
  qr_png_data_uri: 'data:image/png;base64,aGVsbG8=',
  lines: [{
    line_number: 1, catalog_item_id: item,
    description_snapshot: 'Artículo', sku_snapshot: '',
    kind_snapshot: 'SERVICIO', unit_snapshot: 'SERVICIO',
    quantity_milli: 2000, unit_price_cents: 2000, line_total_cents: 4000,
  }],
})
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
})

test('B2 QR es alternativa a pagos declarados: snapshot exacto y notas normalizadas', () => {
  const request = body()
  assert.equal(request.location_id, null)
  assert.equal(request.discount_cents, 500)
  assert.equal(request.notes, 'QR prueba')
  assert.equal(request.lines.length, 1)
  assert.equal('payments' in request, false)
  assert.throws(() => makeQrIntentCommand(null, [...request.lines,...request.lines],0,''), RangeError)
  assert.throws(() => makeQrIntentCommand(null, request.lines,5000,''), RangeError)
})

test('POST QR añade Bearer, Idempotency-Key y cuerpo; NO llama /sales', async () => {
  const calls = []
  const api = createQrIntentGateway('token-b2', business, async (u, opts) => {
    calls.push(String(u))
    assert.equal(u, url)
    assert.equal(opts.method, 'POST')
    assert.equal(opts.headers.get('Authorization'), 'Bearer token-b2')
    assert.equal(opts.headers.get('Idempotency-Key'), key)
    assert.deepEqual(JSON.parse(opts.body), body())
    return json(result(), 201)
  })
  assert.equal((await api.create(body(), key)).total_cents, 3500)
  assert.deepEqual(calls, [url])
})

test('GET de QR original y por-request, cancelación explícita, sin POST ventas', async () => {
  const urls = []
  const api = createQrIntentGateway('token', business, async (u, options) => {
    urls.push([u, options.method])
    if (String(u).endsWith('/cancel')) return json({ ...result(), status: 'CANCELADA' })
    return json(result())
  })
  assert.equal((await api.get(intentId)).id, intentId)
  assert.equal((await api.byRequest(key)).request_id, key)
  assert.equal((await api.cancel(intentId)).status, 'CANCELADA')
  assert.deepEqual(urls, [
    [url + '/' + intentId, 'GET'],
    [url + '/by-request/' + key, 'GET'],
    [url + '/' + intentId + '/cancel', 'POST'],
  ])
})

test('respuesta ajena, importes falsos, QR externo o estado inválido fallan cerrado', () => {
  assert.throws(() => parseQrIntent({ ...result(), business_id: other }, business), ApiTransportError)
  assert.throws(() => parseQrIntent({ ...result(), total_cents: 9999 }, business), ApiTransportError)
  assert.throws(() => parseQrIntent({ ...result(), qr_png_data_uri: 'https://otro-dominio/qr.png' }, business), ApiTransportError)
  assert.throws(() => parseQrIntent({ ...result(), status: 'PAGADO' }, business), ApiTransportError)
  assert.throws(() => parseQrIntent({ ...result(), lines: [{ ...result().lines[0], line_total_cents: 1 }] }, business), ApiTransportError)
})

test('pantalla QR pertenece a negocio y es recuperable tras refresh/login', () => {
  const path = '/real/empresas/' + business + '/qr-cobros/' + intentId
  assert.equal(realWorkspaceBusinessId(path), business)
  assert.equal(realWorkspaceTitle(path), 'Cobro QR DEMO')
  assert.equal(realWorkspaceBusinessId('/real/empresas/' + business + '/qr-cobros/otro'), null)
  assert.equal(realWorkspaceBusinessId('/real/empresas/' + other + '/qr-cobros/' + intentId), other)
})
