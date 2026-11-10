import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiHttpError, ApiTransportError } from '../src/api/httpClient.ts'
import {
 createTransferGateway,parseTransfer,transferMilli,transferReason,validateTransfer,
} from '../src/features/inventory/realTransferGateway.ts'
import {
 createTransferJournal,newTransferIntent,transferPendingScope,parsePendingTransfer,
 TransferPendingConflict,TransferPendingUnavailable,
} from '../src/features/inventory/transferPendingJournal.ts'

const business='12dd5528-f5cc-4931-bd39-f5e9da116d25'
const otherBusiness='f50f0e1e-b247-45f4-b1b0-ac975567f8c6'
const origin='80bdbe96-dc8a-4620-a934-0ca7ef743865'
const dest='8c8bd56a-769b-4bc2-a089-444426b8c7f7'
const item='2cfbded7-9a52-4095-a7eb-b16a97b2cecf'
const actor='24e8f9d0-bb70-4d09-9bf3-cf912693c06a'
const otherActor='d6a35e50-37ba-4a89-8142-3f233bf779f7'
const op='9c46a21d-0e46-4a7e-a8f1-7d1c65e33d8b'
const key='b6e4fb1a-2052-4a40-886e-f8732b19ce10'
const command=()=>({
 catalog_item_id:item,source_location_id:origin,destination_location_id:dest,
 quantity_milli:1000,reason:'Reposición de sede secundaria',
})
const movement=(kind,location,delta,id)=>({
 id,business_id:business,location_id:location,catalog_item_id:item,actor_id:actor,
 event_type:kind,delta_milli:delta,occurred_at:'2026-11-10T14:00:00Z',
 inventory_operation_id:op,operation_kind:'TRASLADO',
})
const receipt=()=>({
 id:op,business_id:business,...command(),unit_snapshot:'UNIDAD',
 actor_id:actor,created_at:'2026-11-10T14:00:00Z',movements:[
  movement('TRASLADO_SALIDA',origin,-1000,'274f31c8-ac2d-4d72-a40f-25bed4e093fe'),
  movement('TRASLADO_ENTRADA',dest,1000,'8eeb18c1-918c-4fc3-9c22-621086a70977'),
 ],
})
const response=(body,status=201)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}})
const journalPort=()=>{
 const records=new Map()
 return {
  records,
  async read(scope){return records.get(scope)},
  async reserve(row){
   const saved=records.get(row.scope)
   if(saved&&JSON.stringify(saved)!==JSON.stringify(row))throw new TransferPendingConflict()
   records.set(row.scope,structuredClone(row))
  },
  async remove(scope,k){
   const old=records.get(scope)
   if(old&&old.key!==k)throw new TransferPendingConflict()
   records.delete(scope)
  },
 }
}

test('T08-3: POST usa Bearer opaco y Idempotency-Key UUID4; NO hay reintentos automáticos',async()=>{
 const calls=[]
 const fetcher=async(url,options)=>{calls.push({url,options});return response(receipt())}
 const result=await createTransferGateway('opaco',business,fetcher).create(command(),key)
 assert.equal(result.movements.length,2)
 assert.equal(calls.length,1)
 assert.equal(calls[0].url,'/api/v1/businesses/'+business+'/inventory/transfers')
 assert.equal(calls[0].options.method,'POST')
 assert.equal(calls[0].options.headers.get('Authorization'),'Bearer opaco')
 assert.equal(calls[0].options.headers.get('Idempotency-Key'),key)
 assert.deepEqual(JSON.parse(calls[0].options.body),command())
 assert.equal(calls[0].options.credentials,'omit')
})

test('T08-3: replay HTTP 200 es comprobante válido y no dispara segundo POST',async()=>{
 let calls=0
 const fake=async()=>{calls++;return response(receipt(),200)}
 const result=await createTransferGateway('token',business,fake).create(command(),key)
 assert.equal(result.id,op)
 assert.equal(calls,1)
})

test('T08-3: GET por ID retorna los dos movimientos y no muta stock',async()=>{
 const calls=[]
 const fake=async(url,options)=>{calls.push({url,options});return response(receipt(),200)}
 const got=await createTransferGateway('token',business,fake).get(op)
 assert.equal(got.movements[0].delta_milli,-1000)
 assert.equal(got.movements[1].delta_milli,1000)
 assert.equal(calls[0].url,'/api/v1/businesses/'+business+'/inventory/transfers/'+op)
 assert.equal(calls[0].options.method,'GET')
 assert.equal(calls[0].options.body,undefined)
})

test('T08-3: validación estricta rechaza origen=destino, cantidad inválida y motivo',()=>{
 const bad=[
  {...command(),destination_location_id:origin},
  {...command(),quantity_milli:0},
  {...command(),quantity_milli:-1},
  {...command(),quantity_milli:1000000000},
  {...command(),quantity_milli:1.5},
  {...command(),reason:'no'},
  {...command(),reason:'x'.repeat(501)},
  {...command(),reason:' texto sin normalizar  '},
  {...command(),catalog_item_id:'ART-001'},
  {...command(),fake:true},
 ]
 for(const row of bad)assert.throws(()=>validateTransfer(row))
 assert.equal(transferReason('  Reposición   local '),'Reposición local')
 assert.equal(transferReason('a\nb'),'a b')
})

