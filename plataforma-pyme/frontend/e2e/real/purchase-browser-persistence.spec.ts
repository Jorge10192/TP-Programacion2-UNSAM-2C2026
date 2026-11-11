import { test, expect, type APIRequestContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1') throw new Error('T11-F requiere PostgreSQL efímero')
})
test('T11-F: compra UI de bien + concepto libre sin stock hasta recepción, F5 persistente', async ({ page, request }) => {
  const email = 't11-purchase-ui-' + randomUUID() + '@example.com'
  const password = 'T11 compra UI descartable 2026!'
  const reg = await request.post(api + '/auth/register', {
    data: { email, password, display_name: 'QA compra UI' },
  })
  expect(reg.status(), await reg.text()).toBe(201)
  const login = await request.post(api + '/auth/login', { data: { email, password } })
  expect(login.status(), await login.text()).toBe(200)
  const headers = { Authorization: 'Bearer ' + (await login.json()).access_token }
  const create = async (suffix: string, data: object) => {
    const res = await request.post(api + suffix, {
      headers: { ...headers, 'Idempotency-Key': randomUUID() }, data,
    })
    expect(res.status(), await res.text()).toBe(201)
    return res.json()
  }
  const get = async (path: string) => {
    const res = await request.get(api + path, { headers })
    expect(res.status(), await res.text()).toBe(200)
    return res.json()
  }
  const company = await create('/businesses', {
    name: 'QA UI compra T11', category: 'QA', activity_kind: 'MIXTO',
  })
  const root = '/businesses/' + company.id
  const item = await create(root + '/catalog', {
    name: 'Producto QA desde compra UI', kind: 'REVENTA', unit: 'UNIDAD',
    sellable: true, price_cents: 350000, reference_cost_cents: 120000,
  })
  const supplier = await create(root + '/suppliers', { name: 'Proveedor compra UI T11' })
  const reference = 'T11 compra UI bien + concepto ' + randomUUID().slice(0, 7)

  let purchasePosts = 0
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().endsWith('/api/v1' + root + '/purchases')) purchasePosts++
  })
  await page.goto('/real/empresas/' + company.id + '/compras')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Compras y recepción' })).toBeVisible()
  await page.getByRole('button', { name: 'Registrar compra REAL' }).click()
  const form = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Nueva compra sin recepción' }) })
  await form.getByLabel('Proveedor (opcional)').selectOption(supplier.id)
  await form.getByLabel('Referencia').fill(reference)
  const first = form.locator('.real-supply-line').nth(0)
  await first.getByLabel('Artículo del catálogo o concepto libre').selectOption(item.id)
  await first.getByLabel('Cantidad (hasta 3 decimales)').fill('2')
  await first.getByLabel('Costo unitario ($)').fill('1200')
  await form.getByRole('button', { name: 'Agregar renglón' }).click()
  const second = form.locator('.real-supply-line').nth(1)
  await second.getByLabel('Descripción').fill('Envío logístico QR prueba')
  await second.getByLabel('Cantidad (hasta 3 decimales)').fill('1')
  await second.getByLabel('Costo unitario ($)').fill('300')
  await expect(form.getByText('2.700,00')).toBeVisible()
  await form.getByRole('checkbox', { name: /Acepto guardar temporalmente/ }).check()
  await form.getByRole('button', { name: 'Registrar compra sin stock' }).click()
  await expect(page.getByText('La compra NO agregó stock', { exact: false })).toBeVisible()
  expect(purchasePosts).toBe(1)
  const purchaseRows = await get(root + '/purchases')
  expect(purchaseRows).toHaveLength(1)
  const purchase = purchaseRows[0]
  expect(purchase).toMatchObject({ reference, status: 'REGISTRADA', total_cents: 270000 })
  expect(purchase.lines).toHaveLength(2)
  expect(purchase.lines.find((line: { catalog_item_id: string | null }) => line.catalog_item_id === item.id))
    .toMatchObject({ quantity_milli: 2000, unit_cost_cents: 120000 })
  expect(purchase.lines.find((line: { catalog_item_id: string | null }) => line.catalog_item_id === null))
    .toMatchObject({ quantity_milli: 1000, unit_cost_cents: 30000 })
  expect(await get(root + '/inventory/balances')).toEqual([])
  expect(await get(root + '/inventory/movements')).toEqual([])

  await page.reload()
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  const card = page.locator('.real-supply-card').filter({ hasText: reference })
  await expect(card).toContainText('2.700,00')
  await expect(card).toContainText('Producto QA desde compra UI')
  await expect(card).toContainText('Envío logístico QR prueba')
  expect(purchasePosts).toBe(1)
  expect(await get(root + '/purchases')).toEqual(purchaseRows)
  expect(await get(root + '/inventory/balances')).toEqual([])
})
