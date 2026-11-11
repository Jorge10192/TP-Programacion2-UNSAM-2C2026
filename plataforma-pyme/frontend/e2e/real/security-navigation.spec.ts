import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1')
    throw new Error('T11-C requires ephemeral PostgreSQL and PYME_DISPOSABLE_QA=1')
})

async function identity(request: APIRequestContext, label: string) {
  const email = 't11-c-' + randomUUID() + '@example.com'
  const password = 'T11-C disposable account 2026!'
  const registered = await request.post(api + '/auth/register', {
    data: { email, password, display_name: label },
  })
  expect(registered.status(), await registered.text()).toBe(201)
  const login = await request.post(api + '/auth/login', {
    data: { email, password },
  })
  expect(login.status(), await login.text()).toBe(200)
  const token: string = (await login.json()).access_token
  return { email, password, headers: { Authorization: 'Bearer ' + token } }
}

async function post(request: APIRequestContext, headers: { Authorization: string },
                    path: string, body: object, idempotent = false) {
  const response = await request.post(api + path, {
    headers: idempotent ? { ...headers, 'Idempotency-Key': randomUUID() } : headers,
    data: body,
  })
  expect(response.status(), await response.text()).toBe(201)
  return response.json()
}

async function loginBrowser(page: Page, user: { email: string; password: string }) {
  await page.getByLabel('Correo electrónico', { exact: true }).fill(user.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
}

test('T11-C: cambiar A→B ignora respuesta tardía de A y no filtra proveedores', async ({ page, request }) => {
  const user = await identity(request, 'T11-C A/B')
  const a = await post(request, user.headers, '/businesses', {
    name: 'T11 Empresa Alfa', category: 'QA', activity_kind: 'MIXTO',
  }, true)
  const b = await post(request, user.headers, '/businesses', {
    name: 'T11 Empresa Beta', category: 'QA', activity_kind: 'MIXTO',
  }, true)
  const supplierA = 'Proveedor secreto Alfa ' + randomUUID().slice(0, 6)
  const supplierB = 'Proveedor visible Beta ' + randomUUID().slice(0, 6)
  await post(request, user.headers, '/businesses/' + a.id + '/suppliers', { name: supplierA })
  await post(request, user.headers, '/businesses/' + b.id + '/suppliers', { name: supplierB })

  // One SPA session: navigate through the company's own navigation.
  await page.goto('/real/empresas/' + b.id + '/proveedores')
  await loginBrowser(page, user)
  await expect(page.getByText(supplierB)).toBeVisible()
  await expect(page.getByText(supplierA)).toHaveCount(0)
  await page.getByRole('button', { name: 'Mis empresas' }).click()
  await expect(page.getByRole('heading', { name: 'Mis empresas reales' })).toBeVisible()
  await page.getByRole('button', { name: /T11 Empresa Alfa/ }).click()
  await expect(page.getByRole('heading', { name: 'Empresa real' })).toBeVisible()

  let releaseA: (() => void) | undefined
  let observedA: (() => void) | undefined
  const interceptedA = new Promise<void>(resolve => { observedA = resolve })
  const delayA = new Promise<void>(resolve => { releaseA = resolve })
  const urlA = '/api/v1/businesses/' + a.id + '/suppliers'
  await page.route(url => url.pathname === urlA, async route => {
    observedA?.()
    await delayA
    await route.continue().catch(() => {}) // navigation may abort stale GET
  })
  await page.getByRole('button', { name: 'Proveedores REAL' }).click()
  try {
    await interceptedA
    await page.getByRole('button', { name: 'Mis empresas' }).click()
    await expect(page.getByRole('heading', { name: 'Mis empresas reales' })).toBeVisible()
    await page.getByRole('button', { name: /T11 Empresa Beta/ }).click()
    await expect(page.getByRole('heading', { name: 'Empresa real' })).toBeVisible()
    await page.getByRole('button', { name: 'Proveedores REAL' }).click()
    await expect(page.getByText(supplierB)).toBeVisible()
  } finally {
    releaseA?.()
  }
  await expect(page.getByText(supplierA)).toHaveCount(0)
  await expect(page.getByText(supplierB)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Proveedores' })).toBeVisible()
})

test('T11-C: actor ajeno no puede consultar tenant; logout/F5 borra acceso en UI', async ({ page, request }) => {
  const owner = await identity(request, 'Propietario QA T11-C')
  const outsider = await identity(request, 'Ajeno QA T11-C')
  const business = await post(request, owner.headers, '/businesses', {
    name: 'T11 C Privada', category: 'QA', activity_kind: 'MIXTO',
  }, true)
  const secret = 'Proveedor confidencial ' + randomUUID().slice(0, 6)
  await post(request, owner.headers, '/businesses/' + business.id + '/suppliers', { name: secret })

  const foreign = await request.get(api + '/businesses/' + business.id + '/suppliers', {
    headers: outsider.headers,
  })
  expect([403, 404]).toContain(foreign.status())

  await page.goto('/real/empresas/' + business.id + '/proveedores')
  await loginBrowser(page, outsider)
  await expect(page.getByRole('heading', { name: 'Proveedores' })).toBeVisible()
  await expect(page.getByText(secret)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Agregar proveedor REAL' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Mis empresas' }).click()
  await expect(page.getByRole('heading', { name: 'Mis empresas reales' })).toBeVisible()
  await expect(page.getByText('T11 C Privada')).toHaveCount(0)

  await page.getByRole('button', { name: 'Mi perfil real' }).click()
  await expect(page.getByRole('heading', { name: 'Mi perfil real' })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión real' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión real' })).toBeVisible()
  await expect(page.getByText(secret)).toHaveCount(0)

  // A fresh login with the real owner must not inherit outsider's UI state.
  await loginBrowser(page, owner)
  await expect(page.getByRole('heading', { name: 'Mi perfil real' })).toBeVisible()
  await page.getByRole('button', { name: 'Mis empresas reales' }).click()
  // The company is also rendered in the topbar <select>; assert the actual card.
  await expect(page.getByRole('button', { name: /T11 C Privada/ })).toBeVisible()
})
