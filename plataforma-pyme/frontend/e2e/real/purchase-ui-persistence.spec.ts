import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1')
    throw new Error('T11-F compras UI requiere PostgreSQL QA descartable')
})

test('T11-F: compra UI bien + concepto libre, F5, recepción y ledger real', async ({ page, request }) => {
  const email = 't11-pur-ui-' + randomUUID() + '@example.com'
  const password = 'Clave QA T11 F compra 2026!'
  const register = await request.post(api + '/auth/register', {
    data: { email, password, display_name: 'QA compras UI T11-F' },
  })
  expect(register.status(), await register.text()).toBe(201)
  const login = await request.post(api + '/auth/login', { data: { email, password } })
  expect(login.status(), await login.text()).toBe(200)
  const headers = { Authorization: 'Bearer ' + (await login.json()).access_token }
  async function post(path: string, data: object) {
    const response = await request.post(api + path, {
      headers: { ...headers, 'Idempotency-Key': randomUUID() }, data,
    })
    expect(response.status(), await response.text()).toBe(201)
    return response.json()
  }
  async function get(path: string) {
    const response = await request.get(api + path, { headers })
    expect(response.status(), await response.text()).toBe(200)
    return response.json()
  }
  const company = await post('/businesses', {
    name: 'T11-F compra UI ' + randomUUID().slice(0, 8), category: 'QA', activity_kind: 'MIXTO',
  })
  const root = '/businesses/' + company.id
  const site = await post(root + '/locations', {
    name: 'Sede recepción UI', kind: 'LOCAL', can_sell: true, can_store: true,
    address: '', map_url: '',
  })
  const product = await post(root + '/catalog', {
    name: 'Bien compra UI T11-F', kind: 'REVENTA', unit: 'UNIDAD',
    sellable: true, price_cents: 150000, reference_cost_cents: 70000,
  })

  const signIn = async () => {
    await page.getByLabel('Correo electrónico', { exact: true }).fill(email)
    await page.getByLabel('Contraseña', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  }

  await page.goto('/real/empresas/' + company.id + '/compras')
  await signIn()
  await expect(page.getByRole('heading', { name: 'Compras y recepción' })).toBeVisible()
  await page.getByRole('button', { name: 'Registrar compra REAL' }).click()
  const form = page.locator('form.real-ops-form')
  await form.getByLabel('Referencia').fill('Compra E2E física y concepto')
  const lines = form.locator('.real-supply-line')
  await expect(lines).toHaveCount(1)
  await lines.nth(0).getByLabel('Artículo del catálogo o concepto libre')
    .selectOption(product.id)
  await lines.nth(0).getByLabel('Cantidad (hasta 3 decimales)').fill('5')
  await lines.nth(0).getByLabel('Costo unitario ($)').fill('700')
  await form.getByRole('button', { name: 'Agregar renglón' }).click()
  await expect(lines).toHaveCount(2)
  await lines.nth(1).getByLabel('Descripción').fill('Flete documentado T11-F')
  await lines.nth(1).getByLabel('Cantidad (hasta 3 decimales)').fill('1')
  await lines.nth(1).getByLabel('Costo unitario ($)').fill('500')
  await expect(form.locator('.real-supply-grand-total')).toContainText('4000,00')
  await form.getByLabel('Acepto guardar temporalmente los datos de esta compra en este navegador.').check()
  await form.getByRole('button', { name: 'Registrar compra sin stock' }).click()
  await expect(page.getByText('La compra NO agregó stock', { exact: false })).toBeVisible()

  const purchases = await get(root + '/purchases')
  expect(purchases).toHaveLength(1)
  expect(purchases[0].lines).toHaveLength(2)
  expect(purchases[0].total_cents).toBe(400000)
  expect(await get(root + '/inventory/balances')).toEqual([])
  expect(await get(root + '/inventory/movements')).toEqual([])

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión real' })).toBeVisible()
  await signIn()
  await expect(page.getByText('Compra E2E física y concepto')).toBeVisible()
  await page.getByRole('button', { name: 'Pendiente · Confirmar recepción en ubicación' }).click()
  await page.getByLabel('Destino con almacenamiento activo').selectOption(site.id)
  page.once('dialog', dialog => void dialog.accept())
  await page.getByRole('button', { name: 'Confirmar recepción REAL' }).click()
  await expect(page.getByText('Recepción confirmada', { exact: false })).toBeVisible()

  const balances = await get(root + '/inventory/balances')
  expect(balances).toHaveLength(1)
  expect(balances[0]).toMatchObject({
    location_id: site.id, catalog_item_id: product.id,
    quantity_milli: 5000, version: 1,
  })
  const moves = await get(root + '/inventory/movements')
  expect(moves).toHaveLength(1)
  expect(moves[0]).toMatchObject({
    catalog_item_id: product.id, event_type: 'COMPRA_RECEPCION', delta_milli: 5000,
  })
  expect((await get(root + '/purchases'))[0].status).toBe('RECIBIDA')

  await page.reload()
  await signIn()
  await expect(page.getByRole('button', { name: 'Consultar comprobante' })).toBeVisible()
  expect(await get(root + '/inventory/balances')).toEqual(balances)
  expect(await get(root + '/inventory/movements')).toEqual(moves)
})
