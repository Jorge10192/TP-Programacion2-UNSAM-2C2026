import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

/**
 * T11-D — navegador REAL en desktop/móvil, navegación con teclado
 * y separación REAL/DEMO. API fija + DB efímera; no usar contra usuarios reales.
 */
const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1') {
    throw new Error('T11-D requiere PostgreSQL efímero y PYME_DISPOSABLE_QA=1')
  }
})

async function seed(request: APIRequestContext) {
  const email = 't11-d-' + randomUUID() + '@example.com'
  const password = 'T11-D teclado/móvil descartable 2026!'
  const register = await request.post(api + '/auth/register', {
    data: { email, password, display_name: 'QA T11-D' },
  })
  expect(register.status(), await register.text()).toBe(201)
  const login = await request.post(api + '/auth/login', { data: { email, password } })
  expect(login.status(), await login.text()).toBe(200)
  const auth = { Authorization: 'Bearer ' + (await login.json()).access_token }
  async function post(route: string, data: object) {
    const result = await request.post(api + route, {
      headers: { ...auth, 'Idempotency-Key': randomUUID() }, data,
    })
    expect(result.status(), await result.text()).toBe(201)
    return result.json()
  }
  const company = await post('/businesses', {
    name: 'T11-D responsive ' + randomUUID().slice(0, 8), category: 'QA', activity_kind: 'MIXTO',
  })
  const root = '/businesses/' + company.id
  const location = await post(root + '/locations', {
    name: 'Sede T11-D', kind: 'LOCAL', address: '', map_url: '',
    can_sell: true, can_store: true,
  })
  const service = await post(root + '/catalog', {
    name: 'Servicio teclado T11-D', kind: 'SERVICIO', unit: 'SERVICIO',
    sellable: true, price_cents: 155000,
  })
  return { email, password, company, location, service, auth, root }
}

async function loginByKeyboard(page: Page, f: Awaited<ReturnType<typeof seed>>) {
  await page.getByLabel('Correo electrónico', { exact: true }).focus()
  await expect(page.getByLabel('Correo electrónico', { exact: true })).toBeFocused()
  await page.keyboard.type(f.email)
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Contraseña', { exact: true })).toBeFocused()
  await page.keyboard.type(f.password)
  await page.keyboard.press('Enter')
}

for (const viewport of [
  { name: 'escritorio', width: 1440, height: 900 },
  { name: 'móvil 390px', width: 390, height: 844 },
]) {
  test('T11-D ' + viewport.name + ': teclado, empresas, POS, F5 y formulario sin POST', async ({ page, request }) => {
    const f = await seed(request)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    let writes = 0
    page.on('request', req => {
      if (req.method() === 'POST' && req.url().endsWith('/api/v1' + f.root + '/sales')) writes++
    })
    await page.goto('/real/empresas')
    await loginByKeyboard(page, f)
    await expect(page.getByRole('heading', { name: 'Mis empresas' })).toBeVisible()
    await expect(page.getByRole('button', { name: new RegExp('T11-D responsive') })).toBeVisible()
    // Native button activation via keyboard must navigate without a pointer.
    const companyButton = page.getByRole('button', { name: /T11-D responsive/ })
    await companyButton.focus()
    await expect(companyButton).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Datos de la empresa' })).toBeVisible()
    await expect(page.getByRole('heading', { name: f.company.name })).toBeVisible()

    const posButton = page.getByRole('button', { name: 'Abrir Punto de venta' })
    await posButton.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Punto de venta' })).toBeVisible()
    const locationSelect = page.getByLabel('Sede del punto de venta')
    await locationSelect.selectOption(f.location.id)
    const itemButton = page.getByRole('button', { name: /Servicio teclado T11-D/ })
    await itemButton.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Precio unitario de la venta')).toHaveValue('1550,00')
    await expect(page.getByLabel('Precio unitario de la venta')).toBeDisabled()
    await page.getByLabel('Cantidad del artículo').fill('2')
    await expect(page.locator('.real-pos-line-preview')).toContainText('3.100,00')
    await page.getByRole('button', { name: 'Agregar al carrito' }).click()
    await expect(page.getByRole('region', { name: 'Carrito de venta' }))
      .toContainText('3.100,00')
    // E27-SAL-05: client must not advance an inconsistent payment declaration.
    await page.getByLabel('Importe declarado 1').fill('3000')
    await page.getByRole('button', { name: 'Revisar venta y pagos' }).click()
    await expect(page.getByRole('alert')).toContainText('Los pagos declarados deben sumar exactamente el total.')
    await expect(page.getByLabel('Revisión final de la venta')).toHaveCount(0)
    await page.getByLabel('Importe declarado 1').fill('3100')
    await page.getByRole('button', { name: 'Revisar venta y pagos' }).click()
    await expect(page.getByRole('button', { name: 'Confirmar y registrar venta REAL' }))
      .toBeDisabled()
    expect(writes).toBe(0)

    if (viewport.width === 390) {
      // A working button alone doesn't establish responsive layout.
      // Detect page-level horizontal overflow without forbidding intentional
      // scroll inside individual data tables.
      const documentWidth = await page.evaluate(() =>
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))
      expect(documentWidth, 'El documento REAL no debe desbordar el viewport móvil').toBeLessThanOrEqual(viewport.width + 1)
    }

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Iniciar sesión real' })).toBeVisible()
    await loginByKeyboard(page, f)
    await expect(page.getByRole('heading', { name: 'Punto de venta' })).toBeVisible()
    expect(writes).toBe(0)
    // Real business and catalog must remain server-backed after a fresh login.
    await expect(page.getByRole('button', { name: /Servicio teclado T11-D/ })).toBeVisible()
  })
}

test('T11-D: REAL→DEMO→REAL no conserva sesión ni hace POST comercial', async ({ page, request }) => {
  const f = await seed(request)
  let commercialPosts = 0
  page.on('request', req => {
    if (req.method() === 'POST' && /\/api\/v1\/businesses\/[^/]+\/(sales|purchases|inventory)/.test(req.url())) commercialPosts++
  })
  await page.goto('/real/empresas/' + f.company.id)
  await loginByKeyboard(page, f)
  await expect(page.getByRole('heading', { name: 'Datos de la empresa' })).toBeVisible()
  await page.getByRole('link', { name: 'Entrar a DEMO' }).click()
  await expect(page).toHaveURL(/\/inicio$/)
  await expect(page.getByText('Sin autenticación ni pagos reales', { exact: false })).toBeVisible()
  await page.goto('/real/empresas/' + f.company.id)
  await expect(page.getByRole('heading', { name: 'Iniciar sesión real' })).toBeVisible()
  expect(commercialPosts).toBe(0)
})
