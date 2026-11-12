import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiHttpError, ApiTransportError } from '../src/api/httpClient.ts'
import {
  createSupplyGateway, newSupplierCommercialDraft, validateSupplierCommercialDraft,
  SUPPLIER_PAYMENT_METHODS, SUPPLIER_WEEKDAYS,
} from '../src/features/purchases/realSupplyGateway.ts'

const business='e5a347a3-d8e9-4a1a-9f51-72b1b2539c67'
const supplierId='47ad1c6e-598e-4018-b0ef-46e2d68b23d3'
const promotionId='f7c09622-cfea-48a3-b0e2-93aca0fa83f4'
const promotionIdTwo='47ad1c6e-598e-4018-b0ef-46e2d68b23d3'
const draft=()=>({
  ...newSupplierCommercialDraft(),
  name:'Proveedor días de prueba',contact_person:'Julia',notes:'Promoción informativa',
  payment_methods:['EFECTIVO','MERCADO_PAGO'],
  promotions:[
    {id:promotionId,days:[4,0,2],payment_method:'MERCADO_PAGO',benefit:'20% reintegro tope $15.000'},
    {id:promotionIdTwo,days:[],payment_method:null,benefit:'Envío sin cargo'},
  ],
})
const response=()=>({
  id:supplierId,business_id:business,name:'Proveedor días de prueba',offerings:'',
  contact_person:'Julia',phone:'',whatsapp:'',email:'',address:'',maps_url:'',
  website:'',instagram:'',notes:'Promoción informativa',status:'ACTIVO',
  payment_methods:['EFECTIVO','MERCADO_PAGO'],
  promotions:[
    {id:promotionId,days:[0,2,4],payment_method:'MERCADO_PAGO',benefit:'20% reintegro tope $15.000'},
    {id:promotionIdTwo,days:[],payment_method:null,benefit:'Envío sin cargo'},
  ],
  created_at:'2026-11-12T12:00:00Z',updated_at:'2026-11-12T12:00:00Z',
})
const json=(data,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{'Content-Type':'application/json'},
})

test('días de promociones: lunes=0, domingo=6, arrays ordenados y sin duplicados',()=>{
  assert.deepEqual(SUPPLIER_WEEKDAYS,['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'])
  assert.equal(SUPPLIER_PAYMENT_METHODS.length,7)
  const validated=validateSupplierCommercialDraft(draft())
  assert.deepEqual(validated.promotions[0].days,[0,2,4])
  assert.deepEqual(validated.promotions[1].days,[])
  assert.equal(validated.promotions[0].payment_method,'MERCADO_PAGO')
  assert.equal(validated.promotions[1].payment_method,null)
  assert.deepEqual(validated.payment_methods,['EFECTIVO','MERCADO_PAGO'])
})

test('POST registra pago, días y beneficio sin estado ni ID empresarial',async()=>{
 let calls=0
 const gateway=createSupplyGateway('opaque',business,async(url,init)=>{
   calls++
   assert.equal(url,'/api/v1/businesses/'+business+'/suppliers')
   assert.equal(init.method,'POST')
   assert.equal(init.headers.has('Idempotency-Key'),false)
   const body=JSON.parse(init.body)
   assert.deepEqual(body,validateSupplierCommercialDraft(draft()))
   for(const k of ['status','id','business_id','created_at','updated_at'])
     assert.equal(Object.hasOwn(body,k),false)
   return json(response(),201)
 })
 const saved=await gateway.createSupplierCommercial(draft())
 assert.equal(saved.promotions.length,2)
 assert.equal(calls,1)
})

test('PATCH edita y elimina promociones por reemplazo atómico del arreglo JSON, no toca estado',async()=>{
 const revised={
   ...draft(),promotions:[
     {id:promotionId,days:[1,3,6],payment_method:'TRANSFERENCIA',benefit:'15% de descuento'},
   ],payment_methods:['TRANSFERENCIA'],
 }
 let calls=0
 const gateway=createSupplyGateway('opaque',business,async(url,init)=>{
   calls++
   assert.equal(url,'/api/v1/businesses/'+business+'/suppliers/'+supplierId)
   assert.equal(init.method,'PATCH')
   const body=JSON.parse(init.body)
   assert.deepEqual(body.promotions,[{
     id:promotionId,days:[1,3,6],payment_method:'TRANSFERENCIA',
     benefit:'15% de descuento',
   }])
   assert.deepEqual(body.payment_methods,['TRANSFERENCIA'])
   assert.equal(body.status,undefined)
   assert.equal(body.business_id,undefined)
   return json({...response(),promotions:body.promotions,payment_methods:body.payment_methods})
 })
 const saved=await gateway.updateSupplierCommercial(supplierId,revised)
 assert.deepEqual(saved.promotions[0].days,[1,3,6])
 assert.equal(saved.promotions.length,1)
 assert.equal(calls,1)
})

test('reglas malformadas: fechas fuera de rango, duplicados, límite y beneficio son rechazados sin red',async()=>{
 const variants=[
   {...draft(),promotions:[{...draft().promotions[0],days:[1,1]}]},
   {...draft(),promotions:[{...draft().promotions[0],days:[7]}]},
   {...draft(),promotions:[{...draft().promotions[0],days:[-1]}]},
   {...draft(),promotions:[{...draft().promotions[0],days:[1.5]}]},
   {...draft(),promotions:[{...draft().promotions[0],id:'demo-promo-123'}]},
   {...draft(),promotions:[draft().promotions[0],draft().promotions[0]]},
   {...draft(),promotions:[{...draft().promotions[0],benefit:'a'}]},
   {...draft(),promotions:[{...draft().promotions[0],payment_method:'OTRO'}]},
   {...draft(),promotions:Array.from({length:9},(_,i)=>({
     ...draft().promotions[0],id:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),
   }))},
   {...draft(),payment_methods:['EFECTIVO','EFECTIVO']},
   {...draft(),payment_methods:['EFECTIVO','OTRO']},
 ]
 let calls=0
 const gateway=createSupplyGateway('opaque',business,async()=>{calls++;return json(response())})
 for(const invalid of variants)
   await assert.rejects(gateway.createSupplierCommercial(invalid),RangeError)
 assert.equal(calls,0)
})

test('403,404,409,422 se propagan; nunca hay retry ni escritura por GET',async()=>{
 for(const status of [403,404,409,422]){
   let calls=0
   const gateway=createSupplyGateway('opaque',business,async()=>{
     calls++;return json({detail:'Rechazado'},status)
   })
   await assert.rejects(gateway.updateSupplierCommercial(supplierId,draft()),
     err=>err instanceof ApiHttpError&&err.status===status)
   assert.equal(calls,1)
 }
})

test('error de transporte marca resultado incierto y no reenvía POST/PATCH',async()=>{
 for(const method of ['create','update']){
   let calls=0
   const gateway=createSupplyGateway('opaque',business,async()=>{
     calls++;throw new TypeError('red caída')
   })
   await assert.rejects(
     method==='create'?gateway.createSupplierCommercial(draft())
       :gateway.updateSupplierCommercial(supplierId,draft()),
     err=>err instanceof ApiTransportError&&err.outcomeUnknown)
   assert.equal(calls,1)
 }
})
