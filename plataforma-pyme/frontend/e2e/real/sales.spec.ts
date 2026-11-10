import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1') {
    throw new Error('T09-D REAL browser tests require isolated disposable QA database')
  }
})

async function seedSales(request: APIRequestContext) {
  const email = `t09-${randomUUID()}@example.com`
  const password = 'Contraseña larga de QA descartable 2026!'
  const reg = await request.post(api + '/auth/register', {
    data: { email, password, display_name: 'T09 Owner QA' },
  })
  expect(reg.status(), await reg.text()).toBe(201)
  const login = await request.post(api + '/auth/login', { data: { email, password } })
  expect(login.status(), await login.text()).toBe(200)
  const token = (await login.json()).access_token as string
  const headers = { Authorization: `Bearer ${token}` }
  const post = async (path: string, data: object) => {
    const response = await request.post(api + path, {
      headers: { ...headers, 'Idempotency-Key': randomUUID() }, data,
    })
    expect(response.status(), await response.text()).toBe(201)
    return response.json()
  }
  const business = await post('/businesses', {
    name: 'T09 ventas QA aislado', category: 'Servicios', activity_kind: 'SERVICIOS',
  })
  const root = `/businesses/${business.id}`
  const item = await post(root + '/catalog', {
    name: 'Asesoría QA', kind: 'SERVICIO', unit: 'SERVICIO', sellable: true,
  })
  const sale = async (amount: number) => post(root + '/sales', {
    lines: [{ catalog_item_id: item.id, quantity_milli: 1000, unit_price_cents: amount }],
    payments: [{ method: 'EFECTIVO', amount_cents: amount }],
  })
  const first = await sale(12345)
  const second = await sale(56789)
  return { email, password, business, first, second }
}

async function loginInUI(page: Page, f: Awaited<ReturnType<typeof seedSales>>) {
  await page.getByLabel('Correo electrónico', { exact: true }).fill(f.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(f.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Historial de ventas' })).toBeVisible()
}

test('T09-D: historial REAL, comprobante por ID y recuperación request_id tras F5, solo GET', async ({ page, request }) => {
  const f = await seedSales(request)
  let browserSalePosts = 0
  page.on('request', r => {
    if (r.method() === 'POST' && /\/sales(?:\?|$)/.test(new URL(r.url()).pathname)) browserSalePosts++
  })

  await page.goto(`/real/empresas/${f.business.id}/ventas`)
  await loginInUI(page, f)
  await expect(page.locator('.real-sales-row')).toHaveCount(2)
  await expect(page.getByText('Listado parcial')).toHaveCount(0)
  await page.getByRole('button', { name: 'Ver comprobante' }).first().click()
  const details = page.getByRole('region', { name: 'Comprobante de venta REAL' })
  await expect(details.getByRole('heading', { name: 'Venta confirmada' })).toBeVisible()
  await expect(details).toContainText('Pagos declarados')
  await expect(details).toContainText('Asesoría QA')

  await page.getByLabel('Clave original de solicitud (UUID4)').fill(f.first.request_id)
  await page.getByRole('button', { name: 'Consultar solicitud' }).click()
  await expect(details).toContainText(f.first.request_id)
  await expect(details).toContainText(f.first.id)
  expect(browserSalePosts).toBe(0)

  await page.reload()
  await loginInUI(page, f)
  await expect(page.locator('.real-sales-row')).toHaveCount(2)
  await page.getByLabel('Clave original de solicitud (UUID4)').fill(f.second.request_id)
  await page.getByRole('button', { name: 'Consultar solicitud' }).click()
  await expect(details).toContainText(f.second.id)
  expect(browserSalePosts).toBe(0)
})
