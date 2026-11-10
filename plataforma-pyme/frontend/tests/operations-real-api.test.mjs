import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiHttpError, ApiTransportError } from '../src/api/httpClient.ts'
import {
  createOperationsGateway, parseLocation, parseTeamMember, parseInvitation,
  parseAssignment, canManageLocations, canManageTeam, canReadTeam, canAcceptInvitationToken,
} from '../src/features/businesses/realOperationsGateway.ts'

const userId = 'a49e944c-e8f9-4794-b2c1-8c5524c1bbd6'
const a = 'e5a347a3-d8e9-4a1a-9f51-72b1b2539c67'
const b = '713fa8a7-5c21-4c3b-9b39-ade992cf8df2'
const locationId = 'bc13c8ee-aa27-43a3-bc92-798b5c9cccdc'
const memberId = '72b92a5d-f268-4ac6-9c98-a1a64f5f051b'
const token = 'E'.repeat(43)
const json = (body, status=200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
})
const company = (id=a) => ({ id, name:'Empresa TEST',category:'Rubro',activity_kind:'MIXTO',status:'ACTIVA',
  founder_user_id:userId,created_at:'2026-11-10T00:00:00Z',
  membership:{id:memberId,user_id:userId,role:'TITULAR_ADMINISTRATIVO',status:'ACTIVA',job_title:null} })
const loc = (business_id=a) => ({ id:locationId,business_id,name:'Sede central',kind:'LOCAL',
  address:'',map_url:'',can_sell:true,can_store:true,is_primary:false,status:'ACTIVA',
  created_at:'2026-11-10T00:00:00Z',updated_at:'2026-11-10T00:00:00Z' })
const person = () => ({id:memberId,user_id:userId,email:'test@example.com',
  display_name:'Integrante',role:'TRABAJADOR',status:'ACTIVA',job_title:null})
const assignment = (business_id=a, location_id=locationId) => ({
  business_id,location_id,membership_id:memberId,user_id:userId,status:'ACTIVA',
  created_at:'2026-11-10T00:00:00Z',updated_at:'2026-11-10T00:00:00Z',revoked_at:null,
})
const invitation = () => ({id:locationId,business_id:a,email:'empleado@example.com',
  role:'TRABAJADOR',status:'PENDIENTE',expires_at:'2026-11-20T00:00:00Z',
  invitation_token:token })

test('lista sedes en ruta tenant y con token opaco', async () => {
  const api=createOperationsGateway('opaque',userId,async (url,init)=>{
    assert.equal(url, '/api/v1/businesses/'+a+'/locations')
    assert.equal(init.headers.get('Authorization'),'Bearer opaque')
    return json([loc()])
  })
  assert.deepEqual((await api.locations(a)).map(x=>x.id),[locationId])
})

test('lectura individual de empresa verifica actor autenticado',async()=>{
  const api=createOperationsGateway('opaque',userId,async(url)=>{assert.equal(url,'/api/v1/businesses/'+a);return json(company())})
  assert.equal((await api.business(a)).membership.user_id,userId)
})

test('respuestas de sede o asignación fuera de tenant fallan cerradas',()=>{
  assert.throws(()=>parseLocation(loc(b),a),ApiTransportError)
  assert.throws(()=>parseAssignment(assignment(b),a,locationId),ApiTransportError)
  assert.throws(()=>parseAssignment(assignment(a,b),a,locationId),ApiTransportError)
  assert.throws(()=>parseLocation({...loc(),can_sell:'true'},a),ApiTransportError)
})

test('crear sede solo envía datos permitidos y POST correcto', async()=>{
  const input={name:'Feria',kind:'FERIA',address:'',map_url:'',can_sell:true,can_store:false}
  const api=createOperationsGateway('opaque',userId,async(url,init)=>{
    assert.equal(url,'/api/v1/businesses/'+a+'/locations')
    assert.equal(init.method,'POST')
    assert.deepEqual(JSON.parse(init.body),input)
    assert.equal(init.headers.has('Idempotency-Key'),false)
    return json({...loc(),...input},201)
  })
  assert.equal((await api.createLocation(a,input)).kind,'FERIA')
})

test('PATCH de sede, estado y PUT principal usan rutas exactas',async()=>{
  let calls=0
  const api=createOperationsGateway('opaque',userId,async(url,init)=>{
    calls++
    if(calls===1){assert.equal(url,'/api/v1/businesses/'+a+'/locations/'+locationId);assert.equal(init.method,'PATCH');assert.deepEqual(JSON.parse(init.body),{name:'Local'})}
    if(calls===2){assert.equal(url,'/api/v1/businesses/'+a+'/locations/'+locationId+'/status');assert.equal(init.method,'PATCH');assert.deepEqual(JSON.parse(init.body),{status:'PAUSADA'})}
    if(calls===3){assert.equal(url,'/api/v1/businesses/'+a+'/locations/'+locationId+'/primary');assert.equal(init.method,'PUT');assert.equal(init.body,undefined)}
    return json(loc())
  })
  await api.updateLocation(a,locationId,{name:'Local'})
  await api.setLocationStatus(a,locationId,'PAUSADA')
  await api.makePrimary(a,locationId)
  assert.equal(calls,3)
})