test('T08-3: unidad discreta no acepta fracciones; GRAMO sí, con precisión exacta',()=>{
 assert.equal(transferMilli('1','UNIDAD'),1000)
 assert.equal(transferMilli('0,500','GRAMO'),500)
 assert.equal(transferMilli('999999,999','GRAMO'),999999999)
 for(const unit of ['UNIDAD','PAQUETE','CAJA'])assert.throws(()=>transferMilli('1,001',unit))
 for(const invalid of ['0','-1','1.000,25','1,0000','1000000','1e3','2,4.5'])
  assert.throws(()=>transferMilli(invalid,'GRAMO'))
})

test('T08-3: respuesta inválida, otro tenant, signos invertidos o ID ajeno fallan cerrados',()=>{
 const bad=[
  {...receipt(),business_id:otherBusiness},
  {...receipt(),quantity_milli:2000},
  {...receipt(),unit_snapshot:'SERVICIO'},
  {...receipt(),source_location_id:dest},
  {...receipt(),movements:receipt().movements.slice(0,1)},
  {...receipt(),movements:[receipt().movements[1],receipt().movements[0]]},
  {...receipt(),movements:[{...receipt().movements[0],inventory_operation_id:dest},receipt().movements[1]]},
  {...receipt(),movements:[{...receipt().movements[0],delta_milli:1000},receipt().movements[1]]},
  {...receipt(),movements:[{...receipt().movements[0],actor_id:otherActor},receipt().movements[1]]},
 ]
 for(const data of bad)assert.throws(()=>parseTransfer(data,business),
  e=>e instanceof ApiTransportError&&e.reason==='invalid-response')
})

test('T08-3: 401/403/404/409/422 nunca provocan DEMO fallback o POST duplicado',async()=>{
 for(const code of [401,403,404,409,422]){
  let times=0
  const fake=async()=>{times++;return response({detail:'rechazado'},code)}
  await assert.rejects(createTransferGateway('token',business,fake).create(command(),key),
    e=>e instanceof ApiHttpError&&e.status===code)
  assert.equal(times,1)
 }
})

test('T08-3: corte de red tras POST se marca resultado incierto sin reintento automático',async()=>{
 let sent=0
 const fake=async()=>{sent++;throw new TypeError('network closed')}
 await assert.rejects(createTransferGateway('token',business,fake).create(command(),key),
  e=>e instanceof ApiTransportError&&e.outcomeUnknown)
 assert.equal(sent,1)
})

test('T08-3: F5 recupera mismo body y clave, solo el actor original ve su scope',async()=>{
 const port=journalPort()
 const first=createTransferJournal(port)
 const row={...newTransferIntent(actor,business,command()),key}
 await first.reserve(row)
 const recovered=await createTransferJournal(port).load(transferPendingScope(actor,business))
 assert.deepEqual(recovered,row)
 assert.equal(await first.load(transferPendingScope(otherActor,business)),null)
 assert.equal(await first.load(transferPendingScope(actor,otherBusiness)),null)
})

test('T08-3: reserva otra clave o cuerpo modificado rechazada sin sobreescribir',async()=>{
 const port=journalPort(),journal=createTransferJournal(port)
 const first={...newTransferIntent(actor,business,command()),key}
 await journal.reserve(first)
 await assert.rejects(journal.reserve({...first,key:'cefa1007-7071-4da4-8e5d-96a61ac1058b'}),TransferPendingConflict)
 await assert.rejects(journal.reserve({...first,body:{...command(),quantity_milli:2000}}),TransferPendingConflict)
 assert.deepEqual(await journal.load(first.scope),first)
})

test('T08-3: registro corrupto/secretos/fecha inválida no se envía ni se repara silenciosamente',()=>{
 const row={...newTransferIntent(actor,business,command()),key}
 for(const bad of [
  {...row,token:'secreto'},
  {...row,body:{...command(),bearer:'secreto'}},
  {...row,createdAt:'fechanoinvalida'},
  {...row,scope:transferPendingScope(otherActor,business)},
  {...row,key:'cualquier cosa'},
 ])assert.throws(()=>parsePendingTransfer(bad,row.scope),TransferPendingConflict)
})

test('T08-3: journal falla cerrado si almacenamiento no funciona; discard exige clave original',async()=>{
 const port=journalPort(),journal=createTransferJournal(port)
 const row={...newTransferIntent(actor,business,command()),key}
 await journal.reserve(row)
 await assert.rejects(journal.discard(row.scope,'0e501868-cccb-492c-8b28-e30a634cd772'),TransferPendingConflict)
 assert.deepEqual(await journal.load(row.scope),row)
 await journal.discard(row.scope,key)
 assert.equal(await journal.load(row.scope),null)
 const broken=createTransferJournal({...port,async reserve(){throw new TransferPendingUnavailable()}})
 await assert.rejects(broken.reserve(row),TransferPendingUnavailable)
})

test('T08-3: GET con respuesta inválida es error de lectura, nunca resultado de mutación incierta',async()=>{
 const fake=async()=>response({...receipt(),business_id:otherBusiness},200)
 await assert.rejects(createTransferGateway('token',business,fake).get(op),
  e=>e instanceof ApiTransportError&&e.reason==='invalid-response'&&!e.outcomeUnknown)
})

test('T08-3: POST 201 con respuesta inválida conserva resultado incierto y misma clave',async()=>{
 const fake=async()=>response({...receipt(),movements:[]},201)
 await assert.rejects(createTransferGateway('token',business,fake).create(command(),key),
  e=>e instanceof ApiTransportError&&e.reason==='invalid-response'&&e.outcomeUnknown)
})
