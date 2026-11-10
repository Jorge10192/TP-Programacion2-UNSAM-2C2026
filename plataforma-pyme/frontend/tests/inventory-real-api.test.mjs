import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiHttpError, ApiTransportError } from '../src/api/httpClient.ts'
import {
  createInventoryGateway, parseBalance, parseMovement, formatMilli, formatDelta,
  INVENTORY_EVENTS,
} from '../src/features/inventory/realInventoryGateway.ts'

const business='12dd5528-f5cc-4931-bd39-f5e9da116d25'
const another='f50f0e1e-b247-45f4-b1b0-ac975567f8c6'
const location='80bdbe96-dc8a-4620-a934-0ca7ef743865'
const otherLocation='8c8bd56a-769b-4bc2-a089-444426b8c7f7'
const item='c41f9c4e-1665-4c1b-9bac-ef3dbb2a4001'
const otherItem='376d5446-897b-4d82-977d-fd69909b2fb4'
const actor='2cba85a0-1b07-4580-b45d-49d1e40d55b3'
const movementId='22cc4250-18da-4a45-a791-34330b4501be'
const stock=()=>({business_id:business,location_id:location,catalog_item_id:item,
  quantity_milli:11000,version:3,updated_at:'2026-11-10T11:23:00Z'})
const movement=(event_type='COMPRA_RECEPCION',delta_milli=5000)=>({
  id:movementId,business_id:business,location_id:location,catalog_item_id:item,
  actor_id:actor,event_type,delta_milli,occurred_at:'2026-11-10T11:23:00Z',
  receipt_id:'ec84ec62-4729-43c3-864a-0e9b283a7f6f',
  purchase_line_id:'806562c1-e685-4d8a-a730-b40d1f4544fa',
})
const response=(data,status=200)=>new Response(JSON.stringify(status===200?data:{detail:'No disponible'}),{
  status,headers:{'Content-Type':'application/json'},
})
function spy(data) {
  const calls=[]
  const fake=async(url,options)=>{calls.push({url,options});return response(data)}
  return {calls,fake}
}

test('GET balances usa Bearer opaco, /api/v1 local, offset y limit 100 sin escribir',async()=>{
 const {fake,calls}=spy([stock()])
 const gateway=createInventoryGateway('token opaco',business,fake)
 const actual=await gateway.balances()
 assert.deepEqual(actual,[stock()])
 assert.equal(calls.length,1)
 assert.equal(calls[0].url,'/api/v1/businesses/'+business+'/inventory/balances?offset=0&limit=100')
 assert.equal(calls[0].options.method,'GET')
 assert.equal(calls[0].options.body,undefined)
 assert.equal(calls[0].options.headers.get('Authorization'),'Bearer token opaco')
 assert.equal(calls[0].options.credentials,'omit')
})

test('GET movements lee el ledger con signo y sin POST de recepción',async()=>{
 const {fake,calls}=spy([movement()])
 const x=await createInventoryGateway('token',business,fake).movements()
 assert.equal(x[0].delta_milli,5000)
 assert.equal(calls[0].url,'/api/v1/businesses/'+business+'/inventory/movements?offset=0&limit=100')
 assert.equal(calls[0].options.method,'GET')
 assert.equal(calls.length,1)
})

test('filtros por sede y artículo se envían al backend en ambas lecturas',async()=>{
 const {fake,calls}=spy([])
 const api=createInventoryGateway('token',business,fake)
 await api.balances(0,100,{locationId:location,catalogItemId:item})
 await api.movements(10,20,{locationId:location,catalogItemId:item})
 assert.equal(calls[0].url,'/api/v1/businesses/'+business+'/inventory/balances?offset=0&limit=100&location_id='+location+'&catalog_item_id='+item)
 assert.equal(calls[1].url,'/api/v1/businesses/'+business+'/inventory/movements?offset=10&limit=20&location_id='+location+'&catalog_item_id='+item)
})

test('paginación 100 → 100 usa offsets reales, no asume listado completo',async()=>{
 const calls=[]
 const fake=async(url,opts)=>{calls.push({url,opts});return response([])}
 const gateway=createInventoryGateway('token',business,fake)
 await gateway.balances(0,100)
 await gateway.balances(100,100)
 await gateway.movements(100,100)
 assert.ok(calls[1].url.includes('balances?offset=100&limit=100'))
 assert.ok(calls[2].url.includes('movements?offset=100&limit=100'))
})

test('nunca acepta UUID DEMO, path traversal, offset negativo o limit>500',async()=>{
 const {fake,calls}=spy([])
 assert.throws(()=>createInventoryGateway('token','walos-demo',fake),TypeError)
 const gateway=createInventoryGateway('token',business,fake)
 await assert.rejects(gateway.balances(-1),RangeError)
 await assert.rejects(gateway.balances(0,501),RangeError)
 await assert.rejects(gateway.movements(1.5),RangeError)
 await assert.rejects(gateway.movements(0,100,{locationId:'../businesses'}),TypeError)
 await assert.rejects(gateway.balances(0,100,{catalogItemId:'ART-001'}),TypeError)
 assert.equal(calls.length,0)
})

