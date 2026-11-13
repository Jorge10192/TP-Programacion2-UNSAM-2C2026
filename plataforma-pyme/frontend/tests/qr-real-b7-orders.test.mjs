import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiTransportError } from '../src/api/httpClient.ts'
import { createMpOfficialTestGateway, parseMpSharedQaOrder, parseMpSharedQaConnection } from '../src/features/payments/mpOfficialTestGateway.ts'

const business='e5a347a3-d8e9-4a1a-9f51-72b1b2539c67'
const foreign='713fa8a7-5c21-4c3b-9b39-ade992cf8df2'
const source='a49e944c-e8f9-4794-b2c1-8c5524c1bbd6'
const id='fb794b12-8326-4f37-ab62-7d6b6b7297f3'
const sale='23c3eb3f-0e72-4c9c-b6a8-7c300d7e727e'
const key='14401a24-37b6-47db-8986-8a048edc005a'
const root='/api/v1/businesses/'+business+'/mercadopago/qa-shared'
const conn=()=>({
  business_id:business,enabled:true,virtual_link:true,status:'DISPONIBLE_QA',
  mp_user_id:'3837129107',store_id:'89968780',pos_id:'140776986',
  external_pos_id:'PYMEQA001POS001',
  qr_png_data_uri:'data:image/png;base64,aGVsbG8=',
  orders_integrated:true,remote_verified:false,sandbox_only:true,
})
const order=(status='CREADA')=>({
  id,business_id:business,source_intent_id:source,
  provider_order_id:'ORD01K371WBFDS4MD9JG0K8ZMECBE',
  status,provider_status_detail:status==='CREADA'?'created':'accredited',
  external_reference:'PYME'+'A'.repeat(32),total_cents:3500,
  created_at:'2026-11-13T20:00:00Z',
  qr_png_data_uri:status==='CREADA'?'data:image/png;base64,aGVsbG8=':null,
  test_only:true,sale_registered:false,sale_id:null,shared_box:true,
})
const json=(value,status=200)=>new Response(JSON.stringify(value),{
  status,headers:{'Content-Type':'application/json'},
})

test('B7-B conexión QA admite órdenes activadas sin divulgar claves',()=>{
  assert.equal(parseMpSharedQaConnection(conn(),business).orders_integrated,true)
  assert.throws(()=>parseMpSharedQaConnection({...conn(),business_id:foreign},business),ApiTransportError)
  assert.throws(()=>parseMpSharedQaConnection({...conn(),qr_png_data_uri:'https://evil'},business),ApiTransportError)
})

test('B7-B Orders static: POST sin body, clave estable y GET tras F5',async()=>{
  const calls=[]
  const api=createMpOfficialTestGateway('token-opaco',business,async(url,opt)=>{
    calls.push([url,opt.method,opt.headers.get('Idempotency-Key')])
    assert.equal(opt.body,undefined)
    if(url===root+'/orders/from-qr/'+source)return json(order(),201)
    if(url===root+'/orders/for-qr/'+source)return json(order())
    throw Error('ruta inesperada')
  })
  assert.equal((await api.sharedCreate(source,key)).shared_box,true)
  assert.equal((await api.sharedBySource(source)).id,id)
  assert.deepEqual(calls,[
    [root+'/orders/from-qr/'+source,'POST',key],
    [root+'/orders/for-qr/'+source,'GET',null],
  ])
  assert.throws(()=>api.sharedCreate(source,'clave-nueva'),TypeError)
})

test('B7-B verificar/cancelar/cerrar usa rutas diferentes y nunca importe de navegador',async()=>{
  const calls=[]
  const api=createMpOfficialTestGateway('token',business,async(url,opt)=>{
    calls.push([url,opt.method])
    if(url.endsWith('/reconcile'))return json(order('PROCESADA'))
    if(url.endsWith('/cancel'))return json(order('CANCELADA'))
    if(url.endsWith('/settle-qa'))return json({
      order:{...order('PROCESADA'),sale_registered:true,sale_id:sale},
      sale_id:sale,replayed:false,
    })
    throw Error('ruta inesperada')
  })
  assert.equal((await api.sharedReconcile(id)).status,'PROCESADA')
  assert.equal((await api.sharedCancel(id)).status,'CANCELADA')
  assert.equal((await api.sharedSettle(id)).sale_id,sale)
  assert.deepEqual(calls,[
    [root+'/orders/'+id+'/reconcile','POST'],
    [root+'/orders/'+id+'/cancel','POST'],
    [root+'/orders/'+id+'/settle-qa','POST'],
  ])
  assert.throws(()=>parseMpSharedQaOrder({...order(),shared_box:false},business),ApiTransportError)
  assert.throws(()=>parseMpSharedQaOrder({...order(),business_id:foreign},business),ApiTransportError)
  assert.throws(()=>parseMpSharedQaOrder({...order(),status:'CREADA',qr_png_data_uri:null},business),ApiTransportError)
})
