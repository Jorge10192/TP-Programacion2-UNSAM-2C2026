import { test, expect, type APIRequestContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'

/**
 * E27-MODE-02: realizar operaciones DEMO reales desde UI sobre un navegador
 * aislado, mientras FastAPI/PostgreSQL REAL mantiene un tenant QA de control.
 * Los POST de setup van por APIRequestContext antes de armar el observador UI.
 */
const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1') {
    throw new Error('E27-MODE-02 exige PostgreSQL descartable (PYME_DISPOSABLE_QA=1)')
  }
})

async function realTenant(request: APIRequestContext) {
  const email = 't11-demo-isolation-' + randomUUID() + '@example.com'
  const password = 'T11 DEMO aislamiento efimero 2026!'
  const register = await request.post(api + '/auth/register', {
    data: { email, password, display_name: 'QA DEMO contra REAL' },
  })
  expect(register.status(), await register.text()).toBe(201)
  const login = await request.post(api + '/auth/login', { data: { email, password } })
  expect(login.status(), await login.text()).toBe(200)
  const headers = { Authorization: 'Bearer ' + (await login.json()).access_token }
  const response = await request.post(api + '/businesses', {
    headers: { ...headers, 'Idempotency-Key': randomUUID() },
    data: { name: 'QA T11 REAL protegido', category: 'QA', activity_kind: 'MIXTO' },
  })
  expect(response.status(), await response.text()).toBe(201)
  const company = await response.json()
  return { company, headers, root: '/businesses/' + company.id }
}

test('E27-MODE-02: QR, caja y cuentas DEMO modifican solo estado local, cero writes REAL', async ({ page, request }) => {
  const real = await realTenant(request)
  const read = async (route: string) => {
    const response = await request.get(api + real.root + route, { headers: real.headers })
    expect(response.status(), await response.text()).toBe(200)
    return response.json()
  }
  const initial = {
    sales: await read('/sales'), purchases: await read('/purchases'),
    balances: await read('/inventory/balances'), movements: await read('/inventory/movements'),
  }
  expect(initial).toEqual({ sales: [], purchases: [], balances: [], movements: [] })

  const apiWrites: string[] = []
  const realResponses: string[] = []
  page.on('request', req => {
    if (req.url().includes('/api/v1/') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method())) {
      apiWrites.push(req.method() + ' ' + new URL(req.url()).pathname)
    }
  })
  page.on('response', res => {
    if (res.url().includes('/api/v1/')) realResponses.push(res.request().method())
  })

  // Operar una empresa DEMO fixture, no una compañía PostgreSQL creada arriba.
  await page.goto('/b/servicios-demo/cuentas')
  await expect(page.getByRole('heading', { name: 'Cuentas y medios de pago' })).toBeVisible()
  await page.getByRole('button', { name: 'Agregar cuenta', exact: true }).click()
  const label = 'Cuenta DEMO aislada ' + randomUUID().slice(0, 6)
  await page.getByRole('textbox', { name: 'Nombre de la cuenta *' }).fill(label)
  await page.getByRole('textbox', { name: 'Banco o billetera *' }).fill('Banco de ficción')
  await page.getByRole('button', { name: 'Registrar cuenta DEMO' }).click()
  await expect(page.getByText('Cuenta DEMO «' + label + '» registrada', { exact: false })).toBeVisible()
  await expect(page.getByText(label, { exact: true }).first()).toBeVisible()

  await page.goto('/b/servicios-demo/jornadas')
  await expect(page.getByRole('heading', { name: 'Apertura y cierre' })).toBeVisible()
  await page.getByRole('button', { name: 'Abrir caja DEMO' }).click()
  await expect(page.getByText('Jornada DEMO abierta', { exact: false })).toBeVisible()
  await expect(page.locator('.cash-session-card')).toHaveCount(1)

  // Crear servicio de ejemplo mediante la UI DEMO para generar QR sin inventario.
  await page.goto('/b/servicios-demo/catalogo')
  await page.getByRole('button', { name: 'Agregar artículo o servicio' }).click()
  const serviceName = 'Servicio QR DEMO T11 ' + randomUUID().slice(0, 6)
  await page.getByRole('textbox', { name: 'Nombre del artículo o servicio *' }).fill(serviceName)
  await page.getByRole('combobox', { name: 'Tipo *' }).selectOption('SERVICIO')
  await page.getByRole('textbox', { name: 'Categoría *' }).fill('QA')
  await page.getByRole('textbox', { name: 'Precio de lista (ARS, opcional)' }).fill('1500')
  await page.getByRole('button', { name: 'Agregar a catálogo DEMO' }).click()
  await expect(page.getByText(serviceName).first()).toBeVisible()

  await page.goto('/b/servicios-demo/ventas')
  await expect(page.getByRole('heading', { name: 'Ventas', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Nueva venta' }).click()
  await page.getByRole('combobox', { name: 'Artículo o servicio 1' }).selectOption({ label: serviceName + ' · Servicio' })
  await page.getByRole('combobox', { name: 'Medio de pago 1' }).selectOption('MERCADO_PAGO_DECLARADO')
  await page.getByRole('textbox', { name: 'Importe aplicado ARS' }).fill('1500')
  await page.getByRole('button', { name: 'Generar QR DEMO' }).click()
  await expect(page.getByRole('heading', { name: 'Intenciones QR DEMO' })).toBeVisible()
  await expect(page.getByText('Se creó una intención QR DEMO pendiente', { exact: false })).toBeVisible()
  await expect(page.locator('.qr-demo-entry')).toHaveCount(1)

  // DEMO persists in browser only; after reload, does not become REAL.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Intenciones QR DEMO' })).toBeVisible()
  await expect(page.locator('.qr-demo-entry')).toHaveCount(1)
  await page.goto('/b/servicios-demo/cuentas')
  await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
  await page.goto('/b/servicios-demo/jornadas')
  await expect(page.locator('.cash-session-card')).toHaveCount(1)

  expect(apiWrites, 'Las operaciones DEMO nunca llaman POST/PATCH/PUT/DELETE a FastAPI REAL').toEqual([])
  expect(realResponses, 'Los flujos DEMO no deben consultar recursos de la API REAL').toEqual([])
  expect(await read('/sales')).toEqual(initial.sales)
  expect(await read('/purchases')).toEqual(initial.purchases)
  expect(await read('/inventory/balances')).toEqual(initial.balances)
  expect(await read('/inventory/movements')).toEqual(initial.movements)

  await page.goto('/real/empresas/' + real.company.id)
  await expect(page.getByRole('heading', { name: 'Iniciar sesión real' })).toBeVisible()
  await expect(page.getByText(serviceName)).toHaveCount(0)
  expect(apiWrites).toEqual([])
})
