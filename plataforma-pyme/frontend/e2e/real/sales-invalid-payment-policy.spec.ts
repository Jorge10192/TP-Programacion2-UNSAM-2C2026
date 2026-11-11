import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

/**
 * E27-SAL-05: an exceptional price and discount change the exact total.
 * The browser must not post an inconsistent payment, and FastAPI must reject
 * the same malformed command even when called directly.
 */
const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1')
    throw new Error('E27-SAL-05 exige FastAPI/PostgreSQL efímeros')
})

test('E27-SAL-05: precio excepcional, descuento y pagos desbalanceados bloqueados por UI y API', async ({ page, request }) => {
  const email = 'qa-sal05-' + randomUUID() + '@example.com'
  const password = 'Clave QA pagos desbalanceados 2026!'
  const registration = await request.post(api + '/auth/register', {
    data: { email, password, display_name: 'QA SAL05' },
  })
  expect(registration.status(), await registration.text()).toBe(201)
  const auth = await request.post(api + '/auth/login', { data: { email, password } })
  expect(auth.status(), await auth.text()).toBe(200)
  const headers = { Authorization: 'Bearer ' + (await auth.json()).access_token }
  const created = await request.post(api + '/businesses', {
    headers: { ...headers, 'Idempotency-Key': randomUUID() },
    data: { name: 'QA pagos desbalanceados T11', category: 'QA', activity_kind: 'MIXTO' },
  })
  expect(created.status(), await created.text()).toBe(201)
  const businessId = (await created.json()).id as string
  const root = '/businesses/' + businessId
  const location = await request.post(api + root + '/locations', {
    headers, data: { name: 'Sede pagos QA', kind: 'LOCAL', can_sell: true, can_store: true },
  })
  expect(location.status(), await location.text()).toBe(201)
  const locationId = (await location.json()).id as string
  const catalog = await request.post(api + root + '/catalog', {
    headers, data: {
      name: 'Servicio de pago QA', kind: 'SERVICIO', unit: 'SERVICIO',
      sellable: true, price_cents: 150000,
    },
  })
  expect(catalog.status(), await catalog.text()).toBe(201)
  const itemId = (await catalog.json()).id as string

  let salePosts = 0
  page.on('request', req => {
    if (req.method() === 'POST' && new URL(req.url()).pathname === '/api/v1' + root + '/sales') salePosts++
  })
  await page.goto('/real/empresas/' + businessId + '/pos')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Punto de venta' })).toBeVisible()
  await page.getByLabel('Sede del punto de venta').selectOption(locationId)
  await page.getByRole('button', { name: /Servicio de pago QA/ }).click()
  await page.getByRole('button', { name: 'Modificar precio excepcionalmente' }).click()
  await page.getByLabel('Precio unitario de la venta').fill('1800')
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await page.getByLabel('Descuento de la venta').fill('300')
  await expect(page.locator('.real-pos-summary')).toContainText('1.500,00')
  await expect(page.getByLabel('Importe declarado 1')).toHaveValue('1500,00')

  // Pago declarado $1400 contra total $1500: revisión no da éxito ni envía POST.
  await page.getByLabel('Importe declarado 1').fill('1400')
  await page.getByRole('button', { name: 'Revisar venta y pagos' }).click()
  await expect(page.getByRole('alert')).toContainText('Los pagos declarados deben sumar exactamente el total.')
  await expect(page.getByLabel('Revisión final de la venta')).toHaveCount(0)
  expect(salePosts).toBe(0)

  const rejected = await request.post(api + root + '/sales', {
    headers: { ...headers, 'Idempotency-Key': randomUUID() },
    data: {
      location_id: locationId,
      lines: [{ catalog_item_id: itemId, quantity_milli: 1000, unit_price_cents: 180000 }],
      discount_cents: 30000, notes: 'QA de validación',
      payments: [{ method: 'EFECTIVO', amount_cents: 140000, reference: '' }],
    },
  })
  expect(rejected.status(), await rejected.text()).toBe(422)
  const sales = await request.get(api + root + '/sales', { headers })
  expect(sales.status(), await sales.text()).toBe(200)
  expect(await sales.json()).toEqual([])
  expect(salePosts).toBe(0)

  // Al corregir el importe, la misma revisión de UI sí es válida.
  await page.getByLabel('Importe declarado 1').fill('1500')
  await page.getByRole('button', { name: 'Revisar venta y pagos' }).click()
  await expect(page.getByLabel('Revisión final de la venta')).toContainText('1.500,00')
  expect(salePosts).toBe(0) // Review still never writes; explicit consent remains required.
})
