import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

// T11-B: browser POS + real FastAPI + one disposable PostgreSQL per CI job.
// No configurable target and no permission to use the user's persistent database.
const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1')
    throw new Error('T11-B solo puede ejecutarse con PostgreSQL QA descartable')
})

type Row = { catalog_item_id: string; location_id: string; quantity_milli: number; version: number }
type Movement = { catalog_item_id: string; event_type: string; delta_milli: number; purchase_line_id?: string | null; sale_id?: string | null }

test('T11-B: compra → recepción → inventario → POS mixto → comprobante y F5', async ({ page, request }) => {
  const email = 't11-flow-' + randomUUID() + '@example.com'
  const password = 'T11-B Disposable QA password 2026!'
  const register = await request.post(api + '/auth/register', {
    data: { email, password, display_name: 'T11 QA integral' },
  })
  expect(register.status(), await register.text()).toBe(201)
  const login = await request.post(api + '/auth/login', { data: { email, password } })
  expect(login.status(), await login.text()).toBe(200)
  const headers = { Authorization: 'Bearer ' + (await login.json()).access_token }
  async function post(path: string, data: object, key = randomUUID(), expected = 201) {
    const response = await request.post(api + path, {
      headers: { ...headers, 'Idempotency-Key': key }, data,
    })
    expect(response.status(), await response.text()).toBe(expected)
    return response.json()
  }
  async function get(path: string) {
    const response = await request.get(api + path, { headers })
    expect(response.status(), await response.text()).toBe(200)
    return response.json()
  }

  const company = await post('/businesses', {
    name: 'T11-B empresa integral aislada', category: 'QA', activity_kind: 'MIXTO',
  })
  const root = '/businesses/' + company.id
  const location = await post(root + '/locations', {
    name: 'Local integral T11-B', kind: 'LOCAL',
    can_sell: true, can_store: true, address: '', map_url: '',
  })
  const supplier = await post(root + '/suppliers', { name: 'Proveedor T11-B' })
  const good = await post(root + '/catalog', {
    name: 'Producto T11-B', kind: 'REVENTA', unit: 'UNIDAD', sku: 'T11B-01',
    sellable: true, price_cents: 150000,
  })
  const service = await post(root + '/catalog', {
    name: 'Servicio T11-B', kind: 'SERVICIO', unit: 'SERVICIO', sku: 'T11B-SERV',
    sellable: true, price_cents: 200000,
  })
  const purchaseBody = {
    purchased_on: '2026-11-11', supplier_id: supplier.id,
    reference: 'T11-B compra descartable', notes: 'Sin stock hasta la recepción',
    lines: [
      { catalog_item_id: good.id, description: 'Producto T11-B',
        unit: 'UNIDAD', quantity_milli: 10000, unit_cost_cents: 70000 },
      { catalog_item_id: null, description: 'Flete de compra',
        unit: 'CONCEPTO', quantity_milli: 1000, unit_cost_cents: 50000 },
    ],
  }
  const purchaseKey = randomUUID()
  const purchase = await post(root + '/purchases', purchaseBody, purchaseKey)
  expect(purchase.status).toBe('REGISTRADA')
  expect(purchase.lines).toHaveLength(2)
  expect(purchase.total_cents).toBe(750000)
  expect(await get(root + '/inventory/balances')).toEqual([])
  expect(await get(root + '/inventory/movements')).toEqual([])

  // An identical replay is a read of the original purchase, not another purchase.
  expect(await post(root + '/purchases', purchaseBody, purchaseKey, 200)).toEqual(purchase)
  expect(await get(root + '/purchases')).toHaveLength(1)

  const receiptKey = randomUUID()
  const receiptBody = { location_id: location.id }
  const receiptPath = root + '/purchases/' + purchase.id + '/receive'
  const receipt = await post(receiptPath, receiptBody, receiptKey)
  expect(receipt.purchase_id).toBe(purchase.id)
  expect(receipt.purchase_status).toBe('RECIBIDA')
  expect(receipt.movements).toHaveLength(1)
  expect(receipt.movements[0]).toMatchObject({
    catalog_item_id: good.id, delta_milli: 10000,
    event_type: 'COMPRA_RECEPCION', purchase_line_id: purchase.lines[0].id,
  })
  expect(receipt.balances_after).toEqual([
    { catalog_item_id: good.id, quantity_milli: 10000, version: 1 },
  ])
  expect(await post(receiptPath, receiptBody, receiptKey, 200)).toEqual(receipt)
  expect(await get(root + '/purchases/' + purchase.id + '/receipt')).toEqual(receipt)

  let balances: Row[] = await get(root + '/inventory/balances')
  expect(balances).toHaveLength(1)
  expect(balances[0]).toMatchObject({
    catalog_item_id: good.id, location_id: location.id,
    quantity_milli: 10000, version: 1,
  })

  let uiSalePosts = 0
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().endsWith('/api/v1' + root + '/sales'))
      uiSalePosts++
  })
  await page.goto('/real/empresas/' + company.id + '/pos')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Punto de venta' })).toBeVisible()
  await page.getByLabel('Sede del punto de venta').selectOption(location.id)

  await page.getByRole('button', { name:'Agregar una unidad de Producto T11-B al detalle de venta' }).click()
  await page.getByRole('region',{name:'Carrito de venta'})
    .locator('.real-pos-cart-row').filter({hasText:'Producto T11-B'})
    .getByRole('button',{name:'Editar cantidad'}).click()
  await expect(page.getByLabel('Precio unitario de la venta')).toHaveValue('1500,00')
  await page.getByLabel('Cantidad del artículo').fill('3')
  await expect(page.locator('.real-pos-line-preview')).toContainText('4.500,00')
  await page.getByRole('button', { name: 'Guardar cambios en detalle' }).click()
  await page.getByRole('button', { name:'Agregar una unidad de Servicio T11-B al detalle de venta' }).click()
  await page.getByRole('region',{name:'Carrito de venta'})
    .locator('.real-pos-cart-row').filter({hasText:'Servicio T11-B'})
    .getByRole('button',{name:'Editar cantidad'}).click()
  await expect(page.getByLabel('Precio unitario de la venta')).toHaveValue('2000,00')
  await page.getByRole('button', { name: 'Guardar cambios en detalle' }).click()
  await expect(page.getByRole('region', { name: 'Carrito de venta' })
    .locator('.real-pos-cart-row')).toHaveCount(2)
  await expect(page.locator('.real-pos-summary')).toContainText('6.500,00')
  await expect(page.getByLabel('Importe declarado 1')).toHaveValue('6500,00')

  await page.getByLabel('Importe declarado 1').fill('3000')
  await page.getByRole('button', { name: 'Agregar otro medio de pago' }).click()
  await page.getByLabel('Medio de pago 2').selectOption('TRANSFERENCIA')
  await page.getByLabel('Importe declarado 2').fill('3500')
  await page.getByLabel('Referencia de pago 2').fill('Transferencia QA T11-B')
  await page.getByRole('button', { name: 'Finalizar venta' }).click()
  const review = page.getByLabel('Revisión final de la venta')
  await expect(review).toContainText('Producto T11-B')
  await expect(review).toContainText('Servicio T11-B')
  await expect(review).toContainText('6.500,00')
  expect(uiSalePosts).toBe(0)
  await page.getByLabel('Acepto registrar esta venta REAL').check()
  await page.getByRole('button', { name: 'Confirmar y registrar venta REAL' }).click()
  await expect(page.getByText('Venta confirmada en PostgreSQL.', { exact: false })).toBeVisible()
  expect(uiSalePosts).toBe(1)

  const sales = await get(root + '/sales')
  expect(sales).toHaveLength(1)
  const sale = await get(root + '/sales/' + sales[0].id)
  expect(sale.total_cents).toBe(650000)
  expect(sale.subtotal_cents).toBe(650000)
  expect(sale.discount_cents).toBe(0)
  expect(sale.lines).toHaveLength(2)
  const soldGood = sale.lines.find((line: { catalog_item_id: string }) => line.catalog_item_id === good.id)
  const soldService = sale.lines.find((line: { catalog_item_id: string }) => line.catalog_item_id === service.id)
  expect(soldGood).toMatchObject({ quantity_milli: 3000, unit_price_cents: 150000 })
  expect(soldService).toMatchObject({ quantity_milli: 1000, unit_price_cents: 200000 })
  expect(sale.payments.map((row: { amount_cents: number }) => row.amount_cents)).toEqual([300000, 350000])
  expect(sale.payments[1].method).toBe('TRANSFERENCIA')
  expect(sale.payments[1].reference).toBe('Transferencia QA T11-B')
  expect(sale.balances_after).toHaveLength(1)
  expect(sale.balances_after[0]).toMatchObject({
    catalog_item_id: good.id, quantity_milli: 7000, version: 2,
  })

  balances = await get(root + '/inventory/balances')
  expect(balances).toHaveLength(1)
  expect(balances[0]).toMatchObject({ quantity_milli: 7000, version: 2 })
  const movements: Movement[] = await get(root + '/inventory/movements')
  expect(movements).toHaveLength(2)
  expect(movements.filter(row => row.catalog_item_id === good.id)
    .map(row => row.delta_milli).sort((a, b) => a - b)).toEqual([-3000, 10000])
  expect(movements.filter(row => row.catalog_item_id === service.id)).toHaveLength(0)
  expect(movements.filter(row => row.event_type === 'COMPRA_RECEPCION')).toHaveLength(1)
  const output = movements.filter(row => row.event_type === 'VENTA_SALIDA')
  expect(output).toHaveLength(1)
  expect(output[0]).toMatchObject({ sale_id: sale.id, delta_milli: -3000 })

  // F5 must not repeat the POST; PostgreSQL stays authoritative.
  await page.reload()
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Punto de venta' })).toBeVisible()
  expect(uiSalePosts).toBe(1)
  expect(await get(root + '/sales')).toHaveLength(1)
  expect(await get(root + '/inventory/movements')).toEqual(movements)
  expect(await get(root + '/inventory/balances')).toEqual(balances)
})
