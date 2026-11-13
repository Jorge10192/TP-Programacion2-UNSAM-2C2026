import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiTransportError } from '../src/api/httpClient.ts'
import {
  createMpOfficialTestGateway, parseMpTestOrder, parseMpTestConnection,
} from '../src/features/payments/mpOfficialTestGateway.ts'

const business='e5a347a3-d8e9-4a1a-9f51-72b1b2539c67'
const foreign='713fa8a7-5c21-4c3b-9b39-ade992cf8df2'
const source='a49e944c-e8f9-4794-b2c1-8c5524c1bbd6'
const id='fb794b12-8326-4f37-ab62-7d6b6b7297f3'
const sale='23c3eb3f-0e72-4c9c-b6a8-7c300d7e727e'
const key='14401a24-37b6-47db-8986-8a048edc005a'
const root='/api/v1/businesses/'+business+'/mercadopago/official-test'
const connection=()=>({
  business_id:business,enabled:true,status:'ACTIVA',mp_user_id:'123456789',
  external_pos_id:'TESTPOS001',sandbox_only:true,
})
const order=(status='CREADA')=>({
  id,business_id:business,source_intent_id:source,
  provider_order_id:'ORD01K371WBFDS4MD9JG0K8ZMECBE',
  status,provider_status_detail:status==='CREADA'?'created':'accredited',
  external_reference:'PYME'+'A'.repeat(32),total_cents:3500,
  created_at:'2026-11-12T18:00:00Z',
  qr_png_data_uri:'data:image/png;base64,aGVsbG8=',
  test_only:true,sale_registered:false,sale_id:null,
})
const json=(value,status=200)=>new Response(JSON.stringify(value),{
  status,headers:{'Content-Type':'application/json'},
})

test('B6 conexión TEST no expone secretos ni asume cuenta activa',async()=>{
  const api=createMpOfficialTestGateway('bearer-secret',business,async(url,options)=>{
    assert.equal(url,root+'/connection')
    assert.equal(options.method,'GET')
    assert.equal(options.headers.get('Authorization'),'Bearer bearer-secret')
    return json(connection())
  })
  const connected=await api.connection()
  assert.equal(connected.sandbox_only,true)
  assert.equal(connected.status,'ACTIVA')
  assert.equal(JSON.stringify(connected).includes('access_token'),false)
  assert.throws(()=>parseMpTestConnection({...connection(),business_id:foreign},business),ApiTransportError)
})

test('B6 URL OAuth validada por host oficial, PKCE y estado CSRF',async()=>{
  const oauthURL='https://auth.mercadopago.com/authorization?response_type=code&client_id=12345&state=any-secure-state&code_challenge=challenge&code_challenge_method=S256'
  const api=createMpOfficialTestGateway('token',business,async()=>json({authorization_url:oauthURL}))
  assert.match(await api.startOAuth(),/^https:\/\/auth\.mercadopago\.com\/authorization/)
  const unsafe=createMpOfficialTestGateway('token',business,
    async()=>json({authorization_url:'https://evil.test/steal?state=s'}))
  await assert.rejects(unsafe.startOAuth(),ApiTransportError)
})

test('B6 POST Orders API envía el mismo UUID4 y jamás datos de pago del navegador',async()=>{
  const calls=[]
  const api=createMpOfficialTestGateway('token',business,async(url,opt)=>{
    calls.push([url,opt.method,opt.headers.get('Idempotency-Key')])
    assert.equal(opt.body,undefined)
    return json(order(),201)
  })
  assert.equal((await api.create(source,key)).source_intent_id,source)
  assert.deepEqual(calls,[[root+'/orders/from-qr/'+source,'POST',key]])
  assert.throws(()=>api.create(source,'nuevo'),TypeError)
})

test('B6 reconcilia provider en backend y registra venta QA sin carrito client-side',async()=>{
  let route=''
  const api=createMpOfficialTestGateway('token',business,async(url,options)=>{
    route=url
    if(url.endsWith('/reconcile')){
      assert.equal(options.method,'POST')
      return json(order('PROCESADA'))
    }
    if(url.endsWith('/settle-qa')){
      assert.equal(options.method,'POST')
      return json({order:{...order('PROCESADA'),sale_registered:true,sale_id:sale},
        sale_id:sale,replayed:false})
    }
    throw Error('Unexpected API '+url)
  })
  assert.equal((await api.reconcile(id)).status,'PROCESADA')
  assert.equal((await api.settle(id)).sale_id,sale)
  assert.ok(route.endsWith('/settle-qa'))
})

test('B6 rechaza importes, merchant y estado inventados desde servidor no fiable',()=>{
  for(const wrong of [
    {...order(),business_id:foreign},
    {...order(),status:'APROBADA_DEMO'},
    {...order(),test_only:false},
    {...order(),total_cents:3.55},
    {...order(),status:'CREADA',qr_png_data_uri:null},
    {...order(),sale_registered:true,sale_id:null},
  ])assert.throws(()=>parseMpTestOrder(wrong,business),ApiTransportError)
})

test('B6 GET por QR local después de F5, sin duplicar Orders',async()=>{
  let n=0
  const api=createMpOfficialTestGateway('token',business,async(url,options)=>{
    n++
    assert.equal(url,root+'/orders/for-qr/'+source)
    assert.equal(options.method,'GET')
    return json(order())
  })
  assert.equal((await api.bySource(source))?.id,id)
  assert.equal(n,1)
})
