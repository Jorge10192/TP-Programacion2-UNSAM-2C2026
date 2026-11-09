import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiClient, ApiHttpError, ApiTransportError } from '../src/api/httpClient.ts'

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json' },
})

test('GET usa /api/v1 relativo e inyecta Bearer opaco', async () => {
  let seen
  const client = createApiClient({
    getAccessToken: () => 'token-opaco',
    fetchImpl: async (url, init) => { seen = { url, init }; return json({ id: 'usuario' }) },
  })
  assert.deepEqual(await client.request('/auth/me'), { id: 'usuario' })
  assert.equal(seen.url, '/api/v1/auth/me')
  assert.equal(seen.init.headers.get('Authorization'), 'Bearer token-opaco')
  assert.equal(seen.init.credentials, 'omit')
})

test('Authorization no puede ser forjado por headers de la llamada', async () => {
  const client = createApiClient({ fetchImpl: async (_, init) => {
    assert.equal(init.headers.has('Authorization'), false)
    return json({ ok: true })
  } })
  await client.request('/businesses', { headers: { Authorization: 'Bearer intruso' } })
})

test('POST envía JSON e Idempotency-Key sin reintentos automáticos', async () => {
  const body = { name: 'Empresa', activity_kind: 'MIXTO' }
  let count = 0
  const client = createApiClient({ fetchImpl: async (_, init) => {
    count++
    assert.equal(init.method, 'POST')
    assert.equal(init.headers.get('Idempotency-Key'), 'clave-prueba')
    assert.deepEqual(JSON.parse(init.body), body)
    return json({ id: 'nuevo' }, 201)
  } })
  assert.deepEqual(await client.request('/businesses', {
    method: 'POST', body, idempotencyKey: 'clave-prueba',
  }), { id: 'nuevo' })
  assert.equal(count, 1)
})

test('logout 204 devuelve undefined sin intentar interpretar JSON', async () => {
  const client = createApiClient({
    fetchImpl: async () => new Response(null, { status: 204 }),
  })
  assert.equal(await client.request('/auth/logout', { method: 'POST' }), undefined)
})

test('HTTP 422 conserva detail de Pydantic y el status', async () => {
  const details = [{ loc: ['body', 'name'], msg: 'Field required', type: 'missing' }]
  const client = createApiClient({ fetchImpl: async () => json({ detail: details }, 422) })
  await assert.rejects(client.request('/businesses', { method: 'POST', body: {} }),
    error => error instanceof ApiHttpError && error.status === 422
      && JSON.stringify(error.detail) === JSON.stringify(details))
})

test('HTML en error de proxy no expone su contenido', async () => {
  const client = createApiClient({ fetchImpl: async () =>
    new Response('<html>interno</html>', { status: 502, headers: { 'Content-Type': 'text/html' } }),
  })
  await assert.rejects(client.request('/x'),
    error => error instanceof ApiHttpError && error.status === 502 && error.detail === null)
})

test('rechaza URLs externas, traversal y GET con body', async () => {
  const client = createApiClient({ fetchImpl: async () => { throw new Error('No consultar') } })
  await assert.rejects(client.request('https://otro-sitio.com'), TypeError)
  await assert.rejects(client.request('//otro-sitio.com'), TypeError)
  await assert.rejects(client.request('/../admin'), TypeError)
  await assert.rejects(client.request('/catalog', { body: {} }), TypeError)
})

test('timeout en mutación marca resultado desconocido', async () => {
  const client = createApiClient({ timeoutMs: 5, fetchImpl: async (_, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => reject(new DOMException('Abortado', 'AbortError')))
  }) })
  await assert.rejects(client.request('/sales', { method: 'POST', body: {} }),
    error => error instanceof ApiTransportError && error.reason === 'timeout' && error.outcomeUnknown)
})

test('cancelación GET no señala resultado comercial desconocido', async () => {
  const controller = new AbortController()
  const client = createApiClient({ fetchImpl: async (_, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => reject(new DOMException('Abortado', 'AbortError')))
  }) })
  const pending = client.request('/catalog', { signal: controller.signal })
  controller.abort()
  await assert.rejects(pending,
    error => error instanceof ApiTransportError && error.reason === 'aborted' && !error.outcomeUnknown)
})

test('error de conexión en mutación no reintenta automáticamente', async () => {
  let count = 0
  const client = createApiClient({ fetchImpl: async () => { count++; throw new TypeError('offline') } })
  await assert.rejects(client.request('/sales', { method: 'POST', body: {} }),
    error => error instanceof ApiTransportError && error.reason === 'network' && error.outcomeUnknown)
  assert.equal(count, 1)
})

test('respuesta 200 JSON inválida es error controlado', async () => {
  const client = createApiClient({ fetchImpl: async () =>
    new Response('no-json', { status: 200, headers: { 'Content-Type': 'application/json' } }),
  })
  await assert.rejects(client.request('/auth/me'),
    error => error instanceof ApiTransportError && error.reason === 'invalid-response')
})
