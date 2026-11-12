import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const base = 'http://127.0.0.1:18001/api/v1'

test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1')
    throw new Error('T10-C Playwright necesita PostgreSQL descartable')
})

async function seed(request: APIRequestContext) {
  const email = `t10-pos-${randomUUID()}@example.com`
  const password = 'Clave QA T10-C descartable 2026'
  const reg = await request.post(base + '/auth/register', {
    data: { email, password, display_name: 'T10 POS browser test' },
  })
  expect(reg.status(), await reg.text()).toBe(201)
  const login = await request.post(base + '/auth/login', { data: { email, password } })
  expect(login.status(), await login.text()).toBe(200)
  const token: string = (await login.json()).access_token
  const auth = { Authorization: 'Bearer ' + token }
  const company = await request.post(base + '/businesses', {
    headers: { ...auth, 'Idempotency-Key': randomUUID() },
    data: { name: 'T10 empresa POS aislada', category: 'Servicios', activity_kind: 'MIXTO' },
  })
  expect(company.status(), await company.text()).toBe(201)
  const businessId: string = (await company.json()).id
  const location = await request.post(base + '/businesses/' + businessId + '/locations', {
    headers: auth,
    data: { name: 'Sede POS A', kind: 'LOCAL', can_sell: true, can_store: true },
  })
  expect(location.status(), await location.text()).toBe(201)
  const locationId: string = (await location.json()).id
  const item = await request.post(base + '/businesses/' + businessId + '/catalog', {
    headers: auth,
    data: { name: 'Servicio POS prueba', kind: 'SERVICIO', unit: 'SERVICIO',
      sellable: true, price_cents: 150000 },
  })
  expect(item.status(), await item.text()).toBe(201)
  const catalog = await item.json()
  return { email, password, businessId, locationId, itemId: catalog.id }
}

async function open(page: Page, f: Awaited<ReturnType<typeof seed>>) {
  await page.goto('/real/empresas/' + f.businessId + '/pos')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(f.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(f.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Punto de venta' })).toBeVisible()
}

test('T10-C POS REAL: carrito, sede, precio admin, descuento, sin POST de venta', async ({ page, request }) => {
  const fixture = await seed(request)
  let salePosts = 0
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().includes('/api/v1/businesses/') &&
      req.url().endsWith('/sales')) salePosts++
  })
  await open(page, fixture)
  await expect(page.getByText('Modo de validación T10-D.')).toBeVisible()
  await expect(page.locator('.real-pos-product')).toHaveCount(1)
  await page.getByLabel('Sede del punto de venta').selectOption(fixture.locationId)
  await page.getByRole('button', { name: /Servicio POS prueba/ }).click()
  await page.getByLabel('Cantidad del artículo').fill('2')
  // El catálogo propone $ 1.500,00 por unidad: bloqueado incluso para el
  // titular hasta elegir explícitamente la excepción prevista por P01.
  await expect(page.getByLabel('Precio unitario de la venta')).toBeDisabled()
  await expect(page.getByLabel('Precio unitario de la venta')).toHaveValue('1500,00')
  await expect(page.locator('.real-pos-line-preview')).toContainText('3.000,00')
  await page.getByRole('button', { name: 'Modificar precio excepcionalmente' }).click()
  await expect(page.getByLabel('Precio unitario de la venta')).toBeEnabled()
  await page.getByLabel('Precio unitario de la venta').fill('1800,50')
  await expect(page.locator('.real-pos-line-preview')).toContainText('3.601,00')
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  const cart = page.getByRole('region', { name: 'Carrito de venta' })
  await expect(cart).toContainText('Cantidad: 2 SERVICIO')
  await expect(cart).toContainText('Precio unitario:')
  await expect(cart).toContainText('Subtotal del producto: ')
  await expect(cart).toContainText('3.601,00')
  await page.getByLabel('Descuento de la venta').fill('100')
  await expect(page.locator('.real-pos-summary')).toContainText('3.501,00')
  // Reintegración funcional del botón DEMO "Agregar otro": sobre un artículo
  // ya incluido se edita el mismo renglón, sin duplicarlo ni eliminarlo.
  await cart.getByRole('button', { name: 'Editar' }).click()
  await expect(page.getByLabel('Cantidad del artículo')).toHaveValue('2')
  await page.getByLabel('Cantidad del artículo').fill('3')
  await expect(page.locator('.real-pos-line-preview')).toContainText('5.401,50')
  await page.getByRole('button', { name: 'Actualizar en carrito' }).click()
  await expect(cart.locator('.real-pos-cart-row')).toHaveCount(1)
  await expect(cart).toContainText('5.401,50')
  await expect(page.locator('.real-pos-summary')).toContainText('5.301,50')
  // El importe automático debe seguir el NUEVO total, no el importe previo.
  await expect(page.getByLabel('Importe declarado 1')).toHaveValue('5301,50')
  await page.getByRole('button', { name: 'Revisar venta y pagos' }).click()
  await expect(page.getByLabel('Revisión final de la venta')).toContainText('5.301,50')
  await expect(page.getByRole('button', { name: 'Confirmar y registrar venta REAL' })).toBeDisabled()
  expect(salePosts).toBe(0)

  await page.reload()
  await open(page, fixture)
  await expect(page.getByRole('region', { name: 'Carrito de venta' }))
    .toContainText('Aún no agregaste artículos')
  expect(salePosts).toBe(0)
})

