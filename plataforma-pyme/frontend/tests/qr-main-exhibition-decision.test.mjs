import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ApiTransportError } from '../src/api/httpClient.ts'
import { createQrIntentGateway } from '../src/features/payments/qrIntentGateway.ts'

const read = file => readFileSync(new URL(file, import.meta.url), 'utf8')
const bid = 'e5a347a3-d8e9-4a1a-9f51-72b1b2539c67'
const id = 'a49e944c-e8f9-4794-b2c1-8c5524c1bbd6'
const requestId = '14401a24-37b6-47db-8986-8a048edc005a'
const item = '74f29998-41f4-4eba-b960-b1578146a9bb'
const reference = 'PYME-DEMO-' + 'A'.repeat(32)
const url = '/api/v1/businesses/'+bid+'/qr-payment-intents/'+id+'/exhibition-decision'
const qr = status => ({
  id, business_id:bid,location_id:null,request_id:requestId,
  provider:'MOCK_QA',status,currency:'ARS',reference,
  subtotal_cents:12000,discount_cents:2000,total_cents:10000,
  notes:'Demo',created_at:'2026-11-12T17:00:00Z',
  expires_at:'2026-11-12T17:15:00Z',
  qr_png_data_uri:'data:image/png;base64,aGVsbG8=',sale_id:null,
  lines:[{
    line_number:1,catalog_item_id:item,description_snapshot:'Producto',
    sku_snapshot:'',kind_snapshot:'SERVICIO',unit_snapshot:'SERVICIO',
    quantity_milli:1000,unit_price_cents:12000,line_total_cents:12000,
  }],
})
const json = (value,status=201) => new Response(JSON.stringify(value),{
  status,headers:{'Content-Type':'application/json'},
})

test('E3-3E: QR principal conserva la imagen y agrega exactamente dos decisiones ficticias',()=>{
  const ui=read('../src/features/payments/RealQrIntentPage.tsx')
  assert.match(ui, /<img src=\{intent\.qr_png_data_uri\} alt="QR sintético de exhibición, no pagable y sin proveedor financiero"/)
  assert.match(ui, /Simular cobro aprobado/)
  assert.match(ui, /Simular rechazo/)
  assert.match(ui, /EXHIBITION_UI && isManager/)
  assert.match(ui, /api\.simulateExhibition\(/)
  assert.doesNotMatch(ui, /EXHIBITION_SIMULATION_UI/)
})

test('E3-3E: aceptación ficticia usa un solo POST autenticado con clave idempotente', async()=>{
  const api=createQrIntentGateway('token-opaco',bid,async(path,options)=>{
    assert.equal(path,url)
    assert.equal(options.method,'POST')
    assert.equal(options.headers.get('Idempotency-Key'),requestId)
    assert.equal(options.headers.get('Authorization'),'Bearer token-opaco')
    assert.deepEqual(JSON.parse(options.body),{action:'APROBAR'})
    return json(qr('APROBADA_DEMO'))
  })
  const result=await api.simulateExhibition(id,'APROBAR',requestId)
  assert.equal(result.status,'APROBADA_DEMO')
  assert.equal(result.qr_png_data_uri,qr('APROBADA_DEMO').qr_png_data_uri)
  assert.equal(result.sale_id,null)
})

test('E3-3E: rechazo no permite venta ni respuesta alterada',async()=>{
  const api=createQrIntentGateway('token-opaco',bid,async()=>json(qr('RECHAZADA')))
  const response=await api.simulateExhibition(id,'RECHAZAR',requestId)
  assert.equal(response.status,'RECHAZADA')
  assert.equal(response.sale_id,null)
  assert.throws(()=>api.simulateExhibition(id,'EXPIRAR',requestId),TypeError)
  for(const invalid of [
    {...qr('APROBADA_DEMO'),sale_id:'fb794b12-8326-4f37-ab62-7d6b6b7297f3'},
    qr('ESPERANDO_PAGO'),
    {...qr('APROBADA_DEMO'),business_id:'713fa8a7-5c21-4c3b-9b39-ade992cf8df2'},
  ]) {
    const bad=createQrIntentGateway('token',bid,async()=>json(invalid))
    await assert.rejects(bad.simulateExhibition(id,'APROBAR',requestId),ApiTransportError)
  }
})
