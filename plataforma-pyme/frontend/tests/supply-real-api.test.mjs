import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiHttpError, ApiTransportError } from '../src/api/httpClient.ts'
import { createSupplyGateway, decimalToMilli, milliToDecimal, lineTotalCents, priceInputCents,
  validatePurchase, parsePurchase, parseReceipt, parseSupplier } from '../src/features/purchases/realSupplyGateway.ts'
import { createPendingJournal, pendingScope, PendingConflictError, parsePending, newPurchaseIntent, newReceiptIntent } from '../src/features/purchases/supplyPendingJournal.ts'
import { suggestedUnitCost, costExceedsSalePrice, previewLineTotalCents, previewPurchaseTotalCents, unitCostFromExactLineTotal } from '../src/features/purchases/purchaseCostProposal.ts'

const A='e5a347a3-d8e9-4a1a-9f51-72b1b2539c67',B='713fa8a7-5c21-4c3b-9b39-ade992cf8df2'
const actor='a49e944c-e8f9-4794-b2c1-8c5524c1bbd6'
const item='bc13c8ee-aa27-43a3-bc92-798b5c9cccdc'
const key='14401a24-37b6-47db-8986-8a048edc005a'
const id='47ad1c6e-598e-4018-b0ef-46e2d68b23d3'
const site='f7c09622-cfea-48a3-b0e2-93aca0fa83f4'
const supplier=()=>({id,business_id:A,name:'Proveedor A',offerings:'',contact_person:'',phone:'',
 whatsapp:'',email:'',address:'',maps_url:'',website:'',instagram:'',notes:'',
 payment_methods:[],promotions:[],status:'ACTIVO',created_at:'2026-11-10T12:00:00Z',updated_at:'2026-11-10T12:00:00Z'})
const body={purchased_on:'2026-11-10',supplier_id:id,reference:'FC-TEST',notes:'Prueba',
 lines:[{catalog_item_id:item,description:'Producto A TEST',unit:'UNIDAD',quantity_milli:2000,unit_cost_cents:125055}]}
const purchase=()=>({id,business_id:A,request_id:key,supplier_id:id,supplier_name_snapshot:'Proveedor A',
 purchased_on:'2026-11-10',status:'REGISTRADA',total_cents:250110,reference:'FC-TEST',notes:'Prueba',
 created_by_id:actor,created_at:'2026-11-10T12:00:00Z',lines:[{
  id:item,line_number:1,catalog_item_id:item,description_snapshot:'Producto A TEST',
  kind_snapshot:'BIEN',unit_snapshot:'UNIDAD',sku_snapshot:'SKU-A',quantity_milli:2000,
  unit_cost_cents:125055,line_total_cents:250110}]})
const receipt=()=>({id:item,business_id:A,purchase_id:id,location_id:site,request_id:key,
 confirmed_by_id:actor,confirmed_at:'2026-11-10T12:00:00Z',purchase_status:'RECIBIDA',
 movements:[{id:item,catalog_item_id:item,location_id:site,delta_milli:2000}],
 balances_after:[{catalog_item_id:item,quantity_milli:2000,version:1}]})
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}})

test('unidades con milésimas exactas y validación de rango',()=>{
 assert.equal(decimalToMilli('2,125'),2125)
 assert.equal(decimalToMilli('1.001'),1001)
 assert.equal(decimalToMilli('1'),1000)
 assert.equal(milliToDecimal(2500),'2,5')
 for(const invalid of ['0','-1','1.2345','1.000,5','abc','999999999999'])
   assert.throws(()=>decimalToMilli(invalid),RangeError)
})

test('HALF_UP por línea con BigInt y no error por floats grandes',()=>{
 assert.equal(lineTotalCents(500,3),2)
 assert.equal(lineTotalCents(1000,3),3)
 assert.equal(lineTotalCents(123456,55),6790)
 assert.throws(()=>lineTotalCents(999999999,99999999999),RangeError)
})

test('compra: unidades discretas requieren cantidades enteras, conceptos exigen CONCEPTO',()=>{
 assert.doesNotThrow(()=>validatePurchase(body))
 assert.throws(()=>validatePurchase({...body,lines:[{...body.lines[0],quantity_milli:1500}]}),RangeError)
 assert.throws(()=>validatePurchase({...body,lines:[{...body.lines[0],catalog_item_id:null}]}),RangeError)
 assert.throws(()=>validatePurchase({...body,lines:[]}),RangeError)
 assert.throws(()=>validatePurchase({...body,purchased_on:'1800-01-01'}),RangeError)
})