test('T10-C POS REAL: 501 fichas paginadas, filtro local explícito y sin ventas', async ({ page, request }) => {
  const fixture = await seed(request)
  const iso = new Date().toISOString()
  const pages = Array.from({ length: 501 }, (_, i) => ({
    id: randomUUID(), business_id: fixture.businessId,
    name: 'Servicio paginado ' + String(i + 1).padStart(3, '0'),
    kind: 'SERVICIO', item_type: 'SERVICIO',
    category: 'QA', sku: null, unit: 'SERVICIO',
    description: '', observations: '', sellable: true,
    price_cents: 10000, reference_cost_cents: null,
    status: 'ACTIVO', created_at: iso, updated_at: iso,
  }))
  const observed: number[] = []
  await page.route(url =>
    url.pathname === '/api/v1/businesses/' + fixture.businessId + '/catalog' &&
    url.searchParams.has('offset'), async route => {
    const url = new URL(route.request().url())
    const offset = Number(url.searchParams.get('offset'))
    const limit = Number(url.searchParams.get('limit'))
    observed.push(offset)
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify(pages.slice(offset, offset + limit)),
    })
  })
  await open(page, fixture)
  await expect(page.locator('.real-pos-product')).toHaveCount(100)
  for (const target of [200, 300, 400, 500, 501]) {
    await page.getByRole('button', { name: 'Cargar más fichas de catálogo' }).click()
    await expect(page.locator('.real-pos-product')).toHaveCount(target)
  }
  await expect(page.getByText('Se llegó al final del catálogo consultado.')).toBeVisible()
  await page.getByLabel('Buscar artículos cargados').fill('Servicio paginado 501')
  await expect(page.locator('.real-pos-product')).toHaveCount(1)
  // En React StrictMode (desarrollo) la carga inicial GET puede duplicarse.
  // No es una operación de escritura ni otra página. Las páginas posteriores
  // deben conservar exactamente su orden y no duplicar artículos en la UI.
  expect(observed.filter(offset => offset === 0).length).toBeGreaterThanOrEqual(1)
  expect(observed.filter(offset => offset !== 0)).toEqual([100, 200, 300, 400, 500])
  await expect(page.getByRole('button', { name: 'Revisar venta y pagos' })).toBeDisabled()
})

