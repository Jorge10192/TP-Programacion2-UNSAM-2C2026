import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const base = 'http://127.0.0.1:18001/api/v1'

test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1')
    throw new Error('T10-C Playwright necesita PostgreSQL descartable')
})

async function seed(request: APIRequestContext) {
  const email = `t10-pos-${randomUUID()}@example.com`
  const password = 'Clave QA T10-C descartable 2026'
  const reg = await request.post(base + '/auth/register', {
    data: { email, password, display_name: 'T10 POS browser test' },
  })
  expect(reg.status(), await reg.text()).toBe(201)
  const login = await request.post(base + '/auth/login', { data: { email, password } })
  expect(login.status(), await login.text()).toBe(200)
  const token: string = (await login.json()).access_token
  const auth = { Authorization: 'Bearer ' + token }
  const company = await request.post(base + '/businesses', {
    headers: { ...auth, 'Idempotency-Key': randomUUID() },
    data: { name: 'T10 empresa POS aislada', category: 'Servicios', activity_kind: 'MIXTO' },
  })
  expect(company.status(), await company.text()).toBe(201)
  const businessId: string = (await company.json()).id
  const location = await request.post(base + '/businesses/' + businessId + '/locations', {
    headers: auth,
    data: { name: 'Sede POS A', kind: 'LOCAL', can_sell: true, can_store: true },
  })
  expect(location.status(), await location.text()).toBe(201)
  const locationId: string = (await location.json()).id
  const item = await request.post(base + '/businesses/' + businessId + '/catalog', {
    headers: auth,
    data: { name: 'Servicio POS prueba', kind: 'SERVICIO', unit: 'SERVICIO',
      sellable: true, price_cents: 150000 },
  })
  expect(item.status(), await item.text()).toBe(201)
  const catalog = await item.json()
  return { email, password, businessId, locationId, itemId: catalog.id }
}

async function open(page: Page, f: Awaited<ReturnType<typeof seed>>) {
  await page.goto('/real/empresas/' + f.businessId + '/pos')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(f.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(f.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Punto de venta' })).toBeVisible()
}

test('T10-C POS REAL: carrito, sede, precio admin, descuento, sin POST de venta', async ({ page, request }) => {
  const fixture = await seed(request)
  let salePosts = 0
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().includes('/api/v1/businesses/') &&
      req.url().endsWith('/sales')) salePosts++
  })
  await open(page, fixture)
  await expect(page.getByText('Modo de validación T10-D.')).toBeVisible()
  await expect(page.locator('.real-pos-product')).toHaveCount(1)
  await page.getByLabel('Sede del punto de venta').selectOption(fixture.locationId)
  await page.getByRole('button', { name: /Servicio POS prueba/ }).click()
  await page.getByLabel('Cantidad del artículo').fill('2')
  // El catálogo propone $ 1.500,00 por unidad: bloqueado incluso para el
  // titular hasta elegir explícitamente la excepción prevista por P01.
  await expect(page.getByLabel('Precio unitario de la venta')).toBeDisabled()
  await expect(page.getByLabel('Precio unitario de la venta')).toHaveValue('1500,00')
  await expect(page.locator('.real-pos-line-preview')).toContainText('3.000,00')
  await page.getByRole('button', { name: 'Modificar precio excepcionalmente' }).click()
  await expect(page.getByLabel('Precio unitario de la venta')).toBeEnabled()
  await page.getByLabel('Precio unitario de la venta').fill('1800,50')
  await expect(page.locator('.real-pos-line-preview')).toContainText('3.601,00')
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  const cart = page.getByRole('region', { name: 'Carrito de venta' })
  await expect(cart).toContainText('Cantidad: 2 SERVICIO')
  await expect(cart).toContainText('Precio unitario:')
  await expect(cart).toContainText('Subtotal del producto: ')
  await expect(cart).toContainText('3.601,00')
  await page.getByLabel('Descuento de la venta').fill('100')
  await expect(page.locator('.real-pos-summary')).toContainText('3.501,00')
  // Reintegración funcional del botón DEMO "Agregar otro": sobre un artículo
  // ya incluido se edita el mismo renglón, sin duplicarlo ni eliminarlo.
  await cart.getByRole('button', { name: 'Editar' }).click()
  await expect(page.getByLabel('Cantidad del artículo')).toHaveValue('2')
  await page.getByLabel('Cantidad del artículo').fill('3')
  await expect(page.locator('.real-pos-line-preview')).toContainText('5.401,50')
  await page.getByRole('button', { name: 'Actualizar en carrito' }).click()
  await expect(cart.locator('.real-pos-cart-row')).toHaveCount(1)
  await expect(cart).toContainText('5.401,50')
  await expect(page.locator('.real-pos-summary')).toContainText('5.301,50')
  // El importe automático debe seguir el NUEVO total, no el importe previo.
  await expect(page.getByLabel('Importe declarado 1')).toHaveValue('5301,50')
  await page.getByRole('button', { name: 'Revisar venta y pagos' }).click()
  await expect(page.getByLabel('Revisión final de la venta')).toContainText('5.301,50')
  await expect(page.getByRole('button', { name: 'Confirmar y registrar venta REAL' })).toBeDisabled()
  expect(salePosts).toBe(0)

  await page.reload()
  await open(page, fixture)
  await expect(page.getByRole('region', { name: 'Carrito de venta' }))
    .toContainText('Aún no agregaste artículos')
  expect(salePosts).toBe(0)
})

