import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiHttpError, ApiTransportError } from '../src/api/httpClient.ts'
import {
  createSupplyGateway, emptySupplierContact, validateSupplierContact,
} from '../src/features/purchases/realSupplyGateway.ts'

const businessId='e5a347a3-d8e9-4a1a-9f51-72b1b2539c67'
const supplierId='47ad1c6e-598e-4018-b0ef-46e2d68b23d3'
const response={
  id:supplierId,business_id:businessId,name:'Ejemplo',status:'ACTIVO',
  offerings:'Materiales de embalaje',contact_person:'Ana',phone:'+5491112345678',
  whatsapp:'+5491112345678',email:'ventas@example.com',
  address:'Av. Prueba 123',maps_url:'https://www.google.com/maps/place/Av+Prueba',
  website:'https://example.com/',instagram:'proveedor.ejemplo',notes:'Solo retiro',
  payment_methods:['TRANSFERENCIA'],promotions:[{
    id:'f7c09622-cfea-48a3-b0e2-93aca0fa83f4',days:[1,3],
    payment_method:'TRANSFERENCIA',benefit:'10% informativo',
  }],
  created_at:'2026-11-12T12:00:00Z',updated_at:'2026-11-12T12:00:00Z',
}
const draft={
  ...emptySupplierContact,name:'Ejemplo',offerings:'Materiales de embalaje',
  contact_person:'Ana',phone:'+5491112345678',whatsapp:'+5491112345678',
  email:'ventas@example.com',address:'Av. Prueba 123',
  maps_url:'https://www.google.com/maps/place/Av+Prueba',
  website:'https://example.com/',instagram:'@proveedor.ejemplo',notes:'Solo retiro',
}
const json=(data,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{'Content-Type':'application/json'},
})

test('POST proveedor completo envía solo los campos comerciales autorizados',async()=>{
 let calls=0
 const gateway=createSupplyGateway('opaque',businessId,async(url,init)=>{
   calls++
   assert.equal(url,'/api/v1/businesses/'+businessId+'/suppliers')
   assert.equal(init.method,'POST')
   assert.equal(init.headers.get('Idempotency-Key'),null)
   assert.deepEqual(JSON.parse(init.body),validateSupplierContact(draft))
   assert.equal(JSON.parse(init.body).promotions,undefined)
   assert.equal(JSON.parse(init.body).payment_methods,undefined)
   assert.equal(JSON.parse(init.body).status,undefined)
   return json(response,201)
 })
 const saved=await gateway.createSupplierDetailed({...draft,
   // Runtime may supply extra keys: strict field picker must not forward them.
   status:'INACTIVO',payment_methods:['EFECTIVO'],promotions:[],
 })
 assert.equal(saved.name,'Ejemplo')
 assert.equal(calls,1)
})

test('PATCH proveedor solo campos de contacto: preserva promociones y medios existentes',async()=>{
 let calls=0
 const gateway=createSupplyGateway('opaque',businessId,async(url,init)=>{
   calls++
   assert.equal(url,'/api/v1/businesses/'+businessId+'/suppliers/'+supplierId)
   assert.equal(init.method,'PATCH')
   const payload=JSON.parse(init.body)
   assert.deepEqual(payload,validateSupplierContact(draft))
   for(const key of ['payment_methods','promotions','status','business_id','id'])
     assert.equal(Object.hasOwn(payload,key),false)
   return json({...response,contact_person:'Ana'})
 })
 const result=await gateway.updateSupplierDetails(supplierId,draft)
 assert.deepEqual(result.promotions,response.promotions)
 assert.deepEqual(result.payment_methods,response.payment_methods)
 assert.equal(calls,1)
})

test('validación de contacto falla antes de contactar FastAPI',async()=>{
 let calls=0
 const gateway=createSupplyGateway('opaque',businessId,async()=>{
   calls++;return json(response)
 })
 for(const bad of [
   {...draft,name:' '},
   {...draft,whatsapp:'111234'},
   {...draft,phone:'sin teléfono'},
   {...draft,email:'@mal'},
   {...draft,instagram:'@mal usuario'},
   {...draft,maps_url:'https://example.com/otro'},
   {...draft,website:'http://example.com'},
   {...draft,notes:'x'.repeat(651)},
 ]){
   await assert.rejects(gateway.createSupplierDetailed(bad),RangeError)
 }
 assert.equal(calls,0)
})

test('errores HTTP de permisos y conflicto no crean fallback ni escrituras duplicadas',async()=>{
 for(const code of [403,404,409,422]){
   let calls=0
   const gateway=createSupplyGateway('opaque',businessId,async()=>{
     calls++;return json({detail:'Rechazado'},code)
   })
   await assert.rejects(gateway.updateSupplierDetails(supplierId,draft),err=>err instanceof ApiHttpError&&err.status===code)
   assert.equal(calls,1)
 }
})

test('mutación incierta no se reenvía automáticamente',async()=>{
 let calls=0
 const gateway=createSupplyGateway('opaque',businessId,async()=>{
   calls++;throw new TypeError('red caída')
 })
 await assert.rejects(gateway.createSupplierDetailed(draft),err=>err instanceof ApiTransportError&&err.outcomeUnknown)
 assert.equal(calls,1)
})