test('T10-D: POS genera UNA venta de servicio tras revisión y consentimiento, sin POST automático', async ({ page, request }) => {
  const fixture = await seed(request)
  let posts = 0
  page.on('request', req => {
    if (req.method() === 'POST' &&
      req.url().endsWith('/api/v1/businesses/' + fixture.businessId + '/sales')) posts++
  })
  await open(page, fixture)
  await page.getByLabel('Sede del punto de venta').selectOption(fixture.locationId)
  await page.getByRole('button', { name: /Servicio POS prueba/ }).click()
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await expect(page.getByLabel('Importe declarado 1')).toHaveValue('1500,00')
  await expect(page.getByRole('button', { name: 'Revisar venta y pagos' })).toBeEnabled()
  expect(posts).toBe(0)

  await page.getByRole('button', { name: 'Revisar venta y pagos' }).click()
  await expect(page.getByRole('button', { name: 'Confirmar y registrar venta REAL' })).toBeDisabled()
  expect(posts).toBe(0)
  await page.getByLabel('Acepto registrar esta venta REAL').check()
  await page.getByRole('button', { name: 'Confirmar y registrar venta REAL' }).click()
  await expect(page.getByText('Venta confirmada en PostgreSQL.', { exact: false })).toBeVisible()
  expect(posts).toBe(1)
  const list = await request.get(base + '/businesses/' + fixture.businessId + '/sales', {
    headers: { Authorization: 'Bearer ' + (await (await request.post(base + '/auth/login', {
      data: { email: fixture.email, password: fixture.password },
    })).json()).access_token },
  })
  expect(list.status(), await list.text()).toBe(200)
  const entries = await list.json()
  expect(entries).toHaveLength(1)
  expect(entries[0].total_cents).toBe(150000)

  await page.reload()
  await page.getByLabel('Correo electrónico', { exact: true }).fill(fixture.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(fixture.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Punto de venta' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Revisar venta y pagos' })).toBeDisabled()
  expect(posts).toBe(1)
})

test('T10-E: pagos mixtos, precio excepcional y descuento quedan en comprobante REAL', async ({ page, request }) => {
  const fixture = await seed(request)
  let posts = 0
  page.on('request', req => {
    if (req.method() === 'POST' &&
      req.url().endsWith('/api/v1/businesses/' + fixture.businessId + '/sales')) posts++
  })
  await open(page, fixture)
  await page.getByLabel('Sede del punto de venta').selectOption(fixture.locationId)
  await page.getByRole('button', { name: /Servicio POS prueba/ }).click()
  await page.getByRole('button', { name: 'Modificar precio excepcionalmente' }).click()
  await page.getByLabel('Precio unitario de la venta').fill('1800')
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await page.getByLabel('Descuento de la venta').fill('300')
  await expect(page.getByLabel('Importe declarado 1')).toHaveValue('1500,00')
  await page.getByLabel('Importe declarado 1').fill('1000')
  await page.getByRole('button', { name: 'Agregar otro medio de pago' }).click()
  await page.getByLabel('Medio de pago 2').selectOption('TRANSFERENCIA')
  await page.getByLabel('Importe declarado 2').fill('500')
  await page.getByLabel('Referencia de pago 2').fill('Referencia T10 E QA')
  await page.getByRole('button', { name: 'Revisar venta y pagos' }).click()
  const review = page.getByLabel('Revisión final de la venta')
  await expect(review).toContainText('1.800,00')
  await expect(review).toContainText('300,00')
  await expect(review).toContainText('1.500,00')
  expect(posts).toBe(0)
  await page.getByLabel('Acepto registrar esta venta REAL').check()
  await page.getByRole('button', { name: 'Confirmar y registrar venta REAL' }).click()
  await expect(page.getByText('Venta confirmada en PostgreSQL.', { exact: false })).toBeVisible()
  expect(posts).toBe(1)

  const login = await request.post(base + '/auth/login', {
    data: { email: fixture.email, password: fixture.password },
  })
  expect(login.status(), await login.text()).toBe(200)
  const token = (await login.json()).access_token
  const res = await request.get(base + '/businesses/' + fixture.businessId + '/sales', {
    headers: { Authorization: 'Bearer ' + token },
  })
  expect(res.status(), await res.text()).toBe(200)
  const sales = await res.json()
  expect(sales).toHaveLength(1)
  expect(sales[0].total_cents).toBe(150000)
  const detail = await request.get(base + '/businesses/' + fixture.businessId + '/sales/' + sales[0].id, {
    headers: { Authorization: 'Bearer ' + token },
  })
  expect(detail.status(), await detail.text()).toBe(200)
  const receipt = await detail.json()
  expect(receipt.subtotal_cents).toBe(180000)
  expect(receipt.discount_cents).toBe(30000)
  expect(receipt.total_cents).toBe(150000)
  expect(receipt.lines[0].unit_price_cents).toBe(180000)
  expect(receipt.payments.map((p: { amount_cents: number }) => p.amount_cents)).toEqual([100000, 50000])
  expect(receipt.payments[1].method).toBe('TRANSFERENCIA')
  expect(receipt.payments[1].reference).toBe('Referencia T10 E QA')
})