test('saldo fuera de tenant, de precisión o con versión inválida se rechaza cerrado',()=>{
 for(const row of [
  {...stock(),business_id:another},
  {...stock(),quantity_milli:-1},
  {...stock(),quantity_milli:1.2},
  {...stock(),quantity_milli:Number.MAX_SAFE_INTEGER+1},
  {...stock(),version:0},
  {...stock(),updated_at:'no es una fecha'},
  {...stock(),location_id:'walos-demo'},
 ])assert.throws(()=>parseBalance(row,business),e=>e instanceof ApiTransportError&&e.reason==='invalid-response')
})

test('movimientos de cada tipo respetan cantidad firmada; venta no se confunde con entrada',()=>{
 const positive=['COMPRA_RECEPCION','TRASLADO_ENTRADA','AJUSTE_ENTRADA','STOCK_INICIAL']
 const negative=['TRASLADO_SALIDA','AJUSTE_SALIDA','VENTA_SALIDA']
 for(const kind of positive)assert.equal(parseMovement(movement(kind,1000),business).delta_milli,1000)
 for(const kind of negative)assert.equal(parseMovement(movement(kind,-1000),business).delta_milli,-1000)
 assert.equal(Object.keys(INVENTORY_EVENTS).length,7)
})

test('no inventa movimientos con signo imposible, cantidad 0 o actor ajeno al DTO',()=>{
 for(const row of [
  movement('VENTA_SALIDA',1000),
  movement('TRASLADO_ENTRADA',-1000),
  movement('STOCK_INICIAL',0),
  movement('EVENTO_INEXISTENTE',1000),
  {...movement(),business_id:another},
  {...movement(),actor_id:null},
  {...movement(),receipt_id:'hack'},
  {...movement(),delta_milli:1.1},
 ])assert.throws(()=>parseMovement(row,business),e=>e instanceof ApiTransportError&&e.reason==='invalid-response')
})

test('lectura general admite campos opcionales omitidos (response_model_exclude_none)',()=>{
 const row=movement('VENTA_SALIDA',-1000)
 delete row.receipt_id
 delete row.purchase_line_id
 assert.equal(parseMovement(row,business).event_type,'VENTA_SALIDA')
 assert.equal(parseMovement({...row,operation_kind:null,sale_id:null},business).delta_milli,-1000)
})

test('respuesta de otra empresa nunca se mezcla con inventario del usuario',async()=>{
 const {fake}=spy([{...stock(),business_id:another}])
 await assert.rejects(createInventoryGateway('token',business,fake).balances(),
  e=>e instanceof ApiTransportError&&e.reason==='invalid-response')
})

test('si API ignora filtro, se rechaza dato de sede o artículo no solicitado',async()=>{
 const {fake}=spy([stock()])
 const gateway=createInventoryGateway('token',business,fake)
 await assert.rejects(gateway.balances(0,100,{locationId:otherLocation}),ApiTransportError)
 await assert.rejects(gateway.balances(0,100,{catalogItemId:otherItem}),ApiTransportError)
 const {fake:fakeMov}=spy([movement()])
 await assert.rejects(createInventoryGateway('token',business,fakeMov).movements(0,100,{locationId:otherLocation}),ApiTransportError)
})

test('página excesiva, duplicada o no array falla sin ocultar registros',async()=>{
 for(const payload of [[stock(),stock()],{},Array(101).fill(stock())]){
  const {fake}=spy(payload)
  await assert.rejects(createInventoryGateway('token',business,fake).balances(0,100),
   e=>e instanceof ApiTransportError&&e.reason==='invalid-response')
 }
 const {fake}=spy([movement(),movement()])
 await assert.rejects(createInventoryGateway('token',business,fake).movements(),ApiTransportError)
})

test('no confunde saldo 0 con saldo inexistente ni unidad con valor en centavos',()=>{
 assert.equal(parseBalance({...stock(),quantity_milli:0},business).quantity_milli,0)
 assert.equal(formatMilli(11000),'11')
 assert.equal(formatMilli(1500),'1,5')
 assert.equal(formatMilli(1234),'1,234')
 assert.equal(formatMilli(0),'0')
 assert.equal(formatDelta(-5000),'-5')
 assert.equal(formatDelta(5000),'+5')
 assert.throws(()=>formatMilli(Number.MAX_SAFE_INTEGER+1),RangeError)
 assert.throws(()=>formatDelta(0),RangeError)
})

test('HTTP 403/404 se mantienen como errores de acceso, sin DEMO fallback',async()=>{
 for(const status of [403,404]){
  const gateway=createInventoryGateway('token',business,async()=>response([],status))
  await assert.rejects(gateway.balances(),e=>e instanceof ApiHttpError&&e.status===status)
  await assert.rejects(gateway.movements(),e=>e instanceof ApiHttpError&&e.status===status)
 }
})

test('un error de red no genera intento comercial incierto ni POST automático',async()=>{
 let calls=0
 const gateway=createInventoryGateway('token',business,async()=>{calls++;throw new Error('offline')})
 await assert.rejects(gateway.balances(),e=>e instanceof ApiTransportError&&e.reason==='network'&&!e.outcomeUnknown)
 assert.equal(calls,1)
})

test('cancelación de GET conserva política de solo lectura',async()=>{
 const controller=new AbortController()
 const gateway=createInventoryGateway('token',business,async(_url,options)=>{
  return await new Promise((_resolve,reject)=>{
   options.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true})
  })
 })
 const p=gateway.movements(0,100,{},controller.signal)
 controller.abort()
 await assert.rejects(p,e=>e instanceof ApiTransportError&&e.reason==='aborted'&&!e.outcomeUnknown)
})
