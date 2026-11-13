import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiTransportError } from '../src/api/httpClient.ts'
import { createQrIntentGateway, parseQrIntent } from '../src/features/payments/qrIntentGateway.ts'
import { parseSaleReceipt } from '../src/features/sales/realSalesReadGateway.ts'

const business = 'e5a347a3-d8e9-4a1a-9f51-72b1b2539c67'
const intentId = 'a49e944c-e8f9-4794-b2c1-8c5524c1bbd6'
const saleId = 'fb794b12-8326-4f37-ab62-7d6b6b7297f3'
const itemId = '74f29998-41f4-4eba-b960-b1578146a9bb'
const requestId = '14401a24-37b6-47db-8986-8a048edc005a'
const lineId = '29aeb62f-e1bf-46c4-98a9-5228c9e8dc02'
const paymentId = '17cd03f6-d9a3-4f09-b9ba-277a48b82552'
const reference = 'PYME-DEMO-' + 'A'.repeat(32)
const path = '/api/v1/businesses/' + business + '/qr-payment-intents/' + intentId
const intent = () => ({
  id:intentId,business_id:business,location_id:null,request_id:requestId,
  provider:'MOCK_QA',status:'FINALIZADA',sale_id:saleId,currency:'ARS',
  reference,subtotal_cents:14000,discount_cents:2000,total_cents:12000,
  notes:'Venta QA',created_at:'2026-11-12T17:00:00Z',
  expires_at:'2026-11-12T17:15:00Z',
  qr_png_data_uri:'data:image/png;base64,aGVsbG8=',
  lines:[{line_number:1,catalog_item_id:itemId,description_snapshot:'Servicio original',
    sku_snapshot:'SERV-1',kind_snapshot:'SERVICIO',unit_snapshot:'SERVICIO',
    quantity_milli:2000,unit_price_cents:7000,line_total_cents:14000}],
})
const sale = () => ({
  id:saleId,business_id:business,location_id:null,
  request_id:'ea36e34b-5b87-4148-ac76-14ca53f91b9a',
  status:'CONFIRMADA',subtotal_cents:14000,discount_cents:2000,total_cents:12000,
  notes:'Venta QA',created_by_id:'09bcf3e7-2134-4201-8a9a-7ea0b13e24cd',
  created_at:'2026-11-12T17:02:00Z',balances_after:[],
  lines:[{
    id:lineId,line_number:1,catalog_item_id:itemId,description_snapshot:'Servicio original',
    kind_snapshot:'SERVICIO',unit_snapshot:'SERVICIO',sku_snapshot:'SERV-1',
    quantity_milli:2000,unit_price_cents:7000,line_total_cents:14000,
  }],
  payments:[{id:paymentId,payment_number:1,method:'MERCADO_PAGO_DEMO_QA',
    amount_cents:12000,reference}],
})
const json = (v,status=200)=>new Response(JSON.stringify(v),{
  status,headers:{'Content-Type':'application/json'},
})

test('B4 cierre POST QR único, nunca ruta /sales ni método declarado',async()=>{
  const urls=[]
  const api=createQrIntentGateway('token QA',business,async(url,options)=>{
    urls.push([url,options.method])
    assert.equal(url,path+'/finalize-demo')
    assert.equal(options.headers.get('Authorization'),'Bearer token QA')
    assert.equal(options.method,'POST')
    assert.equal(options.body,undefined)
    return json({intent:intent(),sale:sale(),replayed:false},201)
  })
  const result=await api.finalize(intentId)
  assert.equal(result.intent.status,'FINALIZADA')
  assert.equal(result.sale.id,saleId)
  assert.equal(result.sale.payments[0].method,'MERCADO_PAGO_DEMO_QA')
  assert.deepEqual(urls,[[path+'/finalize-demo','POST']])
})

test('B4 comprobante READ de QR usa GET sin modificar stock',async()=>{
  const api=createQrIntentGateway('token',business,async(url,options)=>{
    assert.equal(url,path+'/receipt')
    assert.equal(options.method,'GET')
    return json(sale())
  })
  const result=await api.receipt(intentId)
  assert.equal(result.request_id,sale().request_id)
  assert.equal(parseSaleReceipt(result,business).total_cents,12000)
})

test('B4 fail closed: venta y QR no coincidentes no se presentan como confirmados',async()=>{
  const mismatches=[
    {intent:{...intent(),sale_id:null},sale:sale(),replayed:false},
    {intent:intent(),sale:{...sale(),total_cents:9999},replayed:false},
    {intent:intent(),sale:{...sale(),payments:[{...sale().payments[0],method:'MERCADO_PAGO_DECLARADO'}]},replayed:false},
    {intent:intent(),sale:{...sale(),payments:[{...sale().payments[0],reference:'OTRO'}]},replayed:false},
    {intent:intent(),sale:{...sale(),lines:[{...sale().lines[0],description_snapshot:'Alterado'}]},replayed:false},
  ]
  for(const response of mismatches){
    const api=createQrIntentGateway('token',business,async()=>json(response,201))
    await assert.rejects(api.finalize(intentId),err=>
      err instanceof ApiTransportError && err.outcomeUnknown)
  }
})

test('B4 cobro DEMO no se puede enviar por el canal declarado de ventas',()=>{
  const receipt=parseSaleReceipt(sale(),business)
  assert.equal(receipt.payments[0].method,'MERCADO_PAGO_DEMO_QA')
  assert.throws(()=>parseQrIntent({...intent(),status:'APROBADA_DEMO'},business),ApiTransportError)
})

test('B4 pérdida de red en cierre deja resultado incierto para recuperación GET',async()=>{
  let calls=0
  const api=createQrIntentGateway('token',business,async()=>{calls++;throw new TypeError('network down')})
  await assert.rejects(api.finalize(intentId),err=>
    err instanceof ApiTransportError && err.outcomeUnknown)
  assert.equal(calls,1)
})