test('T10-E: venta física desde POS debita stock y registra un solo movimiento', async ({ page, request }) => {
  const fixture = await seed(request)
  const login = await request.post(base + '/auth/login', {
    data: { email: fixture.email, password: fixture.password },
  })
  expect(login.status(), await login.text()).toBe(200)
  const auth = { Authorization: 'Bearer ' + (await login.json()).access_token }
  const root = '/businesses/' + fixture.businessId
  const product = await request.post(base + root + '/catalog', {
    headers: auth,
    data: {
      name: 'Producto físico T10-E', kind: 'REVENTA', unit: 'UNIDAD',
      sellable: true, price_cents: 200000,
    },
  })
  expect(product.status(), await product.text()).toBe(201)
  const productId = (await product.json()).id
  const stock = await request.post(base + root + '/inventory/adjustments', {
    headers: { ...auth, 'Idempotency-Key': randomUUID() },
    data: {
      kind: 'STOCK_INICIAL', catalog_item_id: productId,
      location_id: fixture.locationId, quantity_milli: 5000,
      expected_version: 0, reason: 'Stock inicial QA T10-E descartable',
    },
  })
  expect(stock.status(), await stock.text()).toBe(201)

  let posts = 0
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().endsWith(root + '/sales')) posts++
  })
  await open(page, fixture)
  await page.getByLabel('Sede del punto de venta').selectOption(fixture.locationId)
  await page.getByRole('button', { name: /Producto físico T10-E/ }).click()
  await expect(page.getByLabel('Precio unitario de la venta')).toHaveValue('2000,00')
  await page.getByLabel('Cantidad del artículo').fill('2')
  await expect(page.locator('.real-pos-line-preview')).toContainText('4.000,00')
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await page.getByRole('button', { name: 'Revisar venta y pagos' }).click()
  await expect(page.getByLabel('Revisión final de la venta')).toContainText('4.000,00')
  expect(posts).toBe(0)
  await page.getByLabel('Acepto registrar esta venta REAL').check()
  await page.getByRole('button', { name: 'Confirmar y registrar venta REAL' }).click()
  await expect(page.getByText('Venta confirmada en PostgreSQL.', { exact: false })).toBeVisible()
  expect(posts).toBe(1)

  const list = await request.get(base + root + '/sales', { headers: auth })
  expect(list.status(), await list.text()).toBe(200)
  const sales = await list.json()
  expect(sales).toHaveLength(1)
  const detail = await request.get(base + root + '/sales/' + sales[0].id, { headers: auth })
  expect(detail.status(), await detail.text()).toBe(200)
  const receipt = await detail.json()
  expect(receipt.total_cents).toBe(400000)
  expect(receipt.lines).toHaveLength(1)
  expect(receipt.lines[0].catalog_item_id).toBe(productId)
  expect(receipt.lines[0].quantity_milli).toBe(2000)
  expect(receipt.balances_after).toHaveLength(1)
  expect(receipt.balances_after[0].quantity_milli).toBe(3000)
  expect(receipt.balances_after[0].version).toBe(2)

  const balances = await request.get(base + root + '/inventory/balances', { headers: auth })
  expect(balances.status(), await balances.text()).toBe(200)
  const rows = await balances.json()
  const balance = rows.find((row: { catalog_item_id: string; location_id: string }) =>
    row.catalog_item_id === productId && row.location_id === fixture.locationId)
  expect(balance).toBeTruthy()
  expect([balance.quantity_milli, balance.version]).toEqual([3000, 2])
  const movements = await request.get(base + root + '/inventory/movements', { headers: auth })
  expect(movements.status(), await movements.text()).toBe(200)
  const history = await movements.json()
  const debits = history.filter((m: { catalog_item_id: string; event_type: string }) =>
    m.catalog_item_id === productId && m.event_type === 'VENTA_SALIDA')
  expect(debits).toHaveLength(1)
  expect(debits[0].delta_milli).toBe(-2000)
  expect(debits[0].sale_id).toBe(sales[0].id)
})