test('proveedores GET page con Bearer, 100 y tenant',async()=>{
 const api=createSupplyGateway('opaque',A,async(url,init)=>{
   assert.equal(url,'/api/v1/businesses/'+A+'/suppliers?offset=0&limit=100')
   assert.equal(init.headers.get('Authorization'),'Bearer opaque')
   return json([supplier()])
 })
 assert.equal((await api.suppliers()).length,1)
 assert.throws(()=>parseSupplier({...supplier(),business_id:B},A),ApiTransportError)
})

test('proveedores no tienen Idempotency-Key y no se crea por GET',async()=>{
 const api=createSupplyGateway('opaque',A,async(url,init)=>{
   assert.equal(url,'/api/v1/businesses/'+A+'/suppliers')
   assert.equal(init.method,'POST')
   assert.deepEqual(JSON.parse(init.body),{name:'Nuevo proveedor'})
   assert.equal(init.headers.has('Idempotency-Key'),false)
   return json(supplier(),201)
 })
 assert.equal((await api.createSupplier('  Nuevo proveedor ')).name,'Proveedor A')
})

test('cambiar estado de proveedor usa PATCH separado',async()=>{
 const api=createSupplyGateway('opaque',A,async(url,init)=>{
   assert.equal(url,'/api/v1/businesses/'+A+'/suppliers/'+id+'/status')
   assert.equal(init.method,'PATCH')
   assert.deepEqual(JSON.parse(init.body),{status:'INACTIVO'})
   return json({...supplier(),status:'INACTIVO'})
 })
 assert.equal((await api.changeSupplier(id,'INACTIVO')).status,'INACTIVO')
})

test('compras: GET paginado y detalles enlazados a tenant',async()=>{
 const api=createSupplyGateway('opaque',A,async(url)=>{
   if(url.includes('?')){assert.equal(url,'/api/v1/businesses/'+A+'/purchases?offset=100&limit=100');return json([purchase()])}
   assert.equal(url,'/api/v1/businesses/'+A+'/purchases/'+id)
   return json(purchase())
 })
 assert.equal((await api.purchases(100)).length,1)
 assert.equal((await api.purchase(id)).request_id,key)
 assert.throws(()=>parsePurchase({...purchase(),business_id:B},A),ApiTransportError)
})

test('POST compra: clave UUID4, payload exacto, sin recepción ni stock',async()=>{
 const api=createSupplyGateway('opaque',A,async(url,init)=>{
   assert.equal(url,'/api/v1/businesses/'+A+'/purchases')
   assert.equal(init.method,'POST')
   assert.equal(init.headers.get('Idempotency-Key'),key)
   assert.deepEqual(JSON.parse(init.body),body)
   return json(purchase(),201)
 })
 assert.equal((await api.createPurchase(body,key)).status,'REGISTRADA')
 await assert.rejects(api.createPurchase(body,'bad-key'),TypeError)
})

test('receipt requiere destino y clave idénticos, verificación de tenant',async()=>{
 const api=createSupplyGateway('opaque',A,async(url,init)=>{
   assert.equal(url,'/api/v1/businesses/'+A+'/purchases/'+id+'/receive')
   assert.equal(init.method,'POST')
   assert.equal(init.headers.get('Idempotency-Key'),key)
   assert.deepEqual(JSON.parse(init.body),{location_id:site})
   return json(receipt(),201)
 })
 assert.equal((await api.receive(id,site,key)).movements[0].delta_milli,2000)
 assert.throws(()=>parseReceipt({...receipt(),business_id:B},A,id),ApiTransportError)
})

test('recuperación HTTP GET /receipt informa request_id sin generar stock nuevo',async()=>{
 const api=createSupplyGateway('opaque',A,async(url,init)=>{
   assert.equal(url,'/api/v1/businesses/'+A+'/purchases/'+id+'/receipt')
   assert.equal(init.method,'GET')
   return json(receipt())
 })
 assert.equal((await api.receipt(id)).request_id,key)
})

test('404,403,409 no provocan fallback ni reintento automático',async()=>{
 for(const status of [403,404,409]){
   const api=createSupplyGateway('opaque',A,async()=>json({detail:'Error'},status))
   await assert.rejects(api.purchases(),err=>err instanceof ApiHttpError&&err.status===status)
 }
})

