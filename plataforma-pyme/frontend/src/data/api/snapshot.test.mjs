import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {mapSnapshot} from './snapshot.ts'
import {createApiGateway} from './apiGateway.ts'
import {GatewayError} from './httpClient.ts'

const fixture=JSON.parse(readFileSync(new URL('../../../tests/fixtures/online-snapshot.http.json',import.meta.url),'utf8'))
const user={id:fixture.snapshot.profile.id,name:fixture.snapshot.profile.displayName,email:fixture.snapshot.profile.email}
const clone=()=>structuredClone(fixture)
const tick=()=>new Promise(resolve=>setImmediate(resolve))

test('contrato HTTP real conserva dos empresas y el mismo SKU aislado por tenant',()=>{
  const s=mapSnapshot(clone(),user)
  assert.equal(Object.keys(s.businessesById).length,2)
  const products=Object.values(s.catalogItemsById)
  assert.equal(products.length,2)
  assert.equal(products[0].sku,products[1].sku)
  assert.notEqual(products[0].businessId,products[1].businessId)
  assert.equal(Object.values(s.cashSessionsById)[0].closeSnapshot.expectedCashCents,575000)
  assert.deepEqual(Object.values(s.apiStockBalances),[8000])
})
test('rechaza contrato anterior, lectura parcial y otra cuenta',()=>{
  const raw=clone();raw.schema_version=1
  assert.throws(()=>mapSnapshot(raw,user),GatewayError)
  raw.schema_version=2;raw.complete=false
  assert.throws(()=>mapSnapshot(raw,user),GatewayError)
  assert.throws(()=>mapSnapshot(clone(),{...user,id:'otro'}),GatewayError)
})
test('rechaza un recurso que no pertenece a las empresas autorizadas',()=>{
  const raw=clone()
  Object.values(raw.snapshot.catalogItemsById)[0].businessId='empresa-ajena'
  assert.throws(()=>mapSnapshot(raw,user),{kind:'forbidden'})
})
test('rechaza membresía de otro usuario o inactiva',()=>{
  for(const field of ['userId','status']){
    const raw=clone();Object.values(raw.snapshot.membershipsByBusinessId)[0][field]='ajeno'
    assert.throws(()=>mapSnapshot(raw,user),{kind:'forbidden'})
  }
})
test('rechaza cantidades imprecisas y stock negativo',()=>{
  for(const quantity of [1.2,Number.MAX_SAFE_INTEGER+1,-1]){
    const raw=clone();raw.snapshot.apiStockBalances[Object.keys(raw.snapshot.apiStockBalances)[0]]=quantity
    assert.throws(()=>mapSnapshot(raw,user),GatewayError)
  }
})
test('rechaza un saldo cuya ubicación y artículo son de distintas empresas',()=>{
  const raw=clone()
  const location=Object.values(raw.snapshot.locationsById)[0]
  const product=Object.values(raw.snapshot.catalogItemsById).find(p=>p.businessId!==location.businessId)
  raw.snapshot.apiStockBalances[JSON.stringify([location.id,product.id])]=1000
  assert.throws(()=>mapSnapshot(raw,user),GatewayError)
})
test('una colección ausente no se convierte silenciosamente en vacía',()=>{
  const raw=clone();delete raw.snapshot.salesById
  assert.throws(()=>mapSnapshot(raw,user),GatewayError)
})

function session(request){return {request,getSnapshot:()=>({status:'authenticated',user})}}
test('los comandos usan ruta por empresa, payload original y clave estable',async()=>{
  const raw=clone(), calls=[]
  const businessId=Object.keys(raw.snapshot.businessesById)[0]
  const supplier=Object.values(raw.snapshot.suppliersById)[0]
  const api=createApiGateway(session(async(path,input)=>{
    calls.push({path,input})
    return path==='/api/v1/snapshot'?raw:{id:supplier.id}
  }))
  await api.loadSnapshot(user)
  const result=await api.gateway.createSupplier(businessId,{name:'Proveedor nuevo'})
  assert.equal(result.id,supplier.id)
  assert.equal(calls[1].path,`/api/v1/businesses/${businessId}/suppliers`)
  assert.equal(calls[1].input.body.name,'Proveedor nuevo')
  assert.match(calls[1].input.idempotencyKey,/^[0-9a-f-]{36}$/i)
})
test('permiso se evalúa según la empresa elegida y no como rol global',async()=>{
  const raw=clone(), businessId=Object.keys(raw.snapshot.businessesById)[0]
  raw.snapshot.apiCapabilitiesByBusiness[businessId].resources=false
  let writes=0
  const api=createApiGateway(session(async(path,input)=>{if(input)writes++;return raw}))
  await api.loadSnapshot(user)
  assert.throws(()=>api.gateway.createSupplier(businessId,{name:'Rechazado'}),{kind:'forbidden'})
  assert.equal(writes,0)
})
test('no permite escribir en una empresa fuera de la lectura autorizada',async()=>{
  const api=createApiGateway(session(async()=>clone()));await api.loadSnapshot(user)
  assert.throws(()=>api.gateway.createSupplier('ajena',{name:'Rechazado'}),{kind:'forbidden'})
})
test('respuesta incierta conserva clave y valores; sólo reintenta por decisión del usuario',async()=>{
  const raw=clone(), bid=Object.keys(raw.snapshot.businessesById)[0], supplier=Object.values(raw.snapshot.suppliersById)[0]
  const calls=[];let recovery
  const api=createApiGateway(session(async(path,input)=>{
    if(path==='/api/v1/snapshot')return raw
    calls.push(input)
    if(calls.length===1)throw new GatewayError('network','sin respuesta',undefined,'unknown')
    return {id:supplier.id}
  }),{recovery:value=>{recovery=value}})
  await api.loadSnapshot(user)
  const input={name:'Nombre original'}
  const pending=api.gateway.createSupplier(bid,input)
  input.name='Nombre cambiado'
  await tick();assert.equal(calls.length,1);assert.ok(recovery)
  recovery.retry()
  await pending
  assert.equal(calls.length,2)
  assert.equal(calls[1].idempotencyKey,calls[0].idempotencyKey)
  assert.equal(calls[1].body.name,'Nombre original')
})
test('confirmación seguida de corte de lectura no vuelve a enviar el POST',async()=>{
  const raw=clone(),bid=Object.keys(raw.snapshot.businessesById)[0],supplier=Object.values(raw.snapshot.suppliersById)[0]
  let reads=0,writes=0,recovery
  const api=createApiGateway(session(async(path)=>{
    if(path==='/api/v1/snapshot'){
      if(++reads===2)throw new GatewayError('network','offline')
      return raw
    }
    writes++;return{id:supplier.id}
  }),{recovery:value=>{recovery=value}})
  await api.loadSnapshot(user)
  const pending=api.gateway.createSupplier(bid,{name:'Proveedor'})
  await tick();recovery.retry();await pending
  assert.equal(writes,1)
  assert.equal(reads,3)
})
