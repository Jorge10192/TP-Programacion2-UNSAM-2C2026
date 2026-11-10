import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

/**
 * T09-E — pérdida real de la RESPUESTA después de que FastAPI confirmó el POST.
 * El POST se dispara desde el contexto del navegador únicamente como harness QA:
 * T09 no implementa POS; T10 implementará su propio journal de intentos durables.
 * No se permite usar una base local ni un API configurable fuera del CI descartable.
 */
const api = 'http://127.0.0.1:18001/api/v1'

test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1') {
    throw new Error('T09-E requiere PostgreSQL efímero y PYME_DISPOSABLE_QA=1')
  }
})

type SaleCommand = {
  location_id?: string
  lines: { catalog_item_id: string; quantity_milli: number; unit_price_cents: number }[]
  payments: { method: string; amount_cents: number }[]
}
type Fixture = {
  businessId: string; email: string; password: string; token: string
  key: string; salePath: string; body: SaleCommand; itemId: string
  locationId: string | null; physical: boolean
}

async function seed(request: APIRequestContext, physical: boolean): Promise<Fixture> {
  const email = `t09-e-${randomUUID()}@example.com`
  const password = 'QA descartable T09-E 2026'
  const registered = await request.post(api + '/auth/register', {
    data: { email, password, display_name: 'T09-E Recovery QA' },
  })
  expect(registered.status(), await registered.text()).toBe(201)
  const logged = await request.post(api + '/auth/login', { data: { email, password } })
  expect(logged.status(), await logged.text()).toBe(200)
  const token = (await logged.json()).access_token as string
  const headers = { Authorization: 'Bearer ' + token }
  const post = async (suffix: string, body: object) => {
    const response = await request.post(api + suffix, {
      headers: { ...headers, 'Idempotency-Key': randomUUID() }, data: body,
    })
    expect(response.status(), await response.text()).toBe(201)
    return response.json()
  }
  const business = await post('/businesses', {
    name: 'T09-E recuperación aislada', category: 'Pruebas', activity_kind: 'MIXTO',
  })
  const root = '/businesses/' + business.id
  let locationId: string | null = null
  if (physical) {
    const location = await post(root + '/locations', {
      name: 'Local descartable ventas', kind: 'LOCAL', address: '', map_url: '',
      can_sell: true, can_store: true,
    })
    locationId = location.id
  }
  const item = await post(root + '/catalog', {
    name: physical ? 'Producto físico T09-E' : 'Servicio T09-E',
    kind: physical ? 'REVENTA' : 'SERVICIO',
    unit: physical ? 'UNIDAD' : 'SERVICIO', sellable: true,
  })
  if (physical) {
    await post(root + '/inventory/adjustments', {
      catalog_item_id: item.id, location_id: locationId, kind: 'STOCK_INICIAL',
      quantity_milli: 5000, expected_version: 0,
      reason: 'Inicialización en empresa CI efímera T09-E',
    })
  }
  const body: SaleCommand = {
    ...(locationId ? { location_id: locationId } : {}),
    lines: [{ catalog_item_id: item.id, quantity_milli: 1000, unit_price_cents: 1375 }],
    payments: [{ method: 'EFECTIVO', amount_cents: 1375 }],
  }
  return {
    businessId: business.id, email, password, token, key: randomUUID(),
    salePath: root + '/sales', body, itemId: item.id, locationId, physical,
  }
}

