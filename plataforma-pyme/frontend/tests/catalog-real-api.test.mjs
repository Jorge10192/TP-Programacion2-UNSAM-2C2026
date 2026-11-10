import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiHttpError, ApiTransportError } from '../src/api/httpClient.ts'
import {
  CATALOG_PAGE_SIZE, MAX_CENTS, centsToPesos, pesosToCents, parseCatalogItem,
  createCatalogGateway, canManageCatalog, validateCatalogDraft,
} from '../src/features/catalog/realCatalogGateway.ts'

const a='e5a347a3-d8e9-4a1a-9f51-72b1b2539c67'
const b='713fa8a7-5c21-4c3b-9b39-ade992cf8df2'
const id='bc13c8ee-aa27-43a3-bc92-798b5c9cccdc'
const good={id,business_id:a,name:'Producto TEST',kind:'REVENTA',item_type:'BIEN',
  category:'General',sku:'SKU-1',unit:'UNIDAD',description:'',observations:'',
  sellable:true,price_cents:124055,reference_cost_cents:10000,status:'ACTIVO',
  created_at:'2026-11-10T00:00:00Z',updated_at:'2026-11-10T00:00:00Z'}
const payload=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}})
const form={name:'Producto nuevo',kind:'REVENTA',category:'General',sku:null,unit:'UNIDAD',
  description:'',observations:'',sellable:true,price_cents:124055,reference_cost_cents:10000}

test('pesos a centavos es exacto sin multiplicar floats, acepta coma y punto',()=>{
  assert.equal(pesosToCents('1,01'),101)
  assert.equal(pesosToCents('0.09'),9)
  assert.equal(pesosToCents('1250,55'),125055)
  assert.equal(pesosToCents(''),null)
  assert.equal(pesosToCents('0'),0)
  assert.equal(centsToPesos(101),'1,01')
  assert.equal(centsToPesos(MAX_CENTS),'999999999,99')
  assert.equal(centsToPesos(null),'')
})

test('rechaza separador de miles, exceso de decimales, negativos y overflows',()=>{
  for(const str of ['-1','1.000,25','0.999','1e4','abc','999999999999','1,2,3']){
    assert.throws(()=>pesosToCents(str),RangeError)
  }
})

test('valida compatibilidad SERVICIO/unidad y el SKU antes de POST',()=>{
  assert.doesNotThrow(()=>validateCatalogDraft(form))
  assert.throws(()=>validateCatalogDraft({...form,kind:'SERVICIO'}),RangeError)
  assert.throws(()=>validateCatalogDraft({...form,unit:'SERVICIO'}),RangeError)
  assert.throws(()=>validateCatalogDraft({...form,sku:'SKU MALO'}),RangeError)
  assert.throws(()=>validateCatalogDraft({...form,name:'X'}),RangeError)
})

test('listar 100 resultados pide offset=0 y limit=100; no usa GET sin límite',async()=>{
  const api=createCatalogGateway('opaque',a,async(url,init)=>{
    assert.equal(url,'/api/v1/businesses/'+a+'/catalog?offset=0&limit=100')
    assert.equal(init.method,'GET')
    assert.equal(init.headers.get('Authorization'),'Bearer opaque')
    return payload([good])
  })
  assert.equal(CATALOG_PAGE_SIZE,100)
  assert.equal((await api.page(0)).length,1)
})

test('segunda página consulta offset real y límite de backend',async()=>{
  const api=createCatalogGateway('opaque',a,async(url)=>{
    assert.equal(url,'/api/v1/businesses/'+a+'/catalog?offset=100&limit=100')
    return payload([])
  })
  assert.deepEqual(await api.page(100),[])
})

test('validación de paginación rechaza offset negativo, limit>500 y fracciones',async()=>{
  let count=0
  const api=createCatalogGateway('opaque',a,async()=>{count++;return payload([])})
  for(const params of [[-1,100],[0,501],[0,0],[1.2,100],[0,1.1]]){
    await assert.rejects(api.page(...params),RangeError)
  }
  assert.equal(count,0)
})