test('T10-E: 409 por stock cambiado después de agregar conserva pendiente y no reenvía', async ({ page, request }) => {
  const fixture = await seed(request)
  const login = await request.post(base + '/auth/login', {
    data: { email: fixture.email, password: fixture.password },
  })
  expect(login.status(), await login.text()).toBe(200)
  const headers = { Authorization: 'Bearer ' + (await login.json()).access_token }
  const root = '/businesses/' + fixture.businessId
  const product = await request.post(base + root + '/catalog', {
    headers,
    data: {
      name: 'Producto sin stock T10-E', kind: 'REVENTA', unit: 'UNIDAD',
      sellable: true, price_cents: 120000,
    },
  })
  expect(product.status(), await product.text()).toBe(201)
  const productId=(await product.json()).id
  // Primero había stock: el POS permite agregar exactamente la disponibilidad.
  const initial=await request.post(base+root+'/inventory/adjustments',{
    headers:{...headers,'Idempotency-Key':randomUUID()},
    data:{kind:'STOCK_INICIAL',catalog_item_id:productId,location_id:fixture.locationId,
      quantity_milli:1000,expected_version:0,reason:'QA carrera con venta concurrente'},
  })
  expect(initial.status(),await initial.text()).toBe(201)
  let posts = 0
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().endsWith(root + '/sales')) posts++
  })
  await open(page, fixture)
  await page.getByLabel('Sede del punto de venta').selectOption(fixture.locationId)
  await page.getByRole('button', { name: /Producto sin stock T10-E/ }).click()
  await expect(page.getByLabel('Disponibilidad de stock REAL')).toContainText('1 UNIDAD')
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  // Otra operación agota el stock antes de confirmar: FastAPI debe rechazar
  // la venta con 409 incluso cuando el borrador tenía saldo al cargarlo.
  const exhaust=await request.post(base+root+'/inventory/adjustments',{
    headers:{...headers,'Idempotency-Key':randomUUID()},
    data:{kind:'AJUSTE_SALIDA',catalog_item_id:productId,location_id:fixture.locationId,
      quantity_milli:1000,expected_version:1,reason:'Agotado concurrentemente en QA'},
  })
  expect(exhaust.status(),await exhaust.text()).toBe(201)
  await page.getByRole('button', { name: 'Revisar venta y pagos' }).click()
  await page.getByLabel('Acepto registrar esta venta REAL').check()
  const response = page.waitForResponse(resp =>
    resp.request().method() === 'POST' && resp.url().endsWith(root + '/sales'))
  await page.getByRole('button', { name: 'Confirmar y registrar venta REAL' }).click()
  expect((await response).status()).toBe(409)
  await expect(page.getByText('Hay una solicitud de venta guardada que requiere recuperación.', {
    exact: false,
  })).toBeVisible()
  expect(posts).toBe(1)
  await page.reload()
  await page.getByLabel('Correo electrónico', { exact: true }).fill(fixture.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(fixture.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Recuperar comprobante por solicitud (GET)' })).toBeVisible()
  expect(posts).toBe(1)
  await page.getByRole('button', { name: 'Recuperar comprobante por solicitud (GET)' }).click()
  await expect(page.getByText('GET devolvió 404:', { exact: false })).toBeVisible()
  expect(posts).toBe(1)
  const sales = await request.get(base + root + '/sales', { headers })
  expect(sales.status(), await sales.text()).toBe(200)
  expect(await sales.json()).toHaveLength(0)
})

