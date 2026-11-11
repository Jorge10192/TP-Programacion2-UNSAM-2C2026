import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1')
    throw new Error('T11-C exige PostgreSQL QA descartable (PYME_DISPOSABLE_QA=1)')
})

async function setup(request: APIRequestContext) {
  const email = 't11-errors-' + randomUUID() + '@example.com'
  const password = 'Clave disposable T11 C 2026!'
  const registered = await request.post(api + '/auth/register', {
    data: { email, password, display_name: 'T11 errores de red QA' },
  })
  expect(registered.status(), await registered.text()).toBe(201)
  const logged = await request.post(api + '/auth/login', { data: { email, password } })
  expect(logged.status(), await logged.text()).toBe(200)
  const token: string = (await logged.json()).access_token
  const headers = { Authorization: 'Bearer ' + token }
  const companyResp = await request.post(api + '/businesses', {
    headers: { ...headers, 'Idempotency-Key': randomUUID() },
    data: { name: 'T11 C errores aislados', category: 'QA', activity_kind: 'MIXTO' },
  })
  expect(companyResp.status(), await companyResp.text()).toBe(201)
  const company = await companyResp.json()
  const root = '/businesses/' + company.id
  const supplierName = 'Proveedor persistente QA ' + randomUUID().slice(0, 6)
  const supplierResp = await request.post(api + root + '/suppliers', {
    headers, data: { name: supplierName },
  })
  expect(supplierResp.status(), await supplierResp.text()).toBe(201)
  return { email, password, headers, root, company, supplierName }
}

async function open(page: Page, f: Awaited<ReturnType<typeof setup>>) {
  await page.goto('/real/empresas/' + f.company.id + '/proveedores')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(f.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(f.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Proveedores' })).toBeVisible()
  await expect(page.getByText(f.supplierName)).toBeVisible()
}

test('T11-C: 401 de API invalida sesión y vuelve a login sin exponer datos', async ({ page, request }) => {
  const f = await setup(request)
  await open(page, f)
  let uiPosts = 0
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().includes('/api/v1/businesses/')) uiPosts++
  })
  await page.route(url => url.pathname === '/api/v1' + f.root + '/suppliers', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    await route.fulfill({ status: 401, contentType: 'application/json',
      body: JSON.stringify({ detail: 'Sesión revocada durante QA' }) })
  })
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión real' })).toBeVisible()
  await expect(page.getByText(f.supplierName)).toHaveCount(0)
  expect(uiPosts).toBe(0)
})

for (const status of [403, 404, 503] as const) {
  test('T11-C: GET ' + status + ' no muestra éxito falso y permite consulta posterior', async ({ page, request }) => {
    const f = await setup(request)
    await open(page, f)
    let fail = true
    let injected = 0
    let writes = 0
    page.on('request', req => {
      if (req.method() !== 'GET' && req.url().includes('/api/v1' + f.root)) writes++
    })
    await page.route(url => url.pathname === '/api/v1' + f.root + '/suppliers', async route => {
      if (!fail || route.request().method() !== 'GET') return route.continue()
      injected++
      await route.fulfill({ status, contentType: 'application/json',
        body: JSON.stringify({ detail: 'Rechazo T11-C ' + status }) })
    })
    await page.getByRole('button', { name: 'Actualizar', exact: true }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Proveedores' })).toBeVisible()
    expect(injected).toBeGreaterThan(0)
    expect(writes).toBe(0)
    fail = false
    await page.getByRole('button', { name: 'Actualizar', exact: true }).click()
    await expect(page.getByText(f.supplierName)).toBeVisible()
    expect(writes).toBe(0)
  })
}

test('T11-C: 409 de proveedor duplicado y 422 de compra inválida son atómicos', async ({ page, request }) => {
  const f = await setup(request)
  await open(page, f)
  const suppliersPath = api + f.root + '/suppliers'
  const beforeResponse = await request.get(suppliersPath, { headers: f.headers })
  expect(beforeResponse.status()).toBe(200)
  const before = await beforeResponse.json()
  let uiPosts = 0
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().endsWith('/api/v1' + f.root + '/suppliers')) uiPosts++
  })
  await page.getByLabel('Nombre comercial').fill(f.supplierName)
  await page.getByRole('button', { name: 'Crear proveedor' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  expect(uiPosts).toBe(1)
  const afterResponse = await request.get(suppliersPath, { headers: f.headers })
  expect(afterResponse.status()).toBe(200)
  expect(await afterResponse.json()).toEqual(before)

  const invalid = await request.post(api + f.root + '/purchases', {
    headers: { ...f.headers, 'Idempotency-Key': randomUUID() },
    data: { purchased_on: '2026-11-11', lines: [] },
  })
  expect(invalid.status(), await invalid.text()).toBe(422)
  const purchases = await request.get(api + f.root + '/purchases', { headers: f.headers })
  expect(purchases.status(), await purchases.text()).toBe(200)
  expect(await purchases.json()).toEqual([])
})