test('fallo de conexión en mutación es incierto, y un solo request',async()=>{
 let calls=0
 const api=createSupplyGateway('opaque',A,async()=>{calls++;throw new TypeError('red caída')})
 await assert.rejects(api.createPurchase(body,key),err=>err instanceof ApiTransportError&&err.outcomeUnknown)
 assert.equal(calls,1)
})

test('paginación inválida y path traversal no envían nada al servidor',async()=>{
 let calls=0
 const api=createSupplyGateway('opaque',A,async()=>{calls++;return json([])})
 await assert.rejects(api.suppliers(-1),TypeError)
 await assert.rejects(api.purchases(0,501),TypeError)
 await assert.rejects(api.receive('../hack',site,key),TypeError)
 assert.equal(calls,0)
})

function port(){
 const m=new Map()
 return {m, adapter:{
  async read(scope){return structuredClone(m.get(scope))},
  async reserve(row){const old=m.get(row.scope);if(old&&JSON.stringify(old)!==JSON.stringify(row))throw new PendingConflictError();m.set(row.scope,structuredClone(row))},
  async remove(scope,key){if(m.get(scope)?.key!==key)throw new PendingConflictError();m.delete(scope)},
 }}
}
const record=(kind='purchase.create')=>{
 const base={actorId:actor,businessId:A,key,createdAt:'2026-11-10T10:00:00Z'}
 if(kind==='purchase.create')return {...base,kind,scope:pendingScope(actor,A,'purchase.create'),body}
 return {...base,kind:'purchase.receive',purchaseId:id,scope:pendingScope(actor,A,'purchase.receive',id),body:{location_id:site}}
}

test('journal compra conserva clave/cuerpo después F5 y rechaza modificación',async()=>{
 const {adapter}=port(),j=createPendingJournal(adapter)
 const a=record()
 await j.reserve(a)
 const fresh=createPendingJournal(adapter)
 assert.deepEqual(await fresh.load(a.scope),a)
 await assert.rejects(j.reserve({...a,body:{...body,reference:'Otro'}}),PendingConflictError)
 assert.deepEqual(await j.load(a.scope),a)
})

test('journal recibe por otra clave y scope; actor/empresa no cruzan',async()=>{
 const {adapter}=port(),j=createPendingJournal(adapter)
 const a=record('purchase.receive')
 await j.reserve(a)
 assert.equal((await j.load(a.scope)).kind,'purchase.receive')
 assert.equal(await j.load(pendingScope(actor,B,'purchase.receive',id)),null)
 assert.throws(()=>parsePending({...a,businessId:B},a.scope),PendingConflictError)
 await j.discard(a.scope,a.key)
 assert.equal(await j.load(a.scope),null)
})

test('journal rechaza datos corruptos o secretos',()=>{
 const a=record()
 assert.throws(()=>parsePending({...a,token:'Bearer'},a.scope),PendingConflictError)
 assert.throws(()=>parsePending({...a,body:{...body,password:'123'}},a.scope),PendingConflictError)
 assert.throws(()=>pendingScope('demo',A,'purchase.create'),TypeError)
})

test('factory de compra crea clave, fecha y scope válidos fuera de render; reintentos se restauran',()=>{
  const intent=newPurchaseIntent(actor,A,body)
  assert.match(intent.key,/^[0-9a-f-]{36}$/)
  assert.equal(intent.createdAt.length,24)
  assert.equal(intent.scope,pendingScope(actor,A,'purchase.create'))
  assert.deepEqual(parsePending(intent,intent.scope),intent)
  assert.deepEqual(intent.body,body)
})

test('factory de recepción crea identidad por compra y ubicación sin efectos de stock',()=>{
  const intent=newReceiptIntent(actor,A,id,site)
  assert.equal(intent.kind,'purchase.receive')
  assert.equal(intent.body.location_id,site)
  assert.equal(intent.scope,pendingScope(actor,A,'purchase.receive',id))
  assert.deepEqual(parsePending(intent,intent.scope),intent)
})

test('al seleccionar artículo, costo de referencia se propone en pesos con centavos exactos',()=>{
  const article={reference_cost_cents:80000,price_cents:150000}
  assert.equal(suggestedUnitCost(article),'800,00')
  assert.equal(suggestedUnitCost({reference_cost_cents:125055,price_cents:200000}),'1250,55')
})

test('sin costo de referencia el campo queda vacío; cero informado no es ausencia',()=>{
  assert.equal(suggestedUnitCost({reference_cost_cents:null,price_cents:100000}),'')
  assert.equal(suggestedUnitCost(null),'')
  assert.equal(suggestedUnitCost(undefined),'')
  assert.equal(suggestedUnitCost({reference_cost_cents:0,price_cents:null}),'0,00')
})

