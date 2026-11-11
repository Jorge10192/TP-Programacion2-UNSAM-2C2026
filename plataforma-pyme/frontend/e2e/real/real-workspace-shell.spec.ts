import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

/** E3-1B. Real shell requires disposable PostgreSQL/QA, never user databases. */
const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1') {
    throw new Error('E3-1B necesita una base PostgreSQL exclusivamente descartable')
  }
})

test('E3-1B: selector multiempresa real y drawer accesible no filtran DEMO', async ({ page, request }) => {
  const email = 'e31b-shell-' + randomUUID() + '@example.com'
  const password = 'E3 1B disposable QA only 2026!'
  const register = await request.post(api + '/auth/register', {
    data: { email, password, display_name: 'QA E3-1B' },
  })
  expect(register.status(), await register.text()).toBe(201)
  const login = await request.post(api + '/auth/login', { data: { email, password } })
  expect(login.status(), await login.text()).toBe(200)
  const headers = { Authorization: 'Bearer ' + (await login.json()).access_token }
  async function create(name: string): Promise<{ id: string }> {
    const result = await request.post(api + '/businesses', {
      headers: { ...headers, 'Idempotency-Key': randomUUID() },
      data: { name, category: 'QA', activity_kind: 'MIXTO' },
    })
    expect(result.status(), await result.text()).toBe(201)
    return result.json()
  }
  const a = await create('E3 Alfa ' + randomUUID().slice(0, 6))
  const b = await create('E3 Beta ' + randomUUID().slice(0, 6))
  let commercialWrites = 0
  page.on('request', (req) => {
    if (/\/api\/v1\/businesses\/[^/]+\/(?:purchases|sales|inventory)/.test(req.url()) && req.method() !== 'GET') {
      commercialWrites++
    }
  })

  await page.goto('/real/empresas/' + a.id)
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Empresa real', exact: true })).toBeVisible()
  const selector = page.getByLabel('Cambiar de empresa REAL')
  await expect(selector).toHaveValue(a.id)
  await selector.selectOption(b.id)
  await expect(page).toHaveURL(new RegExp('/real/empresas/' + b.id + '$'))
  await expect(page.getByRole('heading', { name: 'Empresa real', exact: true })).toBeVisible()
  await expect(selector).toHaveValue(b.id)
  const menu = page.locator('#real-workspace-nav')
  for (const forbidden of ['Caja', 'Cuentas', 'Gastos', 'QR Mercado Pago', 'Guías de apoyo']) {
    await expect(menu.getByRole('button', { name: forbidden, exact: true })).toHaveCount(0)
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Abrir menú' }).click()
  await expect(menu).toHaveClass(/rw-sidebar-open/)
  await expect(menu.getByRole('button', { name: 'Punto de venta', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).not.toHaveClass(/rw-sidebar-open/)
  const docWidth = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))
  expect(docWidth, 'El shell REAL no debe desbordar el viewport móvil').toBeLessThanOrEqual(391)
  expect(commercialWrites).toBe(0)
})
