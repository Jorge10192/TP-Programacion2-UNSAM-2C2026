import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

/** QA browser REAL for remaining CRUD/persistence routes; disposable API ONLY. */
const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1') throw new Error('T11-F requiere PostgreSQL efímero')
})
async function owner(request: APIRequestContext) {
  const email = 't11-crud-' + randomUUID() + '@example.com'
  const password = 'T11 CRUD QA aislado 2026!'
  const reg = await request.post(api + '/auth/register', {
    data: { email, password, display_name: 'T11 CRUD' },
  })
  expect(reg.status(), await reg.text()).toBe(201)
  const log = await request.post(api + '/auth/login', { data: { email, password } })
  expect(log.status(), await log.text()).toBe(200)
  const headers = { Authorization: 'Bearer ' + (await log.json()).access_token }
  const comp = await request.post(api + '/businesses', {
    headers: { ...headers, 'Idempotency-Key': randomUUID() },
    data: { name: 'T11 CRUD aislado', category: 'QA', activity_kind: 'MIXTO' },
  })
  expect(comp.status(), await comp.text()).toBe(201)
  const business = await comp.json()
  return { email, password, headers, root: '/businesses/' + business.id, business }
}
async function signIn(page: Page, u: { email: string; password: string }) {
  await page.getByLabel('Correo electrónico', { exact: true }).fill(u.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(u.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
}
test('T11-F: CRUD sedes, fichas y proveedores UI → PostgreSQL → F5', async ({ page, request }) => {
  const u = await owner(request)
  const get = async (suffix: string) => {
    const result = await request.get(api + u.root + suffix, { headers: u.headers })
    expect(result.status(), await result.text()).toBe(200)
    return result.json()
  }
  await page.goto('/real/empresas/' + u.business.id + '/ubicaciones')
  await signIn(page, u)
  await expect(page.getByRole('heading', { name: 'Ubicaciones' })).toBeVisible()
  const firstName = 'T11 sede primaria ' + randomUUID().slice(0, 5)
  const secondName = 'T11 sede pausada ' + randomUUID().slice(0, 5)
  for (const name of [firstName, secondName]) {
    await page.getByRole('button', { name: 'Crear ubicación real' }).click()
    await page.getByRole('heading', { name: 'Nueva ubicación' }).waitFor()
    await page.getByLabel('Nombre', { exact: true }).fill(name)
    await page.getByRole('button', { name: 'Guardar en PostgreSQL' }).click()
    await expect(page.locator('.real-ops-tile').filter({ hasText: name })).toBeVisible()
  }
  const second = page.locator('.real-ops-tile').filter({ hasText: secondName })
  page.once('dialog', dialog => dialog.accept())
  await second.getByRole('button', { name: 'Pausar' }).click()
  await expect(second).toContainText('PAUSADA')
  await page.reload()
  await signIn(page, u)
  await expect(page.locator('.real-ops-tile').filter({ hasText: secondName })).toContainText('PAUSADA')
  const locs = await get('/locations')
  expect(locs).toHaveLength(2)
  expect(locs.find((row: { name: string }) => row.name === secondName).status).toBe('PAUSADA')
  const paused = page.locator('.real-ops-tile').filter({ hasText: secondName })
  page.once('dialog', dialog => dialog.accept())
  await paused.getByRole('button', { name: 'Reactivar' }).click()
  await expect(paused).toContainText('ACTIVA')

  await page.goto('/real/empresas/' + u.business.id + '/catalogo')
  await expect(page.getByRole('heading', { name: 'Catálogo de artículos' })).toBeVisible()
  await page.getByRole('button', { name: 'Crear artículo REAL' }).click()
  const itemName = 'T11 catálogo ' + randomUUID().slice(0, 5)
  await page.getByLabel('Nombre', { exact: true }).fill(itemName)
  await page.getByLabel('Precio (pesos, opcional)').fill('1200')
  await page.getByLabel('Costo de referencia (pesos, opcional)').fill('700')
  await page.getByRole('button', { name: 'Guardar artículo' }).click()
  const tile = page.locator('.real-catalog-tile').filter({ hasText: itemName })
  await expect(tile).toContainText('ACTIVO')
  await expect(tile).toContainText('1.200,00')
  page.once('dialog', dialog => dialog.accept())
  await tile.getByRole('button', { name: 'Desactivar' }).click()
  await expect(tile).toContainText('INACTIVO')
  await page.reload()
  await signIn(page, u)
  await expect(page.locator('.real-catalog-tile').filter({ hasText: itemName })).toContainText('INACTIVO')
  const catalog = await get('/catalog')
  expect(catalog).toHaveLength(1)
  expect(catalog[0]).toMatchObject({ name: itemName, status: 'INACTIVO' })

  await page.goto('/real/empresas/' + u.business.id + '/proveedores')
  await expect(page.getByRole('heading', { name: 'Proveedores' })).toBeVisible()
  const supplierName = 'T11 proveedor ' + randomUUID().slice(0, 6)
  await page.getByLabel('Nombre comercial').fill(supplierName)
  await page.getByRole('button', { name: 'Crear proveedor' }).click()
  const supplierTile = page.locator('.real-ops-tile').filter({ hasText: supplierName })
  await expect(supplierTile).toContainText('ACTIVO')
  page.once('dialog', dialog => dialog.accept())
  await supplierTile.getByRole('button', { name: 'Desactivar' }).click()
  await expect(supplierTile).toContainText('INACTIVO')
  await page.reload()
  await signIn(page, u)
  await expect(page.locator('.real-ops-tile').filter({ hasText: supplierName })).toContainText('INACTIVO')
  const suppliers = await get('/suppliers')
  expect(suppliers).toHaveLength(1)
  expect(suppliers[0]).toMatchObject({ name: supplierName, status: 'INACTIVO' })
  expect(await get('/inventory/balances')).toEqual([])
})
