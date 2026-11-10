import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api = 'http://127.0.0.1:18001/api/v1'

// Never run these API seeding steps outside disposable CI PostgreSQL.
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1') throw new Error('Requires disposable QA environment')
})

async function seed(request: APIRequestContext) {
  const email = `t09-read-${randomUUID()}@example.com`
  const password = 'Disposable T09 QA password 2026!'
  const registered = await request.post(api + '/auth/register', {
    data: { email, password, display_name: 'T09 Browser QA' },
  })
  expect(registered.status(), await registered.text()).toBe(201)
  const logged = await request.post(api + '/auth/login', { data: { email, password } })
  expect(logged.status(), await logged.text()).toBe(200)
  const headers = { Authorization: `Bearer ${(await logged.json()).access_token}` }
  const post = async (route: string, data: object, status = 201) => {
    const response = await request.post(api + route, {
      data, headers: { ...headers, 'Idempotency-Key': randomUUID() },
    })
    expect(response.status(), await response.text()).toBe(status)
    return response.json()
  }
  const company = await post('/businesses', {
    name: 'T09 lectura browser aislada', category: 'Pruebas', activity_kind: 'MIXTO',
  })
  const root = '/businesses/' + company.id
  const createSite = async (name: string) => post(root + '/locations', {
    name, kind: 'LOCAL', address: '', map_url: '', can_sell: true, can_store: false,
  })
  const siteA = await createSite('T09 sede A'), siteB = await createSite('T09 sede B')
  const item = await post(root + '/catalog', {
    name: 'Asesoría T09', kind: 'SERVICIO', unit: 'SERVICIO', sellable: true,
  })
  const sale = async (locationId: string, cents: number) => post(root + '/sales', {
    location_id: locationId,
    lines: [{ catalog_item_id: item.id, quantity_milli: 1000, unit_price_cents: cents }],
    payments: [{ method: 'EFECTIVO', amount_cents: cents }],
  })
  const saleA = await sale(siteA.id, 1200)
  const saleB = await sale(siteB.id, 2500)
  return { email, password, company, siteA, siteB, saleA, saleB }
}

async function open(page: Page, fixture: Awaited<ReturnType<typeof seed>>) {
  await page.goto('/real/empresas/' + fixture.company.id + '/ventas')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(fixture.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(fixture.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Historial de ventas' })).toBeVisible()
}

test('T09-D navegador REAL: lista, filtro, comprobante y by-request, sin POST de ventas en UI', async ({ page, request }) => {
  const fixture = await seed(request)
  let uiWrites = 0
  page.on('request', req => {
    if (req.url().includes('/api/v1/businesses/') && req.url().includes('/sales') &&
      req.method() !== 'GET') uiWrites++
  })
  await open(page, fixture)
  await expect(page.locator('.real-sales-row')).toHaveCount(2)
  await expect(page.getByText('Solo lectura.', { exact: true })).toBeVisible()
  await page.getByLabel('Filtrar ventas por ubicación').selectOption(fixture.siteA.id)
  await expect(page.locator('.real-sales-row')).toHaveCount(1)
  await expect(page.locator('.real-sales-row')).toContainText('T09 sede A')
  await page.locator('.real-sales-row').getByRole('button', { name: 'Ver comprobante' }).click()
  const receipt = page.getByRole('region', { name: 'Comprobante de venta REAL' })
  await expect(receipt).toContainText(fixture.saleA.id)
  await expect(receipt).toContainText('Asesoría T09')
  await expect(receipt).toContainText('Pagos declarados (sin acreditación externa)')
  await page.getByRole('button', { name: 'Cerrar comprobante' }).click()
  await page.getByLabel('Clave original de solicitud (UUID4)').fill(fixture.saleA.request_id)
  await page.getByRole('button', { name: 'Consultar solicitud' }).click()
  await expect(receipt).toContainText(fixture.saleA.request_id)
  await page.getByRole('button', { name: 'Cerrar comprobante' }).click()
  await page.getByLabel('Filtrar ventas por ubicación').selectOption(fixture.siteB.id)
  await expect(page.locator('.real-sales-row')).toHaveCount(1)
  await expect(page.locator('.real-sales-row')).toContainText('T09 sede B')
  await page.getByRole('button', { name: 'Actualizar desde API' }).click()
  await expect(page.locator('.real-sales-row')).toHaveCount(1)
  expect(uiWrites).toBe(0)
})

test('T09-D móvil REAL: historial sin operaciones y recuperación posterior a F5/login', async ({ page, request }) => {
  const fixture = await seed(request)
  await page.setViewportSize({ width: 390, height: 844 })
  let uiWrites = 0
  page.on('request', req => {
    if (req.url().includes('/api/v1/businesses/') && req.url().includes('/sales') &&
      req.method() !== 'GET') uiWrites++
  })
  await open(page, fixture)
  await expect(page.locator('.real-sales-row')).toHaveCount(2)
  await page.reload()
  await open(page, fixture)
  await expect(page.locator('.real-sales-row')).toHaveCount(2)
  await page.getByLabel('Clave original de solicitud (UUID4)').fill(fixture.saleB.request_id)
  await page.getByRole('button', { name: 'Consultar solicitud' }).click()
  await expect(page.getByRole('region', { name: 'Comprobante de venta REAL' }))
    .toContainText(fixture.saleB.id)
  expect(uiWrites).toBe(0)
})

test('T09-F navegador: error 503 de historial permite reintentar GET sin POST de venta', async ({ page, request }) => {
  const fixture = await seed(request)
  let injected = false
  let uiSalePosts = 0
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().includes('/api/v1/businesses/') &&
      req.url().includes('/sales')) uiSalePosts++
  })
  await page.route('**/businesses/' + fixture.company.id + '/sales?*', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    if (!injected) {
      injected = true
      return route.fulfill({
        status: 503, contentType: 'application/json',
        body: JSON.stringify({ detail: 'API temporalmente no disponible' }),
      })
    }
    return route.continue()
  })
  await open(page, fixture)
  await expect(page.getByText('Error al consultar')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('FastAPI no pudo consultar el comprobante')
  await page.getByRole('button', { name: 'Reintentar consulta' }).click()
  await expect(page.locator('.real-sales-row')).toHaveCount(2)
  await expect(page.getByText('Fin del listado consultado')).toBeVisible()
  expect(injected).toBe(true)
  expect(uiSalePosts).toBe(0)
})
