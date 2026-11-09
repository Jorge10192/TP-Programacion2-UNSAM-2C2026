import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiHttpError, ApiTransportError } from '../src/api/httpClient.ts'
import {
  createBusinessGateway, parseRealBusiness, parseRealBusinessList, canEditBusiness,
} from '../src/features/businesses/businessGateway.ts'

const userId = 'a49e944c-e8f9-4794-b2c1-8c5524c1bbd6'
const businessId = 'e5a347a3-d8e9-4a1a-9f51-72b1b2539c67'
const otherBusinessId = '713fa8a7-5c21-4c3b-9b39-ade992cf8df2'
const key = '14401a24-37b6-47db-8986-8a048edc005a'
const company = (id = businessId) => ({
  id, name: 'Mi Comercio', category: 'Alimentos', activity_kind: 'PRODUCTOS',
  status: 'ACTIVA', founder_user_id: userId, created_at: '2026-11-09T18:00:00Z',
  membership: { id: '6d8b2916-7d5e-4e19-b596-8532ff6ec0f2', user_id: userId,
    role: 'TITULAR_ADMINISTRATIVO', status: 'ACTIVA', job_title: null },
})
const json = (body, status=200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
})

test('GET /businesses devuelve solo contratos de empresa real y envía Bearer', async () => {
  let calls = 0
  const api = createBusinessGateway('opaco-123', userId, async (url, options) => {
    calls++
    assert.equal(url, '/api/v1/businesses')
    assert.equal(options.method, 'GET')
    assert.equal(options.headers.get('Authorization'), 'Bearer opaco-123')
    return json([company(), company(otherBusinessId)])
  })
  const list = await api.list()
  assert.equal(calls, 1)
  assert.deepEqual(list.map(x => x.id), [businessId, otherBusinessId])
})

test('listado vacío es correcto, no se rellena con fixtures DEMO', async () => {
  const api = createBusinessGateway('token', userId, async () => json([]))
  assert.deepEqual(await api.list(), [])
})

test('GET /businesses/:id obtiene empresa seleccionada, nunca otra', async () => {
  const api = createBusinessGateway('token', userId, async (url) => {
    assert.equal(url, '/api/v1/businesses/' + otherBusinessId)
    return json(company(otherBusinessId))
  })
  assert.equal((await api.get(otherBusinessId)).id, otherBusinessId)
})

test('un negocio ajeno o membresía inactiva no se presenta como propio', () => {
  const foreign = company()
  foreign.membership.user_id = otherBusinessId
  assert.throws(() => parseRealBusiness(foreign, userId), ApiTransportError)
  const inactive = company()
  inactive.membership.status = 'INACTIVA'
  assert.throws(() => parseRealBusiness(inactive, userId), ApiTransportError)
  assert.throws(() => parseRealBusinessList([company(), company()], userId), ApiTransportError)
  assert.throws(() => parseRealBusinessList({}, userId), ApiTransportError)
})

test('creación exige Idempotency-Key UUID y envía cuerpo exacto', async () => {
  const input = { name: 'Nuevo negocio', category: 'Servicios', activity_kind: 'SERVICIOS' }
  let calls = 0
  const api = createBusinessGateway('token', userId, async (url, options) => {
    calls++
    assert.equal(url, '/api/v1/businesses')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers.get('Idempotency-Key'), key)
    assert.deepEqual(JSON.parse(options.body), input)
    return json(company(), 201)
  })
  assert.equal((await api.create(input, key)).id, businessId)
  assert.equal((await api.create(input, key)).id, businessId)
  assert.equal(calls, 2)
  await assert.rejects(api.create(input, 'otra-clave'), TypeError)
  assert.equal(calls, 2)
})

test('falta de respuesta al crear se informa como resultado incierto; sin reintento automático', async () => {
  let calls = 0
  const api = createBusinessGateway('token', userId, async () => {
    calls++
    throw new TypeError('connection reset')
  })
  await assert.rejects(api.create({
    name: 'A', category: 'B', activity_kind: 'MIXTO',
  }, key), error => error instanceof ApiTransportError
    && error.reason === 'network' && error.outcomeUnknown)
  assert.equal(calls, 1)
})

test('PATCH cambia campos del perfil sin incluir los protegidos', async () => {
  const patch = { name: 'Nombre actualizado', activity_kind: 'MIXTO' }
  const api = createBusinessGateway('token', userId, async (url, opts) => {
    assert.equal(url, '/api/v1/businesses/' + businessId)
    assert.equal(opts.method, 'PATCH')
    assert.deepEqual(JSON.parse(opts.body), patch)
    return json({ ...company(), ...patch })
  })
  assert.equal((await api.update(businessId, patch)).name, 'Nombre actualizado')
})

test('no se permiten rutas empresariales con URL inyectada', async () => {
  let calls = 0
  const api = createBusinessGateway('token', userId, async () => {
    calls++
    return json(company())
  })
  await assert.rejects(api.get('../other'), TypeError)
  await assert.rejects(api.get('//other'), TypeError)
  await assert.rejects(api.update('/api/v1/admin', { name: 'x' }), TypeError)
  assert.equal(calls, 0)
})

test('roles y estados limitan la edición visible; el servidor reautoriza', () => {
  const original = parseRealBusiness(company(), userId)
  assert.equal(canEditBusiness(original), true)
  assert.equal(canEditBusiness({ ...original, status: 'SUSPENDIDA' }), false)
  assert.equal(canEditBusiness({ ...original, membership: { ...original.membership, role: 'TRABAJADOR' } }), false)
  assert.equal(canEditBusiness({ ...original, membership: { ...original.membership, role: 'ADMINISTRADOR' } }), true)
})

test('403, 404 y 401 de backend siguen siendo HTTP, sin usar datos DEMO', async () => {
  for (const status of [401, 403, 404]) {
    const api = createBusinessGateway('token', userId, async () => json({ detail: 'Reservado' }, status))
    await assert.rejects(api.get(businessId),
      error => error instanceof ApiHttpError && error.status === status)
  }
})

test('datos parciales, UUID incorrecto y membresía cruzada no son válidos', () => {
  assert.throws(() => parseRealBusiness({ ...company(), id: 'demo-walos' }, userId), ApiTransportError)
  assert.throws(() => parseRealBusiness({ ...company(), membership: null }, userId), ApiTransportError)
  assert.throws(() => parseRealBusiness({ ...company(), status: 'FICTICIA' }, userId), ApiTransportError)
})
