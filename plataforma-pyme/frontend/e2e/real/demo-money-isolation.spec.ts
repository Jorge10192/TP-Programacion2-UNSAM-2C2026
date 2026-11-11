import { test, expect, type APIRequestContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'

/** E27-MODE-02: real API + ephemeral PostgreSQL, with actual DEMO UI writes. */
const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1')
    throw new Error('E27-MODE-02 exige PostgreSQL efímero (PYME_DISPOSABLE_QA=1)')
})

async function seed(request: APIRequestContext) {
  const email = 't11-demo-money-' + randomUUID() + '@example.com'
  const password = 'T11 DEMO separacion descartable 2026!'
  const registered = await request.post(api + '/auth/register', {
    data: { email, password, display_name: 'DEMO isolation QA' },
  })
  expect(registered.status(), await registered.text()).toBe(201)
  const login = await request.post(api + '/auth/login', { data: { email, password } })
  expect(login.status(), await login.text()).toBe(200)
  const headers = { Authorization: 'Bearer ' + (await login.json()).access_token }
  const companyResponse = await request.post(api + '/businesses', {
    headers: { ...headers, 'Idempotency-Key': randomUUID() },
    data: { name: 'REAL NO ALTERAR QR ' + randomUUID().slice(0, 8), category: 'QA',
      activity_kind: 'MIXTO' },
  })
  expect(companyResponse.status(), await companyResponse.text()).toBe(201)
  const business = await companyResponse.json()
  const root = '/businesses/' + business.id
  async function read(path: string) {
    const response = await request.get(api + root + path, { headers })
    expect(response.status(), await response.text()).toBe(200)
    return response.json()
  }
  return { email, password, business, root, read }
}

test('E27-MODE-02: QR, caja y cuenta DEMO no consultan ni escriben negocio REAL', async ({ page, request }) => {
  const real = await seed(request)
  const baseline = {
    sales: await real.read('/sales'),
    balances: await real.read('/inventory/balances'),
    movements: await real.read('/inventory/movements'),
    purchases: await real.read('/purchases'),
  }
  expect(baseline.sales).toEqual([])
  expect(baseline.balances).toEqual([])
  expect(baseline.movements).toEqual([])
  expect(baseline.purchases).toEqual([])

  // Watch every API call from the browser during actual DEMO mutations.
  const calls: string[] = []
  page.on('request', req => {
    if (new URL(req.url()).pathname.startsWith('/api/v1/'))
      calls.push(req.method() + ' ' + new URL(req.url()).pathname)
  })

  // Create a DEMO service so the QR test doesn't rely on any fixture commerce data.
  await page.goto('/b/walos-demo/catalogo')
  await expect(page.getByRole('heading', { name: 'Catálogo general' })).toBeVisible()
  await page.getByRole('button', { name: 'Agregar artículo o servicio' }).click()
  const editor = page.getByRole('region', { name: 'Formulario de catálogo' })
  await editor.getByLabel('Nombre del artículo o servicio *').fill('Servicio QR aislado T11')
  await editor.getByLabel('Tipo *').selectOption('SERVICIO')
  await editor.getByLabel('Categoría *').fill('Pruebas')
  await editor.getByLabel('Precio de lista (ARS, opcional)').fill('1200')
  await editor.getByRole('button', { name: 'Agregar a catálogo DEMO' }).click()
  await expect(page.getByText('Servicio QR aislado T11')).toBeVisible()

  // Generate a genuine DEMO QR intent from the browser form.
  await page.goto('/b/walos-demo/ventas')
  await expect(page.getByRole('heading', { name: 'Ventas', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Nueva venta' }).click()
  const selectItem = page.getByLabel('Artículo o servicio 1')
  const itemValue = await selectItem.locator('option').filter({ hasText: 'Servicio QR aislado T11' })
    .getAttribute('value')
  expect(itemValue).toBeTruthy()
  await selectItem.selectOption(itemValue!)
  await page.getByLabel('Medio de pago 1', { exact: true }).selectOption('MERCADO_PAGO')
  await page.getByRole('button', { name: 'Completar último medio con el saldo pendiente' }).click()
  await page.getByRole('button', { name: 'Generar QR DEMO' }).click()
  await expect(page.getByText('Se creó una intención QR DEMO pendiente', { exact: false }))
    .toBeVisible()
  await expect(page.getByText('Intenciones QR DEMO')).toBeVisible()
  expect(calls).toEqual([])

  // Create a DEMO financial account.
  await page.goto('/b/walos-demo/cuentas')
  await expect(page.getByRole('heading', { name: 'Cuentas y medios de pago' })).toBeVisible()
  await page.getByRole('button', { name: 'Agregar cuenta', exact: true }).click()
  const account = page.getByRole('region', { name: 'Agregar cuenta DEMO' })
  await account.getByLabel('Nombre de la cuenta *').fill('Cuenta aislada T11')
  await account.getByLabel('Banco o billetera *').fill('Banco ficticio QA')
  await account.getByRole('button', { name: 'Registrar cuenta DEMO' }).click()
  await expect(page.getByText('Cuenta DEMO «Cuenta aislada T11» registrada', { exact: false }))
    .toBeVisible()

  // Open and close a cash session; both mutations remain in local DEMO state.
  await page.goto('/b/walos-demo/jornadas')
  await expect(page.getByRole('heading', { name: 'Apertura y cierre' })).toBeVisible()
  await page.getByLabel('Fondo inicial contado (ARS) *').fill('2500')
  await page.getByRole('button', { name: 'Abrir caja DEMO' }).click()
  await expect(page.getByText('Jornada DEMO abierta', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Realizar arqueo y cerrar' }).click()
  await page.getByLabel('Efectivo contado físicamente (ARS) *').fill('2500')
  await page.getByRole('button', { name: 'Confirmar cierre y guardar arqueo DEMO' }).click()
  await expect(page.getByText('Cierre DEMO guardado con snapshot inmutable', { exact: false }))
    .toBeVisible()
  expect(calls).toEqual([])

  // Confirm actual PostgreSQL was not touched by any of these DEMO actions.
  expect(await real.read('/sales')).toEqual(baseline.sales)
  expect(await real.read('/purchases')).toEqual(baseline.purchases)
  expect(await real.read('/inventory/balances')).toEqual(baseline.balances)
  expect(await real.read('/inventory/movements')).toEqual(baseline.movements)

  // And the REAL route must require an independent login, not import DEMO state.
  await page.goto('/real/empresas/' + real.business.id + '/ventas')
  await expect(page.getByRole('heading', { name: 'Iniciar sesión real' })).toBeVisible()
  await page.getByLabel('Correo electrónico', { exact: true }).fill(real.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(real.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Historial de ventas' })).toBeVisible()
  await expect(page.getByText('Cuenta aislada T11')).toHaveCount(0)
  await expect(page.getByText('Servicio QR aislado T11')).toHaveCount(0)
  await expect(page.getByText('0 cargadas', { exact: false })).toBeVisible()
  expect(calls.filter(call => /\\/businesses\\/[^/]+\\/(sales|purchases|inventory)/.test(call) && !call.startsWith('GET '))).toEqual([])
})
