import test from 'node:test'
import assert from 'node:assert/strict'

import { ApiTransportError } from '../src/api/httpClient.ts'
import {
  createQrIntentGateway, parseQrSummary, QR_HISTORY_PAGE_SIZE,
} from '../src/features/payments/qrIntentGateway.ts'
import { qrStatusPresentation, qrEffectiveStatus, qrNeedsRecovery } from '../src/features/payments/qrUx.ts'
import {
  REAL_WORKSPACE_ITEMS, realWorkspaceBusinessId, realWorkspaceHref, realWorkspaceTitle,
} from '../src/features/auth/realWorkspaceNavigation.ts'

const business='e5a347a3-d8e9-4a1a-9f51-72b1b2539c67'
const other='713fa8a7-5c21-4c3b-9b39-ade992cf8df2'
const intentId='a49e944c-e8f9-4794-b2c1-8c5524c1bbd6'
const actor='239dc893-963b-4148-a97d-6b83202d9da1'
const sale='69a23c50-bcba-45da-a5e2-423f0466dabf'
const summary=(status='ESPERANDO_PAGO')=>({
  id:intentId, business_id:business, location_id:null, created_by_id:actor,
  provider:'MOCK_QA',currency:'ARS',status,reference:'PYME-DEMO-'+'A'.repeat(32),
  total_cents:2450,created_at:'2026-11-12T17:00:00Z',
  expires_at:'2026-11-12T17:15:00Z',
  sale_id:status==='FINALIZADA'?sale:null,
})
const json=(payload,status=200)=>new Response(JSON.stringify(payload),{
  status,headers:{'Content-Type':'application/json'},
})

test('B5 ruta de historial QR pertenece a empresa y se integra al menú REAL',()=>{
  assert.equal(realWorkspaceBusinessId(realWorkspaceHref(business,'cobros-qr')),business)
  assert.equal(realWorkspaceTitle(realWorkspaceHref(business,'cobros-qr')),'Cobros QR')
  assert.equal(REAL_WORKSPACE_ITEMS.some(x=>x.section==='cobros-qr'),true)
  assert.equal(realWorkspaceBusinessId('/real/empresas/'+business+'/cobros-qr/'+intentId),null)
  assert.equal(realWorkspaceBusinessId('/real/empresas/'+other+'/cobros-qr'),other)
})

test('B5 GET historial: Bearer, offset, limit y cero mutaciones',async()=>{
  const calls=[]
  const api=createQrIntentGateway('token-test',business,async(url,options)=>{
    calls.push([url,options.method,options.headers.get('Authorization')])
    return json([summary()])
  })
  const result=await api.list(20,20)
  assert.equal(result.length,1)
  assert.equal(result[0].total_cents,2450)
  assert.deepEqual(calls,[[
    '/api/v1/businesses/'+business+'/qr-payment-intents?offset=20&limit=20',
    'GET','Bearer token-test',
  ]])
  assert.equal(QR_HISTORY_PAGE_SIZE,20)
})

test('B5 historial falla cerrado con empresa ajena, monto falso o comprobante incoherente',async()=>{
  for(const row of [
    {...summary(),business_id:other},
    {...summary(),total_cents:-20},
    {...summary('FINALIZADA'),sale_id:null},
    {...summary('RECHAZADA'),sale_id:sale},
    {...summary(),reference:'orden de otro proveedor'},
  ]){
    assert.throws(()=>parseQrSummary(row,business),ApiTransportError)
    const api=createQrIntentGateway('token-test',business,async()=>json([row]))
    await assert.rejects(api.list(),ApiTransportError)
  }
})

test('B5 valida paginación y rechaza IDs duplicados o respuestas demasiado grandes',async()=>{
  const api=createQrIntentGateway('token-test',business,async()=>json([summary(),summary()]))
  await assert.rejects(api.list(0,20),ApiTransportError)
  assert.throws(()=>api.list(-1),RangeError)
  assert.throws(()=>api.list(0,51),RangeError)
  assert.throws(()=>api.list(1.5,20),RangeError)
  const many=createQrIntentGateway('token-test',business,async()=>json(Array.from({length:21},()=>summary())))
  await assert.rejects(many.list(0,20),ApiTransportError)
})

test('B5 estados de negocio nunca confunden aprobación ficticia con venta QA finalizada',()=>{
  assert.match(qrStatusPresentation('APROBADA_DEMO').description,/Todavía no hay venta/)
  assert.match(qrStatusPresentation('FINALIZADA').description,/venta interna/)
  assert.match(qrStatusPresentation('REQUIERE_REVISION').description,/No se descontó stock/)
  assert.equal(qrNeedsRecovery('INDETERMINADA'),true)
  assert.equal(qrNeedsRecovery('APROBADA_DEMO'),false)
  assert.equal(qrEffectiveStatus('ESPERANDO_PAGO','2026-01-01T00:00:00Z',Date.parse('2026-02-01T00:00:00Z')),'EXPIRADA')
  assert.equal(qrEffectiveStatus('APROBADA_DEMO','2026-01-01T00:00:00Z',Date.parse('2026-02-01T00:00:00Z')),'APROBADA_DEMO')
  assert.equal(qrEffectiveStatus('FINALIZADA','2026-01-01T00:00:00Z',Date.parse('2026-02-01T00:00:00Z')),'FINALIZADA')
})
