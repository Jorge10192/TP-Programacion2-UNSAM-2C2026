import test from 'node:test'
import assert from 'node:assert/strict'
import { createSession, SESSION_KEY } from './session.ts'
import { createHttpClient, GatewayError } from './httpClient.ts'
import { parseAppMode } from '../config.ts'

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const user = { id: 3, nombre: 'titular', rol: 'administrador', activo: true }
function storage() {
  const values = new Map()
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}

test('modo ausente conserva demo y una configuración errónea no cae en demo', () => {
  assert.equal(parseAppMode(undefined), 'demo')
  assert.equal(parseAppMode('api'), 'api')
  assert.throws(() => parseAppMode('online'), /VITE_APP_MODE/)
})

test('el token de pestaña sobrevive F5, se comprueba con me y nunca persiste contraseña ni negocio', async t => {
  const tab = storage()
  const calls = []
  const fetcher = async (url, init) => {
    calls.push({ url, init })
    if (url === '/auth/login') return json({ access_token: 'session-only-test', expires_in: 28800 })
    if (url === '/auth/me') return json(user)
    if (url === '/auth/logout') return new Response(null, { status: 204 })
    throw new Error('unexpected')
  }
  const first = createSession({ fetcher, storage: tab })
  t.after(() => first.dispose())
  await first.start()
  assert.equal(first.getSnapshot().status, 'anonymous')
  await first.login('titular', 'password-in-memory')
  assert.equal(first.getSnapshot().user.id, 'user:3')
  const persisted = JSON.parse(tab.getItem(SESSION_KEY))
  assert.deepEqual(Object.keys(persisted).sort(), ['expiresAt', 'token'])
  assert.ok(!tab.getItem(SESSION_KEY).includes('password-in-memory'))
  assert.equal(tab.values.size, 1)
  const restored = createSession({ fetcher, storage: tab })
  t.after(() => restored.dispose())
  await restored.start()
  assert.equal(restored.getSnapshot().status, 'authenticated')
  assert.equal(calls.at(-1).url, '/auth/me')
  assert.equal(calls.at(-1).init.headers.Authorization, 'Bearer session-only-test')
  await restored.logout()
  assert.equal(tab.getItem(SESSION_KEY), null)
  assert.equal(restored.getSnapshot().status, 'anonymous')
})

test('403 conserva la sesión; 401 la caduca una sola vez, limpia token y retiene identidad para reingreso', async t => {
  const tab = storage()
  let protectedStatus = 403
  const client = createSession({ storage: tab, fetcher: async (url) => {
    if (url === '/auth/login') return json({ access_token: 'test-session', expires_in: 28800 })
    if (url === '/auth/me') return json(user)
    return json({ detail: 'denegado' }, protectedStatus)
  } })
  t.after(() => client.dispose())
  await client.start()
  await client.login('titular', 'not-persisted')
  await assert.rejects(client.request('/protected'), { kind: 'forbidden' })
  assert.equal(client.getSnapshot().status, 'authenticated')
  protectedStatus = 401
  await assert.rejects(client.request('/protected'), { kind: 'unauthenticated' })
  assert.equal(client.getSnapshot().status, 'expired')
  assert.equal(client.getSnapshot().user.id, 'user:3')
  assert.equal(tab.getItem(SESSION_KEY), null)
})

test('error de login no se transforma en sesión ni conserva contraseña', async t => {
  const tab = storage()
  const client = createSession({ storage: tab, fetcher: async () => json({ detail: 'Credenciales inválidas' }, 401) })
  t.after(() => client.dispose())
  await client.start()
  await client.login('titular', 'bad-password')
  assert.equal(client.getSnapshot().status, 'anonymous')
  assert.match(client.getSnapshot().error, /Credenciales inválidas/)
  assert.equal(tab.values.size, 0)
})

test('una respuesta tardía no autentica después de cerrar sesión', async t => {
  let release
  const pending = new Promise(resolve => { release = resolve })
  const client = createSession({ fetcher: async () => pending })
  t.after(() => client.dispose())
  const login = client.login('titular', 'temporary')
  await client.logout()
  release(json({ access_token: 'late-test', expires_in: 28800 }))
  await login
  assert.equal(client.getSnapshot().status, 'anonymous')
  assert.equal(client.getSnapshot().user, null)
})

test('HTML 200 no es dato API; corte de red tras POST queda incierto y no se reintenta automáticamente', async () => {
  const auth = () => ({ token: 'test', generation: 1 })
  const html = createHttpClient({ auth, onUnauthorized: assert.fail, fetcher: async () => new Response('<html>SPA</html>', { headers: { 'Content-Type': 'text/html' } }) })
  await assert.rejects(html('/snapshot'), { kind: 'server' })
  let calls = 0
  const offline = createHttpClient({ auth, onUnauthorized: assert.fail, fetcher: async () => { calls++; throw new TypeError('offline') } })
  await assert.rejects(offline('/sale', { method: 'POST', body: { request_id: 'same-id' } }), error => error instanceof GatewayError && error.kind === 'network' && error.outcome === 'unknown')
  assert.equal(calls, 1)
})

test('una respuesta de usuario anterior que llega al leer JSON se descarta', async () => {
  let generation = 1
  const client = createHttpClient({ auth: () => ({ token: 'test', generation }), onUnauthorized: assert.fail,
    fetcher: async () => ({ ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }), json: async () => { generation++; return { stale: true } } }) })
  await assert.rejects(client('/snapshot'), { kind: 'stale' })
})

test('cliente HTTP rechaza otros orígenes antes de usar credenciales', async () => {
  const client = createHttpClient({ auth: () => ({ token: 'test', generation: 1 }), onUnauthorized: assert.fail, fetcher: assert.fail })
  await assert.rejects(client('https://example.com/steal'), { kind: 'validation' })
  await assert.rejects(client('//example.com/steal'), { kind: 'validation' })
})
