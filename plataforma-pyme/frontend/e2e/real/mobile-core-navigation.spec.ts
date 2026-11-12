import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1') throw new Error('T11-F responsive requiere PostgreSQL efímero')
})

test('E27-RESP-01: rutas REAL principales en móvil sin overflow ni escrituras', async ({ page, request }) => {
  const email = 't11-mobile-' + randomUUID() + '@example.com'
  const password = 'T11 mobile readonly QA descartable 2026!'
  const reg = await request.post(api + '/auth/register', {
    data: { email, password, display_name: 'T11 móvil QA' },
  })
  expect(reg.status(), await reg.text()).toBe(201)
  const logged = await request.post(api + '/auth/login', { data: { email, password } })
  expect(logged.status(), await logged.text()).toBe(200)
  const auth = { Authorization: 'Bearer ' + (await logged.json()).access_token }
  const companyResp = await request.post(api + '/businesses', {
    headers: { ...auth, 'Idempotency-Key': randomUUID() },
    data: { name: 'QA T11 móvil', category: 'QA', activity_kind: 'MIXTO' },
  })
  expect(companyResp.status(), await companyResp.text()).toBe(201)
  const company = await companyResp.json()
  await page.setViewportSize({ width: 390, height: 844 })
  let writes = 0
  page.on('request', req => {
    if (req.url().includes('/api/v1/businesses/') && req.method() !== 'GET') writes++
  })
  const sections: Array<{ suffix: string; heading: string }> = [
    { suffix: '', heading: 'Datos de la empresa' },
    { suffix: '/ubicaciones', heading: 'Ubicaciones' },
    { suffix: '/catalogo', heading: 'Catálogo de artículos' },
    { suffix: '/proveedores', heading: 'Proveedores' },
    { suffix: '/compras', heading: 'Compras y recepción' },
    { suffix: '/inventario', heading: 'Inventario' },
    { suffix: '/pos', heading: 'Punto de venta' },
    { suffix: '/ventas', heading: 'Historial de ventas' },
  ]
  for (const route of sections) {
    await page.goto('/real/empresas/' + company.id + route.suffix)
    await expect(page.getByRole('heading', { name: 'Iniciar sesión real' })).toBeVisible()
    await page.getByLabel('Correo electrónico', { exact: true }).fill(email)
    await page.getByLabel('Contraseña', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
    await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: /API rechazó|No se pudo|Error de red/ })).toHaveCount(0)
    const width = await page.evaluate(() =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))
    expect(width, 'Desborde horizontal móvil en ruta ' + route.suffix)
      .toBeLessThanOrEqual(391)
  }
  expect(writes, 'Recorrido móvil de solo lectura no debe emitir POST/PATCH/DELETE comerciales').toBe(0)
})
