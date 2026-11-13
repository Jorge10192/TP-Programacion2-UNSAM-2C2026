import test from 'node:test'
import assert from 'node:assert/strict'

import {
  newQrPending, qrPendingScope, parseQrPending,
  qrIntentMatchesPending, createQrPendingJournal, QrPendingConflict,
} from '../src/features/payments/qrPendingJournal.ts'

const actor = 'e10df64f-672d-41bd-8af6-34aec404fede'
const business = '6a940fae-5c3d-4eea-b155-e3b19426ff6f'
const other = '3da930ca-ef1a-4d11-8763-b2f96814733f'
const key = 'aa4727c2-a6b0-4755-92e2-ed4f2d09a2d2'
const item = '9594e884-8b48-43ce-9fd8-a4bd37959da5'
const id = '2f25d9eb-3328-4d6e-8d9d-a536c6d9b13d'
const body = () => ({
  location_id:null,notes:'Servicio de prueba',discount_cents:300,
  lines:[{catalog_item_id:item,quantity_milli:2000,unit_price_cents:1500}],
})
const receipt = () => ({
  id, business_id:business, location_id:null, request_id:key,
  provider:'MOCK_QA',status:'ESPERANDO_PAGO',currency:'ARS',
  reference:'PYME-DEMO-'+'A'.repeat(32),
  subtotal_cents:3000,discount_cents:300,total_cents:2700,
  notes:'Servicio de prueba',created_at:'2026-11-12T17:00:00Z',
  expires_at:'2026-11-12T17:15:00Z',
  qr_png_data_uri:'data:image/png;base64,aGVsbG8=',
  lines:[{line_number:1,catalog_item_id:item,description_snapshot:'Servicio',
    sku_snapshot:'',kind_snapshot:'SERVICIO',unit_snapshot:'SERVICIO',
    quantity_milli:2000,unit_price_cents:1500,line_total_cents:3000}],
})
function fakePort() {
  const values=new Map()
  let unavailable=false
  return {values,
    disable(v){unavailable=v},
    port:{
      async read(scope){if(unavailable)throw new Error('storage unavailable');return structuredClone(values.get(scope))},
      async reserve(row){if(unavailable)throw new Error('storage unavailable');
        const old=values.get(row.scope)
        if(old && JSON.stringify(old)!==JSON.stringify(row))throw new QrPendingConflict()
        values.set(row.scope,structuredClone(row))},
      async remove(scope,ref){if(unavailable)throw new Error('storage unavailable');
        if(values.get(scope)?.key!==ref)throw new QrPendingConflict()
        values.delete(scope)},
    },
  }
}
test('B3 QR se guarda con clave y cuerpo antes de POST, separado por empresa y actor',async()=>{
  const {port}=fakePort(),journal=createQrPendingJournal(port)
  const pending=newQrPending(actor,business,body(),key)
  assert.deepEqual(await journal.reserve(pending),pending)
  assert.deepEqual(await createQrPendingJournal(port).load(pending.scope),pending)
  assert.equal(await journal.load(qrPendingScope(actor,other)),null)
  assert.equal(pending.kind,'qr.create')
  assert.equal(JSON.stringify(pending).includes('Bearer'),false)
  assert.equal(JSON.stringify(pending).includes('access_token'),false)
})
test('B3 no acepta cambio de solicitud ni manipulación de journal original',async()=>{
  const {port,values}=fakePort(),journal=createQrPendingJournal(port)
  const p=newQrPending(actor,business,body(),key)
  await journal.reserve(p)
  await assert.rejects(journal.reserve({...p,key:'0441c7b0-1d38-4f82-b563-c95ee389ab42'}),QrPendingConflict)
  values.set(p.scope,{...p,body:{...p.body,notes:' cambio '}})
  await assert.rejects(journal.load(p.scope),QrPendingConflict)
  values.set(p.scope,{...p,businessId:other})
  await assert.rejects(journal.load(p.scope),QrPendingConflict)
  values.set(p.scope,{...p,token:'secret'})
  await assert.rejects(journal.load(p.scope),QrPendingConflict)
  assert.throws(()=>parseQrPending({...p,kind:'sale.create'},p.scope),QrPendingConflict)
})
test('B3 solo borra intento cuando comprobante coincide en tenant, clave, importe y líneas',async()=>{
  const {port}=fakePort(),journal=createQrPendingJournal(port)
  const p=newQrPending(actor,business,body(),key)
  await journal.reserve(p)
  for(const wrong of [
    {...receipt(),business_id:other},
    {...receipt(),request_id:'0441c7b0-1d38-4f82-b563-c95ee389ab42'},
    {...receipt(),total_cents:3000},
    {...receipt(),lines:[{...receipt().lines[0],unit_price_cents:5000}]},
  ]) {
    assert.equal(qrIntentMatchesPending(p,wrong),false)
    await assert.rejects(journal.close(p,wrong),QrPendingConflict)
  }
  assert.deepEqual(await journal.load(p.scope),p)
  await journal.close(p,receipt())
  assert.equal(await journal.load(p.scope),null)
})
test('B3 un almacenamiento inaccesible bloquea el POST; no hay degradación a memoria',async()=>{
  const {port,disable}=fakePort(),journal=createQrPendingJournal(port)
  const p=newQrPending(actor,business,body(),key)
  disable(true)
  await assert.rejects(journal.reserve(p))
  await assert.rejects(journal.load(p.scope))
})


test('E3-3F descarte del QR obsoleto elimina solo su mismo actor, empresa y clave', async () => {
  const {port,values}=fakePort(),journal=createQrPendingJournal(port)
  const first=newQrPending(actor,business,body(),key)
  await journal.reserve(first)
  await journal.discardAbsent(first)
  assert.equal(await journal.load(first.scope),null)

  // Si otra pestaña guardó otra solicitud, nunca se puede borrar por error.
  const next=newQrPending(actor,business,body(),'50fa6971-2a25-44a9-87f9-ef19b4cde1f7')
  await journal.reserve(next)
  await assert.rejects(journal.discardAbsent(first),QrPendingConflict)
  assert.deepEqual(await journal.load(first.scope),next)
  assert.equal(values.size,1)
})

test('E3-3F no se descarta journal adulterado ni almacenamiento inaccesible', async () => {
  const {port,values,disable}=fakePort(),journal=createQrPendingJournal(port)
  const original=newQrPending(actor,business,body(),key)
  await journal.reserve(original)
  values.set(original.scope,{...original,body:{...original.body,notes:'adulterado'}})
  await assert.rejects(journal.discardAbsent(original),QrPendingConflict)
  values.set(original.scope,structuredClone(original))
  disable(true)
  await assert.rejects(journal.discardAbsent(original))
})