test('costo real editado reemplaza la propuesta y el backend guarda el valor del documento',()=>{
  const article={reference_cost_cents:80000,price_cents:150000}
  assert.equal(suggestedUnitCost(article),'800,00')
  // El comprador puede editar a 2000,00. No se modifica el catálogo.
  const actual='2000,00'
  const cost=priceInputCents(actual)
  assert.equal(cost,200000)
  const edited={...body,lines:[{...body.lines[0],unit_cost_cents:cost}]}
  validatePurchase(edited)
  assert.equal(edited.lines[0].unit_cost_cents,200000)
  assert.equal(article.reference_cost_cents,80000)
  assert.equal(lineTotalCents(edited.lines[0].quantity_milli,cost),400000)
})

test('costo mayor a venta advierte sin bloquear; igual, menor, nulo o inválido no advierten',()=>{
  const article={reference_cost_cents:80000,price_cents:150000}
  assert.equal(costExceedsSalePrice('2000',article),true)
  assert.equal(costExceedsSalePrice('1500,00',article),false)
  assert.equal(costExceedsSalePrice('800',article),false)
  assert.equal(costExceedsSalePrice('2000',{reference_cost_cents:null,price_cents:null}),false)
  assert.equal(costExceedsSalePrice('',article),false)
  assert.equal(costExceedsSalePrice('1.000,00',article),false)
})

test('subtotal por renglón se calcula con el mismo HALF_UP del backend',()=>{
  assert.equal(previewLineTotalCents('4','800,00'),320000)
  assert.equal(previewLineTotalCents('2','2000'),400000)
  assert.equal(previewLineTotalCents('0,001','0,01'),0)
  assert.equal(previewLineTotalCents('0','800'),null)
  assert.equal(previewLineTotalCents('4',''),null)
})

test('total general suma los subtotales en centavos, no multiplica floats',()=>{
  assert.equal(previewPurchaseTotalCents([{quantity:'4',unitCost:'800,00'},{quantity:'2',unitCost:'2000'}]),720000)
  assert.equal(previewPurchaseTotalCents([{quantity:'0,500',unitCost:'0,03'},{quantity:'0,500',unitCost:'0,03'}]),4)
  assert.equal(previewPurchaseTotalCents([]),null)
  assert.equal(previewPurchaseTotalCents([{quantity:'2',unitCost:''}]),null)
  assert.equal(previewPurchaseTotalCents([{quantity:'1',unitCost:'999999999,99'},{quantity:'1',unitCost:'0,01'}]),null)
})

test('edición por importe total recalcula unitario exacto y conserva el subtotal',()=>{
  assert.equal(unitCostFromExactLineTotal('4','3200'), '800,00')
  assert.equal(unitCostFromExactLineTotal('4','12000'), '3000,00')
  assert.equal(unitCostFromExactLineTotal('3','10,02'), '3,34')
  assert.equal(unitCostFromExactLineTotal('0,001','0,01'), '10,00')
  const calculated=unitCostFromExactLineTotal('4','12000')
  assert.equal(previewLineTotalCents('4',calculated),1_200_000)
})

test('no se acepta total imposible de representar con costo unitario en centavos',()=>{
  assert.throws(()=>unitCostFromExactLineTotal('3','10,00'),/no puede representarse exactamente/)
  assert.throws(()=>unitCostFromExactLineTotal('0','100'),RangeError)
  assert.throws(()=>unitCostFromExactLineTotal('3',''),RangeError)
  assert.throws(()=>unitCostFromExactLineTotal('3','-1'),RangeError)
  assert.throws(()=>unitCostFromExactLineTotal('0,001','999999999,99'),RangeError)
})

test('la conversión por total solo construye unit_cost_cents, sin cambiar catálogo ni identidad del pendiente',()=>{
  const selectedCatalog={reference_cost_cents:80000,price_cents:150000}
  const adjustedUnit=unitCostFromExactLineTotal('2','4000,00')
  assert.equal(adjustedUnit,'2000,00')
  const changed={...body,lines:[{...body.lines[0],unit_cost_cents:priceInputCents(adjustedUnit)}]}
  validatePurchase(changed)
  assert.equal(lineTotalCents(changed.lines[0].quantity_milli,changed.lines[0].unit_cost_cents),400000)
  assert.equal(selectedCatalog.reference_cost_cents,80000)
  assert.equal(changed.lines[0].catalog_item_id,item)
})
