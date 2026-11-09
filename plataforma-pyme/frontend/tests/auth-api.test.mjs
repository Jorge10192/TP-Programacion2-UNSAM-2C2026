import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiHttpError, ApiTransportError } from '../src/api/httpClient.ts'
import { createAuthGateway, parseAuthUser, parseLoginResult, authErrorMessage } from '../src/features/auth/authGateway.ts'

const user = {
  id: '9b7b1bdb-2a3f-4966-a76b-024f0c327071', email: 'prueba@example.com',
  display_name: 'Usuario de prueba', contact_phone: null, status: 'ACTIVO',
  created_at: '2026-11-09T20:30:00Z',
}
const json = (payload, status=200) => new Response(JSON.stringify(payload), {
  status, headers: { 'Content-Type': 'application/json' },
})
const result = {
  access_token: 'opaco-no-es-jwt', token_type: 'bearer',
  expires_at: '2026-12-01T20:30:00Z', user,
}

test('registro envía campos exactos y devuelve usuario, sin crear sesión', async () => {
  let calls = 0
  const auth = createAuthGateway(async (url, options) => {
    calls++
    assert.equal(url, '/api/v1/auth/register')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers.has('Authorization'), false)
    assert.deepEqual(JSON.parse(options.body), {
      email: user.email, display_name: user.display_name,
      password: 'contraseña-de-prueba-muy-larga', contact_phone: null,
    })
    return json(user, 201)
  })
  assert.deepEqual(await auth.register({
    email: user.email, display_name: user.display_name,
    password: 'contraseña-de-prueba-muy-larga', contact_phone: null,
  }), user)
  assert.equal(calls, 1)
})

test('login usa token bearer opaco sin decodificar claims', async () => {
  const auth = createAuthGateway(async (url, options) => {
    assert.equal(url, '/api/v1/auth/login')
    assert.equal(options.headers.has('Authorization'), false)
    return json(result)
  })
  assert.deepEqual(await auth.login({ email: user.email, password: 'secreto' }), result)
})

test('GET /auth/me envía el token del usuario actual', async () => {
  const auth = createAuthGateway(async (url, options) => {
    assert.equal(url, '/api/v1/auth/me')
    assert.equal(options.method, 'GET')
    assert.equal(options.headers.get('Authorization'), 'Bearer opaco-actual')
    return json(user)
  })
  assert.deepEqual(await auth.me('opaco-actual'), user)
})

test('logout usa 204 sin JSON y el token que se quiere revocar', async () => {
  const auth = createAuthGateway(async (url, options) => {
    assert.equal(url, '/api/v1/auth/logout')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers.get('Authorization'), 'Bearer sesion-a-revocar')
    return new Response(null, { status: 204 })
  })
  assert.equal(await auth.logout('sesion-a-revocar'), undefined)
})

test('DTO malformados no producen sesión ficticia', () => {
  assert.throws(() => parseAuthUser({ id: user.id, display_name: user.display_name }),
    (error) => error instanceof ApiTransportError && error.reason === 'invalid-response')
  assert.throws(() => parseLoginResult({ ...result, token_type: 'JWT' }),
    (error) => error instanceof ApiTransportError && error.reason === 'invalid-response')
  assert.throws(() => parseLoginResult({ ...result, access_token: '', token_type: 'bearer' }),
    (error) => error instanceof ApiTransportError)
  assert.throws(() => parseLoginResult({ ...result, expires_at: 'nunca' }),
    (error) => error instanceof ApiTransportError)
})

test('401 de credenciales inválidas se presenta sin revelar detalles internos', async () => {
  const auth = createAuthGateway(async () => json({ detail: 'Credenciales invalidas' }, 401))
  await assert.rejects(auth.login({ email: user.email, password: 'incorrecta' }),
    (error) => error instanceof ApiHttpError && error.status === 401)
  assert.match(authErrorMessage(new ApiHttpError(401, 'interno'), 'login'), /Credenciales|sesión/i)
})