async function open(page: Page, f: Fixture) {
  await page.goto('/real/empresas/' + f.businessId + '/ventas')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(f.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(f.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Historial de ventas' })).toBeVisible()
}

/** Browser-originated POST; the supplied token lives only in the test page memory. */
async function browserPost(page: Page, f: Fixture) {
  return page.evaluate(async ({ path, token, key, body }) => {
    try {
      const response = await fetch('/api/v1' + path, {
        method: 'POST', mode: 'same-origin', credentials: 'omit',
        headers: {
          Authorization: 'Bearer ' + token,
          'Idempotency-Key': key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      return { status: response.status, json: await response.json() }
    } catch {
      return { networkError: true }
    }
  }, { path: f.salePath, token: f.token, key: f.key, body: f.body })
}

async function apiGet(request: APIRequestContext, f: Fixture, suffix: string) {
  const response = await request.get(api + '/businesses/' + f.businessId + suffix, {
    headers: { Authorization: 'Bearer ' + f.token },
  })
  expect(response.status(), await response.text()).toBe(200)
  return response.json()
}

for (const physical of [true, false]) {
  test(`T09-E ${physical ? 'venta física y ledger' : 'venta de servicio'}: respuesta 201 perdida, F5, GET y replay 200 sin duplicados`,
    async ({ page, request }) => {
      const f = await seed(request, physical)
      await open(page, f)
      await expect(page.locator('.real-sales-row')).toHaveCount(0)
      const captured: { key: string | undefined; body: string | null }[] = []
      const statuses: number[] = []
      const saleURL = '**/api/v1' + f.salePath
      await page.route(saleURL, async route => {
        if (route.request().method() !== 'POST') return route.continue()
        captured.push({
          key: route.request().headers()['idempotency-key'],
          body: route.request().postData(),
        })
        const response = await route.fetch()
        statuses.push(response.status())
        if (captured.length === 1) {
          // Server already committed the sale; browser never receives the 201.
          expect(response.status()).toBe(201)
          return route.abort('failed')
        }
        await route.fulfill({ response })
      })

      const uncertain = await browserPost(page, f)
      expect(uncertain).toEqual({ networkError: true })
      expect(statuses).toEqual([201])
      expect(captured).toHaveLength(1)
      expect(captured[0].key).toBe(f.key)

      const before = await apiGet(request, f, '/sales?offset=0&limit=10')
      expect(before).toHaveLength(1)
      expect(before[0].request_id).toBe(f.key)
      const saleId: string = before[0].id
      const confirmed = await apiGet(request, f, '/sales/by-request/' + f.key)
      expect(confirmed.id).toBe(saleId)
      expect(confirmed.payments).toHaveLength(1)
      expect(confirmed.lines).toHaveLength(1)
      expect(confirmed.total_cents).toBe(1375)
      expect(confirmed.location_id).toBe(f.locationId)

      const initialBalances = physical ? await apiGet(request, f, '/inventory/balances') : null
      const initialMovements = physical ? await apiGet(request, f, '/inventory/movements') : null
      if (physical) {
        expect(initialBalances.find((b: { catalog_item_id: string }) => b.catalog_item_id === f.itemId))
          .toMatchObject({ quantity_milli: 4000, version: 2 })
        const saleMoves = initialMovements.filter((m: { sale_id: string }) => m.sale_id === saleId)
        expect(saleMoves).toHaveLength(1)
        expect(saleMoves[0]).toMatchObject({
          event_type: 'VENTA_SALIDA', delta_milli: -1000,
        })
      } else {
        expect(confirmed.balances_after).toEqual([])
      }

      // Neither F5 nor login automatically repeats the POST.
      await page.reload()
      await page.getByLabel('Correo electrónico', { exact: true }).fill(f.email)
      await page.getByLabel('Contraseña', { exact: true }).fill(f.password)
      await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
      await expect(page.locator('.real-sales-row')).toHaveCount(1)
      expect(captured).toHaveLength(1)
      await page.getByLabel('Clave original de solicitud (UUID4)').fill(f.key)
      await page.getByRole('button', { name: 'Consultar solicitud' }).click()
      const receipt = page.getByRole('region', { name: 'Comprobante de venta REAL' })
      await expect(receipt).toContainText(saleId)
      await expect(receipt).toContainText(f.key)
      await expect(receipt).toContainText('Pagos declarados (sin acreditación externa)')
      expect(captured).toHaveLength(1)

      // Explicit retry with the ORIGINAL key/body, not a new sale.
      const replay = await browserPost(page, f)
      expect(replay).toMatchObject({ status: 200, json: { id: saleId, request_id: f.key } })
      expect(statuses).toEqual([201, 200])
      expect(captured).toHaveLength(2)
      expect(captured[1]).toEqual(captured[0])
      expect(await apiGet(request, f, '/sales?offset=0&limit=10')).toEqual(before)
      expect(await apiGet(request, f, '/sales/by-request/' + f.key)).toEqual(confirmed)
      if (physical) {
        expect(await apiGet(request, f, '/inventory/balances')).toEqual(initialBalances)
        expect(await apiGet(request, f, '/inventory/movements')).toEqual(initialMovements)
      }

      // Same key, different body: 409, not a second sale/payment/ledger.
      const changed: SaleCommand = {
        ...f.body,
        lines: f.body.lines.map(line => ({ ...line, unit_price_cents: 1376 })),
        payments: [{ method: 'EFECTIVO', amount_cents: 1376 }],
      }
      const conflict = await request.post(api + f.salePath, {
        headers: {
          Authorization: 'Bearer ' + f.token, 'Idempotency-Key': f.key,
        },
        data: changed,
      })
      expect(conflict.status(), await conflict.text()).toBe(409)
      expect(await apiGet(request, f, '/sales?offset=0&limit=10')).toEqual(before)
      if (physical) {
        expect(await apiGet(request, f, '/inventory/balances')).toEqual(initialBalances)
        expect(await apiGet(request, f, '/inventory/movements')).toEqual(initialMovements)
      }
    })
}

test('T09-E solicitud abortada ANTES de llegar al servidor: GET 404 no equivale a venta confirmada',
  async ({ page, request }) => {
    const f = await seed(request, false)
    await open(page, f)
    const saleURL = '**/api/v1' + f.salePath
    let attempted = 0
    await page.route(saleURL, route => {
      if (route.request().method() !== 'POST') return route.continue()
      attempted++
      return route.abort('failed') // No route.fetch(): server never sees this request.
    })
    expect(await browserPost(page, f)).toEqual({ networkError: true })
    expect(attempted).toBe(1)
    expect(await apiGet(request, f, '/sales?offset=0&limit=10')).toEqual([])
    const missing = await request.get(api + f.salePath + '/by-request/' + f.key, {
      headers: { Authorization: 'Bearer ' + f.token },
    })
    expect(missing.status()).toBe(404)

    await page.reload()
    await page.getByLabel('Correo electrónico', { exact: true }).fill(f.email)
    await page.getByLabel('Contraseña', { exact: true }).fill(f.password)
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
    await expect(page.locator('.real-sales-row')).toHaveCount(0)
    await page.getByLabel('Clave original de solicitud (UUID4)').fill(f.key)
    await page.getByRole('button', { name: 'Consultar solicitud' }).click()
    await expect(page.getByRole('alert')).toContainText('No existe una venta accesible')
    await expect(page.getByText('Un 404 no prueba que el POST')).toBeVisible()
    expect(attempted).toBe(1) // No automatic retry.
    // An explicit retry with original body/key is safe. API-only: no POS on T09.
    const create = await request.post(api + f.salePath, {
      headers: { Authorization: 'Bearer ' + f.token, 'Idempotency-Key': f.key },
      data: f.body,
    })
    expect(create.status(), await create.text()).toBe(201)
    await page.getByLabel('Clave original de solicitud (UUID4)').fill(f.key)
    await page.getByRole('button', { name: 'Consultar solicitud' }).click()
    await expect(page.getByRole('region', { name: 'Comprobante de venta REAL' }))
      .toContainText((await create.json()).id)
    expect(await apiGet(request, f, '/sales?offset=0&limit=10')).toHaveLength(1)
    expect(attempted).toBe(1)
  })
