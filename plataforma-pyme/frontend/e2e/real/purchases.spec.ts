import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api = 'http://127.0.0.1:18001/api/v1'
test.use({ timezoneId: 'America/Argentina/Buenos_Aires' })
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1') throw new Error('Requires disposable QA environment')
})

async function seed(request: APIRequestContext) {
  const email = `purchases-${randomUUID()}@example.com`, password = 'Disposable QA password 2026!'
  const registration = await request.post(`${api}/auth/register`, {
    data: { email, password, display_name: 'Compras QA' },
  })
  expect(registration.status()).toBe(201)
  const login = await request.post(`${api}/auth/login`, { data: { email, password } })
  expect(login.status()).toBe(200)
  const session = await login.json()
  const headers = { Authorization: `Bearer ${session.access_token}` }
  const post = async (path: string, data: object) => {
    const response = await request.post(api + path, {
      headers: { ...headers, 'Idempotency-Key': randomUUID() }, data,
    })
    expect(response.status(), await response.text()).toBe(201)
    return response.json()
  }
  const business = await post('/businesses', { name: 'Compras QA', category: 'Pruebas', activity_kind: 'MIXTO' })
  const root = `/businesses/${business.id}`
  const location = await post(root + '/locations', {
    name: 'Deposito QA', kind: 'DEPOSITO', address: '', map_url: '', can_store: true, can_sell: false,
  })
  const item = await post(root + '/catalog', {
    name: 'Articulo QA', sku: 'COMPRAS-001', kind: 'REVENTA', unit: 'UNIDAD', sellable: true,
  })
  const purchase = (reference: string) => post(root + '/purchases', {
    purchased_on: '2026-11-10', reference, lines: [{
      catalog_item_id: item.id, description: item.name, unit: 'UNIDAD',
      quantity_milli: 1000, unit_cost_cents: 1000,
    }],
  })
  const a = await purchase('Compra A'), b = await purchase('Compra B')
  return { email, password, userId: session.user.id as string, business, location, a, b, headers, root }
}

type Fixture = Awaited<ReturnType<typeof seed>>
async function open(page: Page, fixture: Fixture) {
  await page.goto(`/real/empresas/${fixture.business.id}/compras`)
  await page.getByLabel('Correo electrónico', { exact: true }).fill(fixture.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(fixture.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Compras y recepción', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Registrar compra REAL', exact: true })).toBeEnabled()
}

test('Recuperar una recepción bloquea el cambio de compra y conserva la identidad correcta', async ({ page, request }) => {
  const f = await seed(request)
  await open(page, f)
  const scope = [f.userId, f.business.id, 'purchase.receive', f.a.id].join(':')
  await page.evaluate(async ({ scope, actorId, businessId, purchaseId, locationId, key }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open('asistente-pyme-real-purchases-v1', 1)
      opening.onsuccess = () => resolve(opening.result)
      opening.onerror = () => reject(opening.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('pending', 'readwrite')
      tx.objectStore('pending').put({ scope, actorId, businessId, purchaseId,
        kind: 'purchase.receive', key, body: { location_id: locationId }, createdAt: new Date().toISOString() })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
    // Delay only the saved receipt read, while using the real IndexedDB journal.
    const get = IDBObjectStore.prototype.get
    const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete')!
    IDBObjectStore.prototype.get = function (query) {
      if (this.transaction.db.name === 'asistente-pyme-real-purchases-v1' && query === scope) {
        const tx = this.transaction
        Object.defineProperty(tx, 'oncomplete', {
          set(callback: IDBTransaction['oncomplete']) {
            descriptor.set!.call(tx, (event: Event) => {
              const state = window as Window & { releaseReceiptLookup?: () => void }
              state.releaseReceiptLookup = () => callback?.call(tx, event)
            })
          },
        })
      }
      return get.call(this, query)
    }
  }, { scope, actorId: f.userId, businessId: f.business.id, purchaseId: f.a.id,
    locationId: f.location.id, key: randomUUID() })

  const card = (reference: string) => page.locator('article.real-supply-card').filter({ hasText: reference })
  const receiveA = card('Compra A').getByRole('button', { name: 'Pendiente', exact: false })
  const receiveB = card('Compra B').getByRole('button', { name: 'Pendiente', exact: false })
  await receiveA.click()
  await expect.poll(() => page.evaluate(() => typeof (window as Window & {
    releaseReceiptLookup?: () => void
  }).releaseReceiptLookup)).toBe('function')
  // La recepción ahora ocupa una vista exclusiva: el listado queda oculto.
  await expect(card('Compra B')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Recepción de compra' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^(Procesando|Confirmar recepción REAL)/ })).toBeDisabled()
  await page.evaluate(() => (window as Window & { releaseReceiptLookup?: () => void }).releaseReceiptLookup?.())
  await expect(page.getByRole('button', { name: 'Reintentar MISMA recepción', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Volver a compras' }).first().click()
  // La intención de A sigue guardada en IndexedDB, no se elimina al volver.
  await expect(card('Compra A')).toBeVisible()
  await receiveB.click()
  await expect(page.getByRole('heading', { name: 'Recepción completa de compra Compra B', exact: true })).toBeVisible()
  await page.getByLabel('Destino con almacenamiento activo').selectOption(f.location.id)
  const posts: string[] = []
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().includes('/receive')) posts.push(req.url())
  })
  page.on('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Confirmar recepción REAL', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Comprobante de recepción' })).toBeVisible()
  await expect(page.getByLabel('Detalle de recepción confirmada')).toBeVisible()
  await page.getByRole('button', { name: 'Volver a compras' }).first().click()
  await expect(card('Compra B').getByRole('button', { name: 'Consultar comprobante', exact: true })).toBeVisible()
  expect(posts).toEqual([`${api}${f.root}/purchases/${f.b.id}/receive`.replace(':18001', ':5173')])
  const original = await request.get(api + f.root + '/purchases/' + f.a.id, { headers: f.headers })
  expect(original.status()).toBe(200)
  expect((await original.json()).status).toBe('REGISTRADA')
})

test('La fecha sugerida de compra conserva el día local después de las 21 en Argentina', async ({ page, request }) => {
  const f = await seed(request)
  await page.clock.setFixedTime(new Date('2026-11-10T21:30:00-03:00'))
  await open(page, f)
  await page.getByRole('button', { name: 'Registrar compra REAL', exact: true }).click()
  await expect(page.getByLabel('Fecha de compra', { exact: true })).toHaveValue('2026-11-10')
})
