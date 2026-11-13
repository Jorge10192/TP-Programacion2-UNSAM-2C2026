import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiTransportError } from '../src/api/httpClient.ts'
import { createQrIntentGateway } from '../src/features/payments/qrIntentGateway.ts'

const business = 'e5a347a3-d8e9-4a1a-9f51-72b1b2539c67'
const other = '713fa8a7-5c21-4c3b-9b39-ade992cf8df2'
const intentId = 'a49e944c-e8f9-4794-b2c1-8c5524c1bbd6'
const itemId = '74f29998-41f4-4eba-b960-b1578146a9bb'
const key = '14401a24-37b6-47db-8986-8a048edc005a'
const path = '/api/v1/businesses/' + business + '/qr-payment-intents/' + intentId
const result = () => ({
  id:intentId,business_id:business,location_id:null,request_id:key,
  provider:'MOCK_QA',status:'APROBADA_DEMO',currency:'ARS',
  reference:'PYME-DEMO-' + 'A'.repeat(32),subtotal_cents:12000,discount_cents:2000,
  total_cents:10000,notes:'',created_at:'2026-11-12T17:00:00Z',
  expires_at:'2026-11-12T17:15:00Z',qr_png_data_uri:'data:image/png;base64,aGVsbG8=',
  lines:[{line_number:1,catalog_item_id:itemId,description_snapshot:'Servicio',
    sku_snapshot:'',kind_snapshot:'SERVICIO',unit_snapshot:'SERVICIO',
    quantity_milli:1000,unit_price_cents:12000,line_total_cents:12000}],
})
const event = (sequence, action, from_status, to_status) => ({
  id:sequence === 1 ? '1fc2f9ad-cc59-42a1-9e4b-1e6c69b73c14' : 'bca20414-ed8a-4ca8-9df2-005fb3c991c8',
  business_id:business,intent_id:intentId,event_key:key,sequence,action,
  from_status,to_status,actor_id:'6e8b8f0f-eeb1-4d07-9b87-dc003b223b74',
  created_at:'2026-11-12T17:01:00Z',
})
const json = (data, status=200) => new Response(JSON.stringify(data), {
  status, headers:{'Content-Type':'application/json'},
})

test('B3 simular solo hace POST al laboratorio, con key UUID4 y token Bearer', async () => {
  let count=0
  const api = createQrIntentGateway('token-qa', business, async (url, opts) => {
    ++count
    assert.equal(url, path + '/simulate')
    assert.equal(opts.method, 'POST')
    assert.equal(opts.headers.get('Idempotency-Key'), key)
    assert.equal(opts.headers.get('Authorization'), 'Bearer token-qa')
    assert.deepEqual(JSON.parse(opts.body), {action:'APROBAR'})
    return json(result(), 201)
  })
  assert.equal((await api.simulate(intentId, 'APROBAR', key)).status, 'APROBADA_DEMO')
  assert.equal(count,1)
  assert.throws(() => api.simulate(intentId, 'APROBAR', 'no-uuid'), TypeError)
  assert.throws(() => api.simulate(intentId, 'PAGAR', key), TypeError)
  assert.equal(count,1)
})

test('B3 GET eventos valida orden, actor y tenant antes de mostrar auditoría', async () => {
  const events = [event(1,'CREAR','SIN_ESTADO','ESPERANDO_PAGO'),
    event(2,'APROBAR','ESPERANDO_PAGO','APROBADA_DEMO')]
  const api=createQrIntentGateway('token-qa', business, async (url, opts)=>{
    assert.equal(url, path + '/events')
    assert.equal(opts.method,'GET')
    return json(events)
  })
  assert.deepEqual((await api.events(intentId)).map(x=>x.sequence),[1,2])
  const wrong=createQrIntentGateway('token-qa',business,
    async()=>json(events.map(x=>({...x,business_id:other}))))
  await assert.rejects(wrong.events(intentId), ApiTransportError)
  const wrongOrder=createQrIntentGateway('token-qa',business,
    async()=>json([events[1],events[0]]))
  await assert.rejects(wrongOrder.events(intentId), ApiTransportError)
})

test('B3 fallo de red no reintenta eventos automáticamente', async () => {
  let count=0
  const api = createQrIntentGateway('token',business,async()=>{
    ++count
    throw new TypeError('network down')
  })
  await assert.rejects(api.simulate(intentId,'RECHAZAR',key),
    err=>err instanceof ApiTransportError && err.outcomeUnknown)
  assert.equal(count,1)
})
