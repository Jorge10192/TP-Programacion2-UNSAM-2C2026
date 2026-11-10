import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiHttpError, ApiTransportError } from '../src/api/httpClient.ts'
import {
  createAdjustmentGateway,adjustmentMilli,countedMilli,adjustmentFromCount,
  MAX_STOCK_BALANCE_MILLI,MAX_ADJUSTMENT_DELTA_MILLI,
  mayAdjustInventory,mayInitializeInventory,validateAdjustment,parseAdjustment,
} from '../src/features/inventory/realAdjustmentGateway.ts'
import {
  createAdjustmentJournal,adjustmentScope,newAdjustmentIntent,parsePendingAdjustment,
  AdjustmentJournalConflict,AdjustmentJournalUnavailable,
} from '../src/features/inventory/adjustmentPendingJournal.ts'

const business='12dd5528-f5cc-4931-bd39-f5e9da116d25'
const foreign='f50f0e1e-b247-45f4-b1b0-ac975567f8c6'
const location='80bdbe96-dc8a-4620-a934-0ca7ef743865'
const item='2cfbded7-9a52-4095-a7eb-b16a97b2cecf'
const actor='24e8f9d0-bb70-4d09-9bf3-cf912693c06a'
const other='d6a35e50-37ba-4a89-8142-3f233bf779f7'
const operation='2b568bfa-d93b-4bf0-92c8-f5b65b06acf7'
const moveId='274f31c8-ac2d-4d72-a40f-25bed4e093fe'
const key='b6e4fb1a-2052-4a40-886e-f8732b19ce10'
const body=(kind='AJUSTE_SALIDA',version=5,amount=2000)=>({
  kind,catalog_item_id:item,location_id:location,quantity_milli:amount,
  expected_version:version,reason:'Conteo fisico de inventario',
})
const receipt=(kind='AJUSTE_SALIDA',amount=2000)=>({
  id:operation,business_id:business,
  kind,catalog_item_id:item,location_id:location,quantity_milli:amount,
  reason:'Conteo fisico de inventario',actor_id:actor,unit_snapshot:'UNIDAD',
  created_at:'2026-11-10T14:00:00Z',
  movements:[{
    id:moveId,business_id:business,location_id:location,catalog_item_id:item,actor_id:actor,
    event_type:kind,delta_milli:kind==='AJUSTE_SALIDA'?-amount:amount,
    occurred_at:'2026-11-10T14:00:00Z',
    inventory_operation_id:operation,operation_kind:kind,
  }],
})
const response=(data,status=201)=>new Response(JSON.stringify(data),{
  status,headers:{'Content-Type':'application/json'},
})
function port(){
  const rows=new Map()
  return {
    rows,
    async read(scope){return rows.get(scope)},
    async reserve(row){
      const old=rows.get(row.scope)
      if(old&&JSON.stringify(old)!==JSON.stringify(row))throw new AdjustmentJournalConflict()
      rows.set(row.scope,structuredClone(row))
    },
    async remove(scope,k){
      if(rows.has(scope)&&rows.get(scope).key!==k)throw new AdjustmentJournalConflict()
      rows.delete(scope)
    },
  }
}
test('T08-4 POST envía Bearer, UUID4, cuerpo exacto con expected_version, sin reintentos',async()=>{
  let calls=0
  const fake=async(url,init)=>{
    calls++
    assert.equal(url,'/api/v1/businesses/'+business+'/inventory/adjustments')
    assert.equal(init.method,'POST')
    assert.equal(init.headers.get('Authorization'),'Bearer tokenOpaco')
    assert.equal(init.headers.get('Idempotency-Key'),key)
    assert.deepEqual(JSON.parse(init.body),body())
    assert.equal(init.credentials,'omit')
    return response(receipt())
  }
  const result=await createAdjustmentGateway('tokenOpaco',business,fake).create(body(),key)
  assert.equal(result.id,operation)
  assert.equal(result.movements[0].delta_milli,-2000)
  assert.equal(calls,1)
})
test('T08-4 replay HTTP 200 y GET por ID no modifican stock ni generan POST nuevo',async()=>{
  const calls=[]
  const fake=async(url,init)=>{calls.push({url,method:init.method});return response(receipt('AJUSTE_ENTRADA',1000),200)}
  const gateway=createAdjustmentGateway('token',business,fake)
  const got=await gateway.create(body('AJUSTE_ENTRADA',4,1000),key)
  const historical=await gateway.get(operation)
  assert.deepEqual(got,historical)
  assert.deepEqual(calls,[
    {url:'/api/v1/businesses/'+business+'/inventory/adjustments',method:'POST'},
    {url:'/api/v1/businesses/'+business+'/inventory/adjustments/'+operation,method:'GET'},
  ])
})
test('T08-4 stock inicial exige version 0; ajuste exige version positiva',()=>{
  assert.equal(validateAdjustment(body('STOCK_INICIAL',0,1000)).expected_version,0)
  assert.throws(()=>validateAdjustment(body('STOCK_INICIAL',1,1000)))
  assert.throws(()=>validateAdjustment(body('AJUSTE_ENTRADA',0,1000)))
  assert.throws(()=>validateAdjustment(body('AJUSTE_SALIDA',-1,1000)))
  for(const bad of [
    {...body(),extra:'No'},
    {...body(),quantity_milli:true},
    {...body(),quantity_milli:0},
    {...body(),quantity_milli:1.5},
    {...body(),quantity_milli:1000000000},
    {...body(),expected_version:true},
    {...body(),expected_version:1.5},
    {...body(),reason:'no'},
    {...body(),reason:'a'.repeat(501)},
    {...body(),kind:'TRASLADO'},
    {...body(),catalog_item_id:'ART-001'},
  ])assert.throws(()=>validateAdjustment(bad))
})
test('T08-4 cantidades discretas y fraccionables validan milésimas exactas sin floats',()=>{
  assert.equal(adjustmentMilli('2','UNIDAD'),2000)
  assert.equal(adjustmentMilli('0,125','GRAMO'),125)
  assert.equal(adjustmentMilli('999999,999','GRAMO'),999999999)
  for(const unit of ['UNIDAD','PAQUETE','CAJA'])assert.throws(()=>adjustmentMilli('1,125',unit))
  for(const invalid of ['','0','-1','1,0000','1.000,25','1000000','NaN','1e3']){
    assert.throws(()=>adjustmentMilli(invalid,'GRAMO'))
  }
  assert.throws(()=>adjustmentMilli('1','SERVICIO'))
})
test('T08-4 conteo físico calcula delta desde saldo real y no sobrescribe histórico',()=>{
  assert.deepEqual(adjustmentFromCount(5000,7000,5),{kind:'AJUSTE_SALIDA',quantity_milli:2000})
  assert.deepEqual(adjustmentFromCount(9000,7000,5),{kind:'AJUSTE_ENTRADA',quantity_milli:2000})
  assert.deepEqual(adjustmentFromCount(0,7000,5),{kind:'AJUSTE_SALIDA',quantity_milli:7000})
  assert.equal(adjustmentFromCount(7000,7000,5),null)
  assert.equal(countedMilli('0,000','UNIDAD'),0)
  assert.equal(countedMilli('0','UNIDAD'),0)
  assert.throws(()=>adjustmentFromCount(0,0,0))
})
test('T08-4 permisos reales: inicial titular/admin; ajustes encargado asignado; trabajador denegado',()=>{
  assert.equal(mayInitializeInventory('TITULAR_ADMINISTRATIVO','ACTIVA','ACTIVA'),true)
  assert.equal(mayInitializeInventory('ADMINISTRADOR','ACTIVA','ACTIVA'),true)
  assert.equal(mayInitializeInventory('ENCARGADO','ACTIVA','ACTIVA'),false)
  assert.equal(mayAdjustInventory('ENCARGADO','ACTIVA','ACTIVA'),true)
  assert.equal(mayAdjustInventory('TRABAJADOR','ACTIVA','ACTIVA'),false)
  assert.equal(mayAdjustInventory('ADMINISTRADOR','INACTIVA','ACTIVA'),false)
  assert.equal(mayAdjustInventory('ADMINISTRADOR','ACTIVA','SUSPENDIDA'),false)
})
test('T08-4 respuesta estricta rechaza movimiento alterado, tenant ajeno y signo invertido',()=>{
  for(const fake of [
    {...receipt(),business_id:foreign},
    {...receipt(),movements:[]},
    {...receipt(),movements:[{...receipt().movements[0],delta_milli:2000}]},
    {...receipt(),movements:[{...receipt().movements[0],event_type:'COMPRA_RECEPCION'}]},
    {...receipt(),movements:[{...receipt().movements[0],inventory_operation_id:location}]},
    {...receipt(),movements:[{...receipt().movements[0],actor_id:other}]},
    {...receipt(),movements:[{...receipt().movements[0],location_id:foreign}]},
    {...receipt(),unit_snapshot:'SERVICIO'},
  ])assert.throws(()=>parseAdjustment(fake,business),
    e=>e instanceof ApiTransportError&&e.reason==='invalid-response'&&!e.outcomeUnknown)
})
test('T08-4 409 obsoleta, 403, 404 y 422 conservan error HTTP sin fallback DEMO',async()=>{
  for(const status of [401,403,404,409,422]){
    let calls=0
    const fake=async()=>{calls++;return response({detail:'rechazado'},status)}
    await assert.rejects(createAdjustmentGateway('token',business,fake).create(body(),key),
      e=>e instanceof ApiHttpError&&e.status===status)
    assert.equal(calls,1)
  }
})
test('T08-4 respuesta POST inválida o fallo de conexión conserva resultado incierto',async()=>{
  let calls=0
  const invalid=async()=>{calls++;return response({...receipt(),movements:[]})}
  await assert.rejects(createAdjustmentGateway('token',business,invalid).create(body(),key),
    e=>e instanceof ApiTransportError&&e.outcomeUnknown)
  assert.equal(calls,1)
  const network=async()=>{calls++;throw new Error('desconectado')}
  await assert.rejects(createAdjustmentGateway('token',business,network).create(body(),key),
    e=>e instanceof ApiTransportError&&e.outcomeUnknown)
  assert.equal(calls,2)
})
test('T08-4 GET inválido es error de lectura, nunca mutación incierta',async()=>{
  const fake=async()=>response({...receipt(),business_id:foreign},200)
  await assert.rejects(createAdjustmentGateway('token',business,fake).get(operation),
    e=>e instanceof ApiTransportError&&!e.outcomeUnknown)
})
test('T08-4 journal durable recupera misma clave y expected_version tras recrear coordinador F5',async()=>{
  const storage=port(),first=createAdjustmentJournal(storage)
  const intent={...newAdjustmentIntent(actor,business,body()),key}
  await first.reserve(intent)
  assert.deepEqual(await createAdjustmentJournal(storage).load(intent.scope),intent)
  assert.equal(await first.load(adjustmentScope(other,business)),null)
  assert.equal(await first.load(adjustmentScope(actor,foreign)),null)
})
test('T08-4 misma clave no permite cambiar cantidad, versión ni tipo y tampoco clave nueva',async()=>{
  const storage=port(),journal=createAdjustmentJournal(storage)
  const intent={...newAdjustmentIntent(actor,business,body()),key}
  await journal.reserve(intent)
  await assert.rejects(journal.reserve({...intent,body:body('AJUSTE_ENTRADA',5,2000)}),AdjustmentJournalConflict)
  await assert.rejects(journal.reserve({...intent,body:body('AJUSTE_SALIDA',6,2000)}),AdjustmentJournalConflict)
  await assert.rejects(journal.reserve({...intent,key:'cefa1007-7071-4da4-8e5d-96a61ac1058b'}),AdjustmentJournalConflict)
  assert.deepEqual(await journal.load(intent.scope),intent)
})
test('T08-4 registro corrupto/token/otro actor rechazado antes de POST',()=>{
  const intent={...newAdjustmentIntent(actor,business,body()),key}
  for(const invalid of [
    {...intent,token:'Bearer'},
    {...intent,body:{...body(),password:'secret'}},
    {...intent,body:{...body(),expected_version:1.25}},
    {...intent,actorId:other},
    {...intent,createdAt:'foo'},
    {...intent,key:'abc'},
  ])assert.throws(()=>parsePendingAdjustment(invalid,intent.scope),AdjustmentJournalConflict)
})
test('T08-4 IndexedDB fallido bloquea reserva y solo elimina registro con clave original',async()=>{
  const storage=port(),journal=createAdjustmentJournal(storage)
  const intent={...newAdjustmentIntent(actor,business,body()),key}
  await journal.reserve(intent)
  await assert.rejects(journal.discard(intent.scope,'cefa1007-7071-4da4-8e5d-96a61ac1058b'),AdjustmentJournalConflict)
  assert.deepEqual(await journal.load(intent.scope),intent)
  await journal.discard(intent.scope,key)
  assert.equal(await journal.load(intent.scope),null)
  const broken=createAdjustmentJournal({...storage,async reserve(){throw new AdjustmentJournalUnavailable()}})
  await assert.rejects(broken.reserve(intent),AdjustmentJournalUnavailable)
})

test('T08-4: saldo acumulado admite 999999999999999 milésimas aunque el delta individual sea menor',()=>{
  assert.equal(MAX_STOCK_BALANCE_MILLI,999999999999999)
  assert.equal(MAX_ADJUSTMENT_DELTA_MILLI,999999999)
  assert.equal(countedMilli('1000000000,500','GRAMO'),1000000000500)
  assert.equal(countedMilli('1000000000','UNIDAD'),1000000000000)
  assert.deepEqual(adjustmentFromCount(1000000001000,1000000000000,4),{
    kind:'AJUSTE_ENTRADA',quantity_milli:1000,
  })
  assert.equal(countedMilli('999999999999,999','GRAMO'),MAX_STOCK_BALANCE_MILLI)
  assert.throws(()=>countedMilli('1000000000000','GRAMO'))
  assert.throws(()=>adjustmentFromCount(1000000000000,0,1),RangeError)
})
