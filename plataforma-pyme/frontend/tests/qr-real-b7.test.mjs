import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiTransportError } from '../src/api/httpClient.ts'
import { createMpOfficialTestGateway, parseMpSharedQaConnection } from '../src/features/payments/mpOfficialTestGateway.ts'

const bid='e5a347a3-d8e9-4a1a-9f51-72b1b2539c67'
const data=()=>({
  business_id:bid,enabled:true,virtual_link:true,status:'DISPONIBLE_QA',
  mp_user_id:'3837129107',store_id:'89968780',pos_id:'140776986',
  external_pos_id:'PYMEQA001POS001',qr_png_data_uri:'data:image/png;base64,aGVsbG8=',
  orders_integrated:false,remote_verified:false,sandbox_only:true,
})

test('B7 lee caja fija por GET autenticado y no envía credenciales ni escribe recursos', async()=>{
  const api=createMpOfficialTestGateway('opaque-token',bid,async(url,opt)=>{
    assert.equal(url,'/api/v1/businesses/'+bid+'/mercadopago/qa-shared/connection')
    assert.equal(opt.method,'GET')
    assert.equal(opt.headers.get('Authorization'),'Bearer opaque-token')
    assert.equal(opt.body,undefined)
    return new Response(JSON.stringify(data()),{status:200,headers:{'Content-Type':'application/json'}})
  })
  const result=await api.sharedConnection()
  assert.equal(result.pos_id,'140776986')
  assert.equal(result.orders_integrated,false)
})

test('B7 rechaza QR falso, otro POS o estado de pago atribuido a esta vista',()=>{
  for(const invalid of [
    {...data(),pos_id:'otro'},
    {...data(),business_id:'713fa8a7-5c21-4c3b-9b39-ade992cf8df2'},
    {...data(),qr_png_data_uri:'https://otro-sitio.example/falso.png'},
    {...data(),orders_integrated:true},
    {...data(),virtual_link:false},
    {...data(),remote_verified:true},
  ]) assert.throws(()=>parseMpSharedQaConnection(invalid,bid),ApiTransportError)
})