test('T10-E: POST perdido antes de llegar a API, GET 404 y replay manual conserva identidad', async ({ page, request }) => {
  const fixture = await seed(request)
  const attempts: { key: string | null; body: string | null }[] = []
  await page.route('**/api/v1/businesses/' + fixture.businessId + '/sales', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    attempts.push({
      key: route.request().headers()['idempotency-key'] ?? null,
      body: route.request().postData(),
    })
    if (attempts.length === 1) return route.abort('failed') // Sin llegar a PostgreSQL
    return route.continue()
  })
  await open(page, fixture)
  await page.getByLabel('Sede del punto de venta').selectOption(fixture.locationId)
  await page.getByRole('button', { name: /Servicio POS prueba/ }).click()
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await page.getByRole('button', { name: 'Revisar venta y pagos' }).click()
  await page.getByLabel('Acepto registrar esta venta REAL').check()
  await page.getByRole('button', { name: 'Confirmar y registrar venta REAL' }).click()
  await expect(page.getByText('Hay una solicitud de venta guardada que requiere recuperación.', {
    exact: false,
  })).toBeVisible()
  expect(attempts).toHaveLength(1)
  await page.getByRole('button', { name: 'Recuperar comprobante por solicitud (GET)' }).click()
  await expect(page.getByText('GET devolvió 404:', { exact: false })).toBeVisible()
  expect(attempts).toHaveLength(1)
  await page.getByLabel('Acepto reenviar la misma solicitud').check()
  await page.getByRole('button', { name: 'Reintentar exactamente esta venta' }).click()
  await expect(page.getByText('Venta confirmada en PostgreSQL.', { exact: false })).toBeVisible()
  expect(attempts).toHaveLength(2)
  expect(attempts[0].key).toMatch(/^[0-9a-f-]{36}$/i)
  expect(attempts[1]).toEqual(attempts[0])

  const login = await request.post(base + '/auth/login', {
    data: { email: fixture.email, password: fixture.password },
  })
  expect(login.status(), await login.text()).toBe(200)
  const token = (await login.json()).access_token
  const list = await request.get(base + '/businesses/' + fixture.businessId + '/sales', {
    headers: { Authorization: 'Bearer ' + token },
  })
  expect(list.status(), await list.text()).toBe(200)
  const sales = await list.json()
  expect(sales).toHaveLength(1)
  expect(sales[0].total_cents).toBe(150000)
})

test('T10-D: pérdida de respuesta después del 201, F5 y recuperación GET sin repetir POST', async ({ page, request }) => {
  const fixture = await seed(request)
  let intercepted = 0
  let postCalls = 0
  page.on('request', req => {
    if (req.method() === 'POST' &&
      req.url().endsWith('/api/v1/businesses/' + fixture.businessId + '/sales')) postCalls++
  })
  await page.route('**/api/v1/businesses/' + fixture.businessId + '/sales', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    intercepted++
    const response = await route.fetch()
    expect(response.status()).toBe(201) // transaction committed in disposable DB
    return route.abort('failed') // response lost AFTER commit
  })
  await open(page, fixture)
  await page.getByLabel('Sede del punto de venta').selectOption(fixture.locationId)
  await page.getByRole('button', { name: /Servicio POS prueba/ }).click()
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await page.getByRole('button', { name: 'Revisar venta y pagos' }).click()
  await page.getByLabel('Acepto registrar esta venta REAL').check()
  await page.getByRole('button', { name: 'Confirmar y registrar venta REAL' }).click()
  await expect(page.getByText('Hay una solicitud de venta guardada que requiere recuperación.', {
    exact: false,
  })).toBeVisible()
  expect(intercepted).toBe(1)
  expect(postCalls).toBe(1)

  await page.reload()
  await page.getByLabel('Correo electrónico', { exact: true }).fill(fixture.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(fixture.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Recuperación de venta' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recuperar comprobante por solicitud (GET)' })).toBeVisible()
  expect(postCalls).toBe(1)
  await page.getByRole('button', { name: 'Recuperar comprobante por solicitud (GET)' }).click()
  await expect(page.getByText('Venta confirmada en PostgreSQL.', { exact: false })).toBeVisible()
  expect(postCalls).toBe(1)
  await expect(page.getByRole('button', { name: 'Preparar otra venta' })).toBeVisible()
})

