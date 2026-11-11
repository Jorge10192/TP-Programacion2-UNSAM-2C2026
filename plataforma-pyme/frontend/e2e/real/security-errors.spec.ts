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

test('T11-C: trabajador miembro sin sede no puede recibir ni registrar venta desde POS', async ({ page, request }) => {
  const owner = await setup(request)
  const workerEmail = 't11-worker-' + randomUUID() + '@example.com'
  const workerPassword = 'Trabajador T11 descartable 2026!'
  const reg = await request.post(api + '/auth/register', {
    data: { email: workerEmail, password: workerPassword, display_name: 'Trabajador sin sede QA' },
  })
  expect(reg.status(), await reg.text()).toBe(201)
  const workerLogin = await request.post(api + '/auth/login', {
    data: { email: workerEmail, password: workerPassword },
  })
  expect(workerLogin.status(), await workerLogin.text()).toBe(200)
  const workerHeaders = { Authorization: 'Bearer ' + (await workerLogin.json()).access_token }

  const invitationResp = await request.post(api + owner.root + '/invitations', {
    headers: owner.headers, data: { email: workerEmail, role: 'TRABAJADOR' },
  })
  expect(invitationResp.status(), await invitationResp.text()).toBe(201)
  const invitation = await invitationResp.json()
  const accepted = await request.post(api + '/invitations/accept', {
    headers: workerHeaders, data: { invitation_token: invitation.invitation_token },
  })
  expect(accepted.status(), await accepted.text()).toBe(200)

  const location = await request.post(api + owner.root + '/locations', {
    headers: owner.headers,
    data: { name: 'Sede SIN asignación T11', kind: 'LOCAL', can_sell: true, can_store: true },
  })
  expect(location.status(), await location.text()).toBe(201)
  const site = await location.json()
  const service = await request.post(api + owner.root + '/catalog', {
    headers: owner.headers,
    data: { name: 'Servicio venta no autorizada T11', kind: 'SERVICIO',
      unit: 'SERVICIO', sellable: true, price_cents: 250000 },
  })
  expect(service.status(), await service.text()).toBe(201)
  const catalog = await service.json()
  const sale = {
    location_id: site.id,
    lines: [{ catalog_item_id: catalog.id, quantity_milli: 1000, unit_price_cents: 250000 }],
    payments: [{ method: 'EFECTIVO', amount_cents: 250000 }],
  }
  const denied = await request.post(api + owner.root + '/sales', {
    headers: { ...workerHeaders, 'Idempotency-Key': randomUUID() }, data: sale,
  })
  expect(denied.status(), await denied.text()).toBe(403)

  const purchase = await request.post(api + owner.root + '/purchases', {
    headers: { ...owner.headers, 'Idempotency-Key': randomUUID() },
    data: { purchased_on: '2026-11-11', reference: 'Compra QA asignación',
      lines: [{ catalog_item_id: null, description: 'Concepto de compra',
        unit: 'CONCEPTO', quantity_milli: 1000, unit_cost_cents: 100 }] },
  })
  expect(purchase.status(), await purchase.text()).toBe(201)
  // An actual physical item is needed to exercise STORE rather than a concept-only purchase.
  const physical = await request.post(api + owner.root + '/catalog', {
    headers: owner.headers, data: { name: 'Bien T11 permisos', kind: 'REVENTA',
      unit: 'UNIDAD', sellable: true, price_cents: 100000 },
  })
  expect(physical.status(), await physical.text()).toBe(201)
  const item = await physical.json()
  const pending = await request.post(api + owner.root + '/purchases', {
    headers: { ...owner.headers, 'Idempotency-Key': randomUUID() },
    data: { purchased_on: '2026-11-11', reference: 'Pendiente T11 permisos',
      lines: [{ catalog_item_id: item.id, description: 'Bien T11 permisos',
        unit: 'UNIDAD', quantity_milli: 1000, unit_cost_cents: 50000 }] },
  })
  expect(pending.status(), await pending.text()).toBe(201)
  const toReceive = await request.post(api + owner.root + '/purchases/' + (await pending.json()).id + '/receive', {
    headers: { ...workerHeaders, 'Idempotency-Key': randomUUID() },
    data: { location_id: site.id },
  })
  expect(toReceive.status(), await toReceive.text()).toBe(403)

  await page.goto('/real/empresas/' + owner.company.id + '/pos')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(workerEmail)
  await page.getByLabel('Contraseña', { exact: true }).fill(workerPassword)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Punto de venta' })).toBeVisible()
  await expect(page.getByText('Solo podés vender en sedes donde tengas asignación activa.', { exact: false })).toBeVisible()
  await page.getByLabel('Sede del punto de venta').selectOption(site.id)
  await page.getByRole('button', { name: /Servicio venta no autorizada T11/ }).click()
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await page.getByRole('button', { name: 'Revisar venta y pagos' }).click()
  await page.getByLabel('Acepto registrar esta venta REAL').check()
  await page.getByRole('button', { name: 'Confirmar y registrar venta REAL' }).click()
  await expect(page.getByText('Venta confirmada en PostgreSQL.', { exact: false })).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText(/permiso|denegó|solicitud/i)
  const sales = await request.get(api + owner.root + '/sales', { headers: owner.headers })
  expect(sales.status(), await sales.text()).toBe(200)
  expect(await sales.json()).toEqual([])
  const balance = await request.get(api + owner.root + '/inventory/balances', { headers: owner.headers })
  expect(balance.status(), await balance.text()).toBe(200)
  expect(await balance.json()).toEqual([])
})