test('equipo devuelve DTOs correctos; no permite inventar miembros',async()=>{
  const api=createOperationsGateway('opaque',userId,async(url)=>{
    assert.equal(url,'/api/v1/businesses/'+a+'/memberships')
    return json([person()])
  })
  assert.equal((await api.team(a))[0].role,'TRABAJADOR')
  assert.throws(()=>parseTeamMember({...person(),id:'demo-member'}),ApiTransportError)
})

test('cambio de rol o estado de membresía hace PATCH sin titularidad',async()=>{
  const api=createOperationsGateway('opaque',userId,async(url,init)=>{
    assert.equal(url,'/api/v1/businesses/'+a+'/memberships/'+memberId)
    assert.equal(init.method,'PATCH')
    assert.deepEqual(JSON.parse(init.body),{status:'INACTIVA'})
    return json({...person(),status:'INACTIVA'})
  })
  assert.equal((await api.changeMember(a,memberId,{status:'INACTIVA'})).status,'INACTIVA')
})

test('invitación solo permite token mostrado una vez con rol correcto',async()=>{
  const api=createOperationsGateway('opaque',userId,async(url,init)=>{
    assert.equal(url,'/api/v1/businesses/'+a+'/invitations')
    assert.equal(init.method,'POST')
    assert.deepEqual(JSON.parse(init.body),{email:'empleado@example.com',role:'TRABAJADOR'})
    return json(invitation(),201)
  })
  assert.equal((await api.invite(a,{email:'empleado@example.com',role:'TRABAJADOR'})).invitation_token,token)
  assert.throws(()=>parseInvitation({...invitation(),business_id:b},a),ApiTransportError)
  assert.throws(()=>parseInvitation({...invitation(),invitation_token:'corto'},a),ApiTransportError)
})

test('aceptación requiere token de 43 caracteres, no usa query string',async()=>{
  const api=createOperationsGateway('opaque',userId,async(url,init)=>{
    assert.equal(url,'/api/v1/invitations/accept')
    assert.equal(init.method,'POST')
    assert.equal(init.headers.get('Authorization'),'Bearer opaque')
    assert.deepEqual(JSON.parse(init.body),{invitation_token:token})
    return json(company())
  })
  assert.equal(canAcceptInvitationToken(token),true)
  assert.equal(canAcceptInvitationToken('demo'),false)
  assert.equal((await api.acceptInvitation(token)).id,a)
  await assert.rejects(api.acceptInvitation('secreto-malo'),TypeError)
})

test('listado y mutación de asignaciones usan membresía, sede y tenant',async()=>{
  const api=createOperationsGateway('opaque',userId,async(url,init)=>{
    assert.ok(url.startsWith('/api/v1/businesses/'+a+'/locations/'+locationId+'/assignments'))
    if(init.method==='GET') return json([assignment()])
    assert.equal(init.method,'PUT')
    assert.equal(url,'/api/v1/businesses/'+a+'/locations/'+locationId+'/assignments/'+memberId)
    assert.deepEqual(JSON.parse(init.body),{status:'REVOCADA'})
    return json({...assignment(),status:'REVOCADA',revoked_at:'2026-11-10T00:00:00Z'})
  })
  assert.equal((await api.assignments(a,locationId)).length,1)
  assert.equal((await api.setAssignment(a,locationId,memberId,'REVOCADA')).status,'REVOCADA')
})

test('rol y empresa suspendida limitan controles; API autoriza efectivamente',()=>{
  const companyA=company()
  assert.equal(canManageLocations(companyA),true)
  assert.equal(canManageTeam(companyA),true)
  assert.equal(canReadTeam(companyA),true)
  const admin={...companyA,membership:{...companyA.membership,role:'ADMINISTRADOR'}}
  assert.equal(canReadTeam(admin),true);assert.equal(canManageTeam(admin),false)
  const worker={...companyA,membership:{...companyA.membership,role:'TRABAJADOR'}}
  assert.equal(canManageLocations(worker),false);assert.equal(canReadTeam(worker),false)
  assert.equal(canManageTeam({...companyA,status:'SUSPENDIDA'}),false)
})

test('recurso empresarial ajeno queda en error HTTP 404; sin fallback DEMO',async()=>{
  const api=createOperationsGateway('opaque',userId,async()=>json({detail:'Recurso no disponible'},404))
  await assert.rejects(api.locations(b),err=>err instanceof ApiHttpError&&err.status===404)
  await assert.rejects(api.team(b),err=>err instanceof ApiHttpError&&err.status===404)
})

test('validación de UUID impide rutas con inyección o IDs DEMO',async()=>{
  let requests=0
  const api=createOperationsGateway('opaque',userId,async()=>{requests++;return json([])})
  await assert.rejects(api.locations('demo-business'),TypeError)
  await assert.rejects(api.assignments(a,'../admin'),TypeError)
  await assert.rejects(api.changeMember(a,'//other',{status:'ACTIVA'}),TypeError)
  assert.equal(requests,0)
})

test('POST sin respuesta es incierto y no tiene reintentos automáticos',async()=>{
  let calls=0
  const api=createOperationsGateway('opaque',userId,async()=>{calls++;throw new TypeError('offline')})
  await assert.rejects(api.invite(a,{email:'empleado@example.com',role:'TRABAJADOR'}),
    err=>err instanceof ApiTransportError&&err.outcomeUnknown)
  assert.equal(calls,1)
})
