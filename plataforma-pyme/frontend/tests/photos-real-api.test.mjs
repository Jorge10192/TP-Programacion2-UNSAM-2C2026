import test from 'node:test'
import assert from 'node:assert/strict'
import { createPhotoGateway, photoCollectionPath, MAX_UPLOAD_BYTES } from '../src/features/photos/photoGateway.ts'
import { ApiHttpError, ApiTransportError } from '../src/api/httpClient.ts'

const b='e5a347a3-d8e9-4a1a-9f51-72b1b2539c67'
const id='713fa8a7-5c21-4c3b-9b39-ade992cf8df2'
const photo={id,owner_type:'CATALOG',position:0,width:34,height:25,byte_size:55,created_at:'2026-11-12T12:00:00Z'}

test('rutas de fotos no aceptan tenants ni recursos arbitrarios',()=>{
  assert.equal(photoCollectionPath({kind:'PROFILE'}),'/me')
  assert.equal(photoCollectionPath({kind:'BUSINESS',businessId:b}),'/businesses/'+b)
  assert.equal(photoCollectionPath({kind:'CATALOG',businessId:b,resourceId:id}),'/businesses/'+b+'/catalog/'+id)
  assert.equal(photoCollectionPath({kind:'SUPPLIER',businessId:b,resourceId:id}),'/businesses/'+b+'/suppliers/'+id)
  assert.throws(()=>photoCollectionPath({kind:'BUSINESS',businessId:'../logout'}),TypeError)
  assert.throws(()=>photoCollectionPath({kind:'SUPPLIER',businessId:b,resourceId:'whatever'}),TypeError)
})

test('lectura privada: Bearer, same-origin, nunca cookies ni URLs externas',async()=>{
  let requests=0
  const mock=async (url,opts)=>{
    requests++
    assert.equal(url,'/api/v1/photos/businesses/'+b+'/catalog/'+id)
    assert.equal(opts.method,'GET')
    assert.equal(opts.headers.Authorization,'Bearer sesion-real')
    assert.equal(opts.credentials,'omit')
    assert.equal(opts.cache,'no-store')
    assert.equal(opts.redirect,'error')
    return new Response(JSON.stringify([photo]),{status:200,headers:{'Content-Type':'application/json'}})
  }
  const gateway=createPhotoGateway('sesion-real',{kind:'CATALOG',businessId:b,resourceId:id},mock)
  const result=await gateway.list()
  assert.deepEqual(result,[photo])
  assert.equal(requests,1)
  await assert.rejects(gateway.content('token-invalido'),TypeError)
})

test('validación de formatos y tamaño antes de POST, errores HTTP con estado',async()=>{
  let calls=0
  const g=createPhotoGateway('sesion',{kind:'PROFILE'},async()=>{
    calls++
    return new Response(JSON.stringify({detail:'No tenés permiso'}),{status:403,headers:{'Content-Type':'application/json'}})
  })
  await assert.rejects(g.upload(new File(['<svg/>'],'ataque.svg',{type:'image/svg+xml'})),RangeError)
  await assert.rejects(g.upload(new File([new Uint8Array(MAX_UPLOAD_BYTES+1)],'grande.png',{type:'image/png'})),RangeError)
  assert.equal(calls,0)
  await assert.rejects(g.upload(new File(['png'],'x.png',{type:'image/png'})),err=>err instanceof ApiHttpError&&err.status===403)
  assert.equal(calls,1)
})

test('contrato de lista incompatible se rechaza sin exponer bytes',async()=>{
  const gateway=createPhotoGateway('sesion',{kind:'CATALOG',businessId:b,resourceId:id},async()=>
    new Response(JSON.stringify([{...photo,owner_type:'BUSINESS'}]),{headers:{'Content-Type':'application/json'}}))
  await assert.rejects(gateway.list(),err=>err instanceof ApiTransportError&&err.reason==='invalid-response')
})
