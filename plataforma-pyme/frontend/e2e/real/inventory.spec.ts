import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1') throw new Error('Requires disposable QA environment')
})
async function seed(request: APIRequestContext) {
  const email = `t08-${randomUUID()}@example.com`, password = 'Disposable QA password 2026!'
  const reg = await request.post(`${api}/auth/register`, { data: { email, password, display_name: 'T08 QA' } })
  expect(reg.status()).toBe(201)
  const login = await request.post(`${api}/auth/login`, { data: { email, password } })
  expect(login.status()).toBe(200)
  const headers = { Authorization: `Bearer ${(await login.json()).access_token}` }
  const post = async (path: string, data: object, status = 201) => {
    const response = await request.post(api + path, { headers: { ...headers, 'Idempotency-Key': randomUUID() }, data })
    expect(response.status(), await response.text()).toBe(status)
    return response.json()
  }
  const business = await post('/businesses', { name: 'T08 isolated QA', category: 'Pruebas', activity_kind: 'MIXTO' })
  const root = `/businesses/${business.id}`
  const location = async (name: string) => post(root + '/locations', { name, kind: 'DEPOSITO', address: '', map_url: '', can_store: true, can_sell: false })
  const source = await location('Origen QA'), target = await location('Destino QA')
  const item = await post(root + '/catalog', { name: 'Articulo QA', sku: 'T08-001', kind: 'REVENTA', unit: 'UNIDAD', sellable: true })
  const adjustment = (kind: string, quantity: number, version: number) => post(root + '/inventory/adjustments', {
    kind, catalog_item_id: item.id, location_id: source.id, quantity_milli: quantity, expected_version: version, reason: 'Fixture QA aislado',
  })
  await adjustment('STOCK_INICIAL', 10000, 0)
  const get = async (suffix: string) => {
    const response = await request.get(api + root + '/inventory/' + suffix, { headers })
    expect(response.status()).toBe(200)
    return response.json()
  }
  return { email, password, business, source, target, item, adjustment, get, post, root }
}
type Fixture = Awaited<ReturnType<typeof seed>>
async function login(page: Page, f: Fixture) {
  await page.getByLabel('Correo electrónico', { exact: true }).fill(f.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(f.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Inventario', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Stock inicial y ajustes', exact: true })).toBeEnabled()
}
async function open(page: Page, f: Fixture, transfer = false) {
  await page.goto(`/real/empresas/${f.business.id}/inventario`)
  await login(page, f)
  await page.getByRole('button', { name: transfer ? 'Transferir entre ubicaciones' : 'Stock inicial y ajustes', exact: true }).click()
  const panel = page.getByRole('region', { name: transfer ? 'Transferencia real entre sedes' : 'Stock inicial y ajustes REALES', exact: true })
  await panel.getByLabel('Artículo físico activo').selectOption(f.item.id)
  await panel.getByLabel(transfer ? 'Ubicación de origen' : 'Ubicación con almacenamiento').selectOption(f.source.id)
  if (transfer) await panel.getByLabel('Ubicación de destino').selectOption(f.target.id)
  else await panel.getByLabel('Tipo de operación').selectOption('AJUSTE_ENTRADA')
  await panel.getByLabel(transfer ? 'Cantidad de traslado' : 'Cantidad a agregar').fill('1')
  await panel.getByLabel(transfer ? 'Motivo del traslado' : 'Motivo obligatorio (3 a 500 caracteres)').fill('Prueba automatizada aislada')
  await panel.getByRole('checkbox').check()
  const submit = panel.getByRole('button', { name: transfer ? 'Confirmar transferencia REAL' : 'Confirmar operación REAL', exact: true })
  await expect(submit).toBeEnabled()
  return { panel, submit }
}
for (const transfer of [false, true]) {
  test(`Respuesta perdida, F5 y replay sin duplicados: ${transfer ? 'traslado' : 'ajuste'}`, async ({ page, request }) => {
    const f = await seed(request)
    const { panel, submit } = await open(page, f, transfer)
    page.on('dialog', d => d.accept())
    const suffix = transfer ? 'transfers' : 'adjustments'
    const captured: { key: string | undefined; body: string | null }[] = []
    const statuses: number[] = []
    await page.route(`**/inventory/${suffix}`, async route => {
      if (route.request().method() !== 'POST') return route.continue()
      captured.push({ key: route.request().headers()['idempotency-key'], body: route.request().postData() })
      const response = await route.fetch()
      statuses.push(response.status())
      if (captured.length === 1) {
        expect(response.status()).toBe(201) // Server committed; browser loses only the response.
        return route.abort('failed')
      }
      await route.fulfill({ response })
    })
    await submit.click()
    await expect(panel.getByRole('alert')).toContainText('Resultado incierto')
    const before = await f.get('movements')
    expect(before).toHaveLength(transfer ? 3 : 2)
    if (transfer) {
      // Strict E27-INV-02: one atomic transfer, two opposite signed movements,
      // one shared operation, net zero across the two locations.
      const pair = before.filter((movement: { event_type: string }) =>
        movement.event_type === 'TRASLADO_SALIDA' ||
        movement.event_type === 'TRASLADO_ENTRADA')
      expect(pair).toHaveLength(2)
      expect(pair.map((m: { delta_milli: number }) => m.delta_milli)
        .sort((a: number, b: number) => a - b)).toEqual([-1000, 1000])
      expect(pair.map((m: { location_id: string }) => m.location_id).sort())
        .toEqual([f.source.id, f.target.id].sort())
      expect(new Set(pair.map((m: { inventory_operation_id: string }) =>
        m.inventory_operation_id)).size).toBe(1)
    }
    await page.reload()
    await login(page, f)
    await page.getByRole('button', { name: transfer ? 'Transferir entre ubicaciones' : 'Stock inicial y ajustes', exact: true }).click()
    await expect(panel.getByRole('heading', { name: transfer ? 'Existe un intento de traslado guardado' : 'Operación pendiente guardada: Ajuste de entrada' })).toBeVisible()
    expect(captured).toHaveLength(1) // Mount + reload + login must not send POST.
    await panel.getByRole('button', { name: transfer ? 'Reintentar MISMO traslado' : 'Reintentar MISMA operación', exact: true }).click()
    await expect(panel.getByRole('heading', { name: transfer ? 'Traslado confirmado' : 'Operación confirmada: AJUSTE ENTRADA', exact: true })).toBeVisible()
    expect(captured).toHaveLength(2)
    expect(captured[1]).toEqual(captured[0])
    expect(statuses).toEqual([201, 200])
    expect(await f.get('movements')).toEqual(before)
    const balances = await f.get('balances')
    expect(balances.find((b: any) => b.location_id === f.source.id).quantity_milli).toBe(transfer ? 9000 : 11000)
    if (transfer) expect(balances.find((b: any) => b.location_id === f.target.id).quantity_milli).toBe(1000)
  })
}
test('Versión obsoleta devuelve 409 sin nuevo movimiento ni reintento automático', async ({ page, request }) => {
  const f = await seed(request)
  const { panel, submit } = await open(page, f)
  await f.adjustment('AJUSTE_ENTRADA', 2000, 1) // Another session changes the version.
  let posts = 0
  page.on('request', r => { if (r.method() === 'POST' && r.url().endsWith('/inventory/adjustments')) posts++ })
  page.on('dialog', d => d.accept())
  const response = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/inventory/adjustments'))
  await submit.click()
  expect((await response).status()).toBe(409)
  await expect(panel.getByRole('alert')).toContainText('Conflicto')
  expect(posts).toBe(1)
  expect(await f.get('movements')).toHaveLength(2)
  const [balance] = await f.get('balances')
  expect([balance.quantity_milli, balance.version]).toEqual([12000, 2])
})
test('Historial de más de 100 filas, filtro de sede y artículo; cambio entre páginas', async ({ page, request }) => {
  const f = await seed(request)
  for (let version = 1; version <= 104; version++) await f.adjustment('AJUSTE_ENTRADA', 1000, version)
  await page.goto(`/real/empresas/${f.business.id}/inventario`)
  await login(page, f)
  await page.getByRole('button', { name: 'Historial de movimientos', exact: true }).click()
  await expect(page.locator('.real-inventory-movement')).toHaveCount(100)
  await page.getByRole('button', { name: /Cargar más/ }).click()
  await expect(page.locator('.real-inventory-movement')).toHaveCount(105)
  const ids = await page.locator('.real-inventory-movement').allTextContents()
  expect(new Set(ids).size).toBe(105)
  await page.getByLabel('Ubicación', { exact: true }).selectOption(f.target.id)
  await expect(page.locator('.real-inventory-movement')).toHaveCount(0)
  await page.getByLabel('Ubicación', { exact: true }).selectOption(f.source.id)
  await expect(page.locator('.real-inventory-movement')).toHaveCount(100)
  await page.getByLabel('Artículo del catálogo cargado', { exact: true }).selectOption(f.item.id)
  await expect(page.locator('.real-inventory-movement')).toHaveCount(100)
  await f.adjustment('AJUSTE_ENTRADA', 1000, 105)
  await page.getByRole('button', { name: /Cargar más/ }).click()
  await expect(page.getByRole('alert')).toContainText('El historial cambió mientras se paginaba')
  await expect(page.locator('.real-inventory-movement')).toHaveCount(100)
  await page.getByRole('button', { name: 'Actualizar desde API', exact: true }).click()
  await expect(page.getByRole('button', { name: /Cargar más/ })).toBeEnabled()
  await page.getByRole('button', { name: /Cargar más/ }).click()
  await expect(page.locator('.real-inventory-movement')).toHaveCount(106)
})
