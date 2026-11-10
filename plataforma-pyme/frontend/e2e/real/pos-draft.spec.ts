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
  await expect(page.getByText('Vista preliminar, solo preparación.')).toBeVisible()
  await expect(page.locator('.real-pos-product')).toHaveCount(1)
  await page.getByLabel('Sede del punto de venta').selectOption(fixture.locationId)
  await page.locator('.real-pos-product').getByRole('button').count().catch(() => 0)
  await page.getByRole('button', { name: /Servicio POS prueba/ }).click()
  await page.getByLabel('Cantidad del artículo').fill('2')
  await page.getByLabel('Precio unitario de la venta').fill('1800,50')
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await expect(page.getByRole('region', { name: 'Carrito de venta' })).toContainText('2 SERVICIO')
  await page.getByLabel('Descuento de la venta').fill('100')
  await expect(page.locator('.real-pos-summary')).toContainText('3.501,00')
  await expect(page.getByRole('button', { name: 'Confirmación de venta disponible en T10-D' })).toBeDisabled()
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
  expect(observed).toEqual([0, 100, 200, 300, 400, 500])
  await expect(page.getByRole('button', { name: 'Confirmación de venta disponible en T10-D' })).toBeDisabled()
})