test('T10-C POS REAL: 501 fichas paginadas, filtro local explícito y sin ventas', async ({ page, request }) => {
  const fixture = await seed(request)
  const iso = new Date().toISOString()
  const pages = Array.from({ length: 501 }, (_, i) => ({
    id: randomUUID(), business_id: fixture.businessId,
    name: 'Servicio paginado ' + String(i + 1).padStart(3, '0'),
    kind: 'SERVICIO', item_type: 'SERVICIO',
    category: 'QA', sku: null, unit: 'SERVICIO',
    description: '', observations: '', sellable: true,
    price_cents: 10000, reference_cost_cents: null,
    status: 'ACTIVO', created_at: iso, updated_at: iso,
  }))
  const observed: number[] = []
  await page.route(url =>
    url.pathname === '/api/v1/businesses/' + fixture.businessId + '/catalog' &&
    url.searchParams.has('offset'), async route => {
    const url = new URL(route.request().url())
    const offset = Number(url.searchParams.get('offset'))
    const limit = Number(url.searchParams.get('limit'))
    observed.push(offset)
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify(pages.slice(offset, offset + limit)),
    })
  })
  await open(page, fixture)
  await expect(page.locator('.real-pos-product')).toHaveCount(100)
  for (const target of [200, 300, 400, 500, 501]) {
    await page.getByRole('button', { name: 'Cargar más fichas de catálogo' }).click()
    await expect(page.locator('.real-pos-product')).toHaveCount(target)
  }
  await expect(page.getByText('Se llegó al final del catálogo consultado.')).toBeVisible()
  await page.getByLabel('Buscar artículos cargados').fill('Servicio paginado 501')
  await expect(page.locator('.real-pos-product')).toHaveCount(1)
  // En React StrictMode (desarrollo) la carga inicial GET puede duplicarse.
  // No es una operación de escritura ni otra página. Las páginas posteriores
  // deben conservar exactamente su orden y no duplicar artículos en la UI.
  expect(observed.filter(offset => offset === 0).length).toBeGreaterThanOrEqual(1)
  expect(observed.filter(offset => offset !== 0)).toEqual([100, 200, 300, 400, 500])
  await expect(page.getByRole('button', { name: 'Revisar venta y pagos' })).toBeDisabled()
})

test('T10-D: POS genera UNA venta de servicio tras revisión y consentimiento, sin POST automático', async ({ page, request }) => {
  const fixture = await seed(request)
  let posts = 0
  page.on('request', req => {
    if (req.method() === 'POST' &&
      req.url().endsWith('/api/v1/businesses/' + fixture.businessId + '/sales')) posts++
  })
  await open(page, fixture)
  await page.getByLabel('Sede del punto de venta').selectOption(fixture.locationId)
  await page.getByRole('button', { name: /Servicio POS prueba/ }).click()
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await expect(page.getByLabel('Importe declarado 1')).toHaveValue('1500,00')
  await expect(page.getByRole('button', { name: 'Revisar venta y pagos' })).toBeEnabled()
  expect(posts).toBe(0)

  await page.getByRole('button', { name: 'Revisar venta y pagos' }).click()
  await expect(page.getByRole('button', { name: 'Confirmar y registrar venta REAL' })).toBeDisabled()
  expect(posts).toBe(0)
  await page.getByLabel('Acepto registrar esta venta REAL').check()
  await page.getByRole('button', { name: 'Confirmar y registrar venta REAL' }).click()
  await expect(page.getByText('Venta confirmada en PostgreSQL.', { exact: false })).toBeVisible()
  expect(posts).toBe(1)
  const list = await request.get(base + '/businesses/' + fixture.businessId + '/sales', {
    headers: { Authorization: 'Bearer ' + (await (await request.post(base + '/auth/login', {
      data: { email: fixture.email, password: fixture.password },
    })).json()).access_token },
  })
  expect(list.status(), await list.text()).toBe(200)
  const entries = await list.json()
  expect(entries).toHaveLength(1)
  expect(entries[0].total_cents).toBe(150000)

  await page.reload()
  await page.getByLabel('Correo electrónico', { exact: true }).fill(fixture.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(fixture.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Punto de venta' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Revisar venta y pagos' })).toBeDisabled()
  expect(posts).toBe(1)
})

