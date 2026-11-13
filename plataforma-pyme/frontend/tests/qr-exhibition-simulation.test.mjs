import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiTransportError } from '../src/api/httpClient.ts'
import { createQrIntentGateway } from '../src/features/payments/qrIntentGateway.ts'

const business = 'e5a347a3-d8e9-4a1a-9f51-72b1b2539c67'
const intentId = 'a49e944c-e8f9-4794-b2c1-8c5524c1bbd6'
const saleId = 'fb794b12-8326-4f37-ab62-7d6b6b7297f3'
const itemId = '74f29998-41f4-4eba-b960-b1578146a9bb'
const requestId = '14401a24-37b6-47db-8986-8a048edc005a'
const eventKey = 'a8295d6a-d276-40bd-8723-9f47b8fd3812'
const reference = 'PYME-DEMO-' + 'A'.repeat(32)
const uri = '/api/v1/businesses/' + business + '/qr-payment-intents/' + intentId +
  '/exhibition-simulation'

const intent = (status = 'FINALIZADA') => ({
  id: intentId, business_id: business, location_id: null,
  request_id: requestId, provider: 'MOCK_QA', status,
  sale_id: status === 'FINALIZADA' ? saleId : null,
  currency: 'ARS', reference, subtotal_cents: 14000,
  discount_cents: 2000, total_cents: 12000,
  notes: 'Simulación', created_at: '2026-11-12T17:00:00Z',
  expires_at: '2026-11-12T17:15:00Z',
  qr_png_data_uri: 'data:image/png;base64,aGVsbG8=',
  lines: [{
    line_number: 1, catalog_item_id: itemId,
    description_snapshot: 'Servicio original', sku_snapshot: '',
    kind_snapshot: 'SERVICIO', unit_snapshot: 'SERVICIO',
    quantity_milli: 2000, unit_price_cents: 7000,
    line_total_cents: 14000,
  }],
})
const sale = () => ({
  id: saleId, business_id: business, location_id: null,
  request_id: 'ea36e34b-5b87-4148-ac76-14ca53f91b9a',
  status: 'CONFIRMADA', subtotal_cents: 14000,
  discount_cents: 2000, total_cents: 12000,
  notes: 'Simulación', created_by_id: '09bcf3e7-2134-4201-8a9a-7ea0b13e24cd',
  created_at: '2026-11-12T17:02:00Z', balances_after: [],
  lines: [{
    id: '29aeb62f-e1bf-46c4-98a9-5228c9e8dc02',
    line_number: 1, catalog_item_id: itemId,
    description_snapshot: 'Servicio original', kind_snapshot: 'SERVICIO',
    unit_snapshot: 'SERVICIO', sku_snapshot: '',
    quantity_milli: 2000, unit_price_cents: 7000,
    line_total_cents: 14000,
  }],
  payments: [{
    id: '17cd03f6-d9a3-4f09-b9ba-277a48b82552',
    payment_number: 1, method: 'MERCADO_PAGO_DEMO_QA',
    amount_cents: 12000, reference,
  }],
})
const json = (payload, status=200) => new Response(JSON.stringify(payload), {
  status, headers: {'Content-Type': 'application/json'},
})

test('exhibición registra venta ficticia solo por endpoint de simulación dedicado', async () => {
  const calls = []
  const api = createQrIntentGateway('bearer-secret', business, async (url, opt) => {
    calls.push([url, opt.method, opt.headers.get('Idempotency-Key')])
    assert.equal(opt.headers.get('Authorization'), 'Bearer bearer-secret')
    assert.deepEqual(JSON.parse(opt.body), {action: 'COBRAR'})
    return json({intent: intent(), sale: sale(), replayed: false}, 201)
  })
  const out = await api.decideExhibition(intentId, 'COBRAR', eventKey)
  assert.equal(out.intent.status, 'FINALIZADA')
  assert.equal(out.sale.id, saleId)
  assert.deepEqual(calls, [[uri, 'POST', eventKey]])
})

test('rechazo sintético no adjunta venta ni comprobante', async () => {
  const api = createQrIntentGateway('bearer-secret', business, async (url, opt) => {
    assert.equal(url, uri)
    assert.deepEqual(JSON.parse(opt.body), {action: 'RECHAZAR'})
    return json({intent: intent('RECHAZADA'), sale: null, replayed: false}, 201)
  })
  const out = await api.decideExhibition(intentId, 'RECHAZAR', eventKey)
  assert.equal(out.intent.status, 'RECHAZADA')
  assert.equal(out.sale, null)
})

test('rechaza respuesta de otro tenant, un rechazo con venta y total falsificado', async () => {
  const invalid = [
    {intent: {...intent(), business_id: '713fa8a7-5c21-4c3b-9b39-ade992cf8df2'}, sale: sale(), replayed:false},
    {intent: intent('RECHAZADA'), sale: sale(), replayed:false},
    {intent: intent(), sale: {...sale(), total_cents: 12}, replayed:false},
    {intent: {...intent(), sale_id: null}, sale: sale(), replayed:false},
  ]
  for(const item of invalid) {
    const action = item.intent.status === 'RECHAZADA' ? 'RECHAZAR' : 'COBRAR'
    const api = createQrIntentGateway('token', business, async () => json(item))
    await assert.rejects(api.decideExhibition(intentId, action, eventKey), ApiTransportError)
  }
})