test('rechaza página de 101 elementos cuando se pidió 100',async()=>{
  const api=createCatalogGateway('opaque',a,async()=>payload(Array.from({length:101},()=>good)))
  await assert.rejects(api.page(0),ApiTransportError)
})

test('un artículo ajeno a la empresa no se muestra; tampoco UUID DEMO',()=>{
  assert.throws(()=>parseCatalogItem({...good,business_id:b},a),ApiTransportError)
  assert.throws(()=>parseCatalogItem({...good,id:'walos-demo'},a),ApiTransportError)
  assert.throws(()=>parseCatalogItem({...good,price_cents:1.25},a),ApiTransportError)
  assert.throws(()=>parseCatalogItem({...good,kind:'SERVICIO',unit:'UNIDAD'},a),ApiTransportError)
})

test('no admite servicios mal tipados ni item_type inconsistente',()=>{
  assert.throws(()=>parseCatalogItem({...good,item_type:'SERVICIO'},a),ApiTransportError)
  assert.doesNotThrow(()=>parseCatalogItem({...good,kind:'SERVICIO',unit:'SERVICIO',item_type:'SERVICIO'},a))
})

test('GET detalle valida UUID y tenant',async()=>{
  const api=createCatalogGateway('opaque',a,async(url)=>{
    assert.equal(url,'/api/v1/businesses/'+a+'/catalog/'+id)
    return payload(good)
  })
  assert.equal((await api.get(id)).id,id)
  await assert.rejects(api.get('../admin'),TypeError)
})

test('creación envía centavos enteros, sin stock ficticio',async()=>{
  let calls=0
  const api=createCatalogGateway('opaque',a,async(url,init)=>{
    calls++
    assert.equal(url,'/api/v1/businesses/'+a+'/catalog')
    assert.equal(init.method,'POST')
    assert.equal(init.headers.has('Idempotency-Key'),false)
    assert.deepEqual(JSON.parse(init.body),form)
    return payload(good,201)
  })
  assert.equal((await api.create(form)).id,id)
  assert.equal(calls,1)
})

test('PATCH y cambio de estado tienen contratos y rutas separados',async()=>{
  let calls=0
  const api=createCatalogGateway('opaque',a,async(url,init)=>{
    calls++
    assert.equal(url,'/api/v1/businesses/'+a+'/catalog/'+id+(calls===2?'/status':''))
    assert.equal(init.method,'PATCH')
    assert.deepEqual(JSON.parse(init.body),calls===1?{name:'Nuevo'}:{status:'INACTIVO'})
    return payload({...good,status:calls===2?'INACTIVO':'ACTIVO'})
  })
  assert.equal((await api.update(id,{name:'Nuevo'})).id,id)
  assert.equal((await api.status(id,'INACTIVO')).status,'INACTIVO')
  assert.equal(calls,2)
})

test('nombre SKU y permisos de edición son restricciones del backend',()=>{
  assert.equal(canManageCatalog('TITULAR_ADMINISTRATIVO','ACTIVA','ACTIVA'),true)
  assert.equal(canManageCatalog('ADMINISTRADOR','ACTIVA','ACTIVA'),true)
  assert.equal(canManageCatalog('TRABAJADOR','ACTIVA','ACTIVA'),false)
  assert.equal(canManageCatalog('TITULAR_ADMINISTRATIVO','ACTIVA','SUSPENDIDA'),false)
  assert.equal(canManageCatalog('ADMINISTRADOR','INACTIVA','ACTIVA'),false)
})

test('errores de tenant 403/404/409 se conservan como HTTP sin fallback DEMO',async()=>{
  for(const status of [403,404,409]){
    const api=createCatalogGateway('opaque',a,async()=>payload({detail:'Acceso no disponible'},status))
    await assert.rejects(api.page(0),err=>err instanceof ApiHttpError&&err.status===status)
  }
})

test('error de conexión en POST no reintenta y resultado puede ser incierto',async()=>{
  let count=0
  const api=createCatalogGateway('opaque',a,async()=>{count++;throw new TypeError('offline')})
  await assert.rejects(api.create(form),err=>err instanceof ApiTransportError&&err.outcomeUnknown)
  assert.equal(count,1)
})