test('T10-E: pagos mixtos, precio excepcional y descuento quedan en comprobante REAL', async ({ page, request }) => {
  const fixture = await seed(request)
  let posts = 0
  page.on('request', req => {
    if (req.method() === 'POST' &&
      req.url().endsWith('/api/v1/businesses/' + fixture.businessId + '/sales')) posts++
  })
  await open(page, fixture)
  await page.getByLabel('Sede del punto de venta').selectOption(fixture.locationId)
  await page.getByRole('button', { name: /Servicio POS prueba/ }).click()
  await page.getByRole('button', { name: 'Modificar precio excepcionalmente' }).click()
  await page.getByLabel('Precio unitario de la venta').fill('1800')
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await page.getByLabel('Descuento de la venta').fill('300')
  await expect(page.getByLabel('Importe declarado 1')).toHaveValue('1500,00')
  await page.getByLabel('Importe declarado 1').fill('1000')
  await page.getByRole('button', { name: 'Agregar otro medio de pago' }).click()
  await page.getByLabel('Medio de pago 2').selectOption('TRANSFERENCIA')
  await page.getByLabel('Importe declarado 2').fill('500')
  await page.getByLabel('Referencia de pago 2').fill('Referencia T10 E QA')
  await page.getByRole('button', { name: 'Revisar venta y pagos' }).click()
  const review = page.getByLabel('Revisión final de la venta')
  await expect(review).toContainText('1.800,00')
  await expect(review).toContainText('300,00')
  await expect(review).toContainText('1.500,00')
  expect(posts).toBe(0)
  await page.getByLabel('Acepto registrar esta venta REAL').check()
  await page.getByRole('button', { name: 'Confirmar y registrar venta REAL' }).click()
  await expect(page.getByText('Venta confirmada en PostgreSQL.', { exact: false })).toBeVisible()
  expect(posts).toBe(1)

  const login = await request.post(base + '/auth/login', {
    data: { email: fixture.email, password: fixture.password },
  })
  expect(login.status(), await login.text()).toBe(200)
  const token = (await login.json()).access_token
  const res = await request.get(base + '/businesses/' + fixture.businessId + '/sales', {
    headers: { Authorization: 'Bearer ' + token },
  })
  expect(res.status(), await res.text()).toBe(200)
  const sales = await res.json()
  expect(sales).toHaveLength(1)
  expect(sales[0].subtotal_cents).toBe(180000)
  expect(sales[0].discount_cents).toBe(30000)
  expect(sales[0].total_cents).toBe(150000)
})

test('T10-D: pérdida de respuesta después del 201, F5 y recuperación GET sin repetir POST', async ({ page, request }) => {
  const fixture = await seed(request)
  let intercepted = 0
  let postCalls = 0
  page.on('request', req => {
    if (req.method() === 'POST' &&
      req.url().endsWith('/api/v1/businesses/' + fixture.businessId + '/sales')) postCalls++
  })
  await page.route('**/api/v1/businesses/' + fixture.businessId + '/sales', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    intercepted++
    const response = await route.fetch()
    expect(response.status()).toBe(201) // transaction committed in disposable DB
    return route.abort('failed') // response lost AFTER commit
  })
  await open(page, fixture)
  await page.getByLabel('Sede del punto de venta').selectOption(fixture.locationId)
  await page.getByRole('button', { name: /Servicio POS prueba/ }).click()
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await page.getByRole('button', { name: 'Revisar venta y pagos' }).click()
  await page.getByLabel('Acepto registrar esta venta REAL').check()
  await page.getByRole('button', { name: 'Confirmar y registrar venta REAL' }).click()
  await expect(page.getByText('Hay una solicitud de venta guardada que requiere recuperación.', {
    exact: false,
  })).toBeVisible()
  expect(intercepted).toBe(1)
  expect(postCalls).toBe(1)

  await page.reload()
  await page.getByLabel('Correo electrónico', { exact: true }).fill(fixture.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(fixture.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Punto de venta' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recuperar comprobante por solicitud (GET)' })).toBeVisible()
  expect(postCalls).toBe(1)
  await page.getByRole('button', { name: 'Recuperar comprobante por solicitud (GET)' }).click()
  await expect(page.getByText('Venta confirmada en PostgreSQL.', { exact: false })).toBeVisible()
  expect(postCalls).toBe(1)
  await expect(page.getByRole('button', { name: 'Preparar otra venta' })).toBeVisible()
})
