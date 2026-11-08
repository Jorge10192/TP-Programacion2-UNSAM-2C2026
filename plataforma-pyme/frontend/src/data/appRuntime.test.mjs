import test from 'node:test'
import assert from 'node:assert/strict'
import { createAppRuntime } from './appRuntime.ts'
import { createSession } from './api/session.ts'
import { emptySnapshot } from './models.ts'
import { unavailableGateway } from './gateway.ts'

const json = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
const user = {id:'00000000-0000-4000-8000-000000000003',display_name:'titular',email:'titular@example.com',status:'ACTIVO'}
const snapshot = () => ({ ...emptySnapshot, profile: { ...emptySnapshot.profile, id: '00000000-0000-4000-8000-000000000003', displayName: 'titular' } })
const tick = () => new Promise(resolve => setImmediate(resolve))

test('API no carga demo ni acepta fixtures cuando falla la carga del servidor', async t => {
  const session = createSession({ fetcher: async url => url === '/api/v1/auth/login' ? json({ access_token: 'test-only', expires_at: new Date(Date.now()+43_200_000).toISOString() }) : json(user) })
  const runtime = createAppRuntime({ mode: 'api', session, loadDemo: assert.fail,
    apiFactory: () => ({ gateway: unavailableGateway(), loadSnapshot: async () => { throw new Error('503 datos no disponibles') } }) })
  t.after(() => runtime.dispose())
  await runtime.start()
  assert.equal(runtime.getSnapshot().snapshot, null)
  await runtime.login('titular', 'temporary')
  await tick()
  assert.equal(runtime.getSnapshot().mode, 'api')
  assert.equal(runtime.getSnapshot().loadState, 'error')
  assert.equal(runtime.getSnapshot().snapshot, null)
  assert.equal(runtime.getSnapshot().capabilities.photos, false)
  assert.equal(runtime.getSnapshot().capabilities.qr, false)
})

test('caducar y reingresar conserva el snapshot montado en memoria hasta recuperar datos', async t => {
  let denied = false
  let loads = 0
  const session = createSession({ fetcher: async url => {
    if (url === '/api/v1/auth/login') return json({ access_token: 'test-only', expires_at: new Date(Date.now()+43_200_000).toISOString() })
    if (url === '/api/v1/auth/me') return json(user)
    return new Response(JSON.stringify({ detail: 'expired' }), { status: denied ? 401 : 200, headers: { 'Content-Type': 'application/json' } })
  } })
  const runtime = createAppRuntime({ mode: 'api', session, loadDemo: assert.fail,
    apiFactory: () => ({ gateway: unavailableGateway(), loadSnapshot: async () => { loads++; return snapshot() } }) })
  t.after(() => runtime.dispose())
  await runtime.start()
  await runtime.login('titular', 'temporary')
  await tick()
  const before = runtime.getSnapshot().snapshot
  assert.ok(before)
  denied = true
  await assert.rejects(session.request('/private'), { kind: 'unauthenticated' })
  assert.equal(runtime.getSnapshot().session.status, 'expired')
  assert.equal(runtime.getSnapshot().snapshot, before)
  await runtime.login('titular', 'temporary')
  await tick()
  assert.equal(runtime.getSnapshot().session.status, 'authenticated')
  assert.equal(loads, 2)
})

test('logout descarta una lectura tardÃ­a de negocio del usuario anterior', async t => {
  let resolveSnapshot
  const pending = new Promise(resolve => { resolveSnapshot = resolve })
  const session = createSession({ fetcher: async url => url === '/api/v1/auth/login' ? json({ access_token: 'test-only', expires_at: new Date(Date.now()+43_200_000).toISOString() }) : url === '/api/v1/auth/me' ? json(user) : new Response(null, { status: 204 }) })
  const runtime = createAppRuntime({ mode: 'api', session, loadDemo: assert.fail,
    apiFactory: () => ({ gateway: unavailableGateway(), loadSnapshot: () => pending }) })
  t.after(() => runtime.dispose())
  await runtime.start()
  await runtime.login('titular', 'temporary')
  await runtime.logout()
  resolveSnapshot(snapshot())
  await tick()
  assert.equal(runtime.getSnapshot().session.status, 'anonymous')
  assert.equal(runtime.getSnapshot().snapshot, null)
})

test('ciclo de montaje de React conserva una sola suscripciÃ³n a demo y reanuda actualizaciones', async t => {
  const listeners = new Set()
  let current = { ...emptySnapshot, mode: 'demo' }
  const runtime = createAppRuntime({ mode: 'demo', loadDemo: async () => ({
    demoGateway: unavailableGateway(), demoStore: {
      getSnapshot: () => current,
      subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    },
  }) })
  t.after(() => runtime.dispose())
  await runtime.start()
  runtime.stop()
  await runtime.start()
  assert.equal(listeners.size, 1)
  current = { ...current, version: 1, profile: { ...current.profile, displayName: 'Actualizado' } }
  listeners.forEach(listener => listener())
  assert.equal(runtime.getSnapshot().snapshot.profile.displayName, 'Actualizado')
})