test('E3-1G: stock REAL por sede indica límite, bloquea exceso y se actualiza por GET', async ({page,request})=>{
  const f=await seed(request)
  const login=await request.post(base+'/auth/login',{data:{email:f.email,password:f.password}})
  expect(login.status(),await login.text()).toBe(200)
  const headers={Authorization:'Bearer '+(await login.json()).access_token}
  const root='/businesses/'+f.businessId
  const product=await request.post(base+root+'/catalog',{
    headers,
    data:{name:'Producto stock E3 disponible',kind:'REVENTA',
      unit:'UNIDAD',sellable:true,price_cents:200000},
  })
  expect(product.status(),await product.text()).toBe(201)
  const itemId=(await product.json()).id
  let postSales=0
  page.on('request',req=>{
    if(req.method()==='POST'&&req.url().endsWith(root+'/sales'))postSales++
  })
  await open(page,f)
  await page.getByLabel('Sede del punto de venta').selectOption(f.locationId)
  await page.getByRole('button',{name:/Producto stock E3 disponible/}).click()
  await expect(page.getByLabel('Disponibilidad de stock REAL')).toContainText('0 UNIDAD')
  await expect(page.getByRole('button',{name:'Agregar al carrito'})).toBeDisabled()
  const stock=await request.post(base+root+'/inventory/adjustments',{
    headers:{...headers,'Idempotency-Key':randomUUID()},
    data:{kind:'STOCK_INICIAL',catalog_item_id:itemId,location_id:f.locationId,
      quantity_milli:2000,expected_version:0,reason:'QA saldo disponible E3'},
  })
  expect(stock.status(),await stock.text()).toBe(201)
  await page.getByRole('button',{name:'Actualizar disponibilidad'}).click()
  await expect(page.getByLabel('Disponibilidad de stock REAL')).toContainText('2 UNIDAD')
  await page.getByLabel('Cantidad del artículo').fill('3')
  await expect(page.getByText('La cantidad supera el stock disponible', {exact:false})).toBeVisible()
  await expect(page.getByRole('button',{name:'Agregar al carrito'})).toBeDisabled()
  await page.getByLabel('Cantidad del artículo').fill('2')
  await expect(page.getByRole('button',{name:'Agregar al carrito'})).toBeEnabled()
  await page.getByRole('button',{name:'Agregar al carrito'}).click()
  await expect(page.getByRole('region',{name:'Carrito de venta'})).toContainText('Cantidad: 2 UNIDAD')
  expect(postSales).toBe(0)
})

test('E3-1G: descuento recotiza el pago final y botón completa saldo mixto exacto',async({page,request})=>{
  const f=await seed(request)
  let postSales=0
  page.on('request',req=>{
    if(req.method()==='POST'&&req.url().endsWith('/businesses/'+f.businessId+'/sales'))postSales++
  })
  await open(page,f)
  await page.getByLabel('Sede del punto de venta').selectOption(f.locationId)
  await page.getByRole('button',{name:/Servicio POS prueba/}).click()
  await page.getByRole('button',{name:'Agregar al carrito'}).click()
  await page.getByLabel('Descuento de la venta').fill('100')
  await expect(page.getByLabel('Cálculo del total a cobrar')).toContainText('1.400,00')
  await expect(page.getByLabel('Importe declarado 1')).toHaveValue('1400,00')
  await page.getByLabel('Importe declarado 1').fill('300,01')
  await page.getByRole('button',{name:'Agregar otro medio de pago'}).click()
  await page.getByLabel('Medio de pago 2').selectOption('TRANSFERENCIA')
  await page.getByRole('button',{name:'Completar saldo con último medio de pago'}).click()
  await expect(page.getByLabel('Importe declarado 2')).toHaveValue('1099,99')
  await expect(page.locator('.real-pos-payment-summary')).toContainText('Importe cubierto')
  await page.getByLabel('Descuento de la venta').fill('200')
  await expect(page.getByLabel('Cálculo del total a cobrar')).toContainText('1.300,00')
  await expect(page.locator('.real-pos-payment-summary')).toContainText('Excedente')
  await page.getByRole('button',{name:'Completar saldo con último medio de pago'}).click()
  await expect(page.getByLabel('Importe declarado 1')).toHaveValue('300,01')
  await expect(page.getByLabel('Importe declarado 2')).toHaveValue('999,99')
  await page.getByRole('button',{name:'Revisar venta y pagos'}).click()
  await expect(page.getByLabel('Revisión final de la venta')).toContainText('1.300,00')
  await expect(page.getByRole('button',{name:'Confirmar y registrar venta REAL'})).toBeDisabled()
  expect(postSales).toBe(0)
})
