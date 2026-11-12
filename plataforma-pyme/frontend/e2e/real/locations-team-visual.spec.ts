import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

// E3-1C3: el navegador y las escrituras REAL solo usan una DB descartable.
const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1')
    throw new Error('E3-1C3 exige PostgreSQL efímero y PYME_DISPOSABLE_QA=1')
})

async function actor(request: APIRequestContext, display_name: string) {
  const email = 'e3-c3-' + randomUUID() + '@example.com'
  const password = 'Clave E3 1C3 descartable 2026!'
  const registration = await request.post(api + '/auth/register', { data: { email, password, display_name } })
  expect(registration.status(), await registration.text()).toBe(201)
  const session = await request.post(api + '/auth/login', { data: { email, password } })
  expect(session.status(), await session.text()).toBe(200)
  const headers = { Authorization: 'Bearer ' + (await session.json()).access_token }
  return { email, password, headers }
}

async function create(request: APIRequestContext, path: string, headers: {Authorization: string}, data: object) {
  const response = await request.post(api + path, { data, headers: { ...headers, 'Idempotency-Key': randomUUID() } })
  expect(response.status(), await response.text()).toBe(201)
  return response.json()
}

async function signIn(page: Page, user: { email: string, password: string }) {
  await page.getByLabel('Correo electrónico', { exact:true }).fill(user.email)
  await page.getByLabel('Contraseña', { exact:true }).fill(user.password)
  await page.getByRole('button', { name:'Ingresar', exact:true }).click()
}

test('E3-1C3: sedes y equipo, filtros, permisos y responsive REAL', async ({ request, page }) => {
  const owner = await actor(request, 'Titular QA E3')
  const worker = await actor(request, 'Trabajador QA E3')
  const company = await create(request, '/businesses', owner.headers,
    { name:'Empresa QA C3', category:'Servicios', activity_kind:'MIXTO' })
  const root = '/businesses/' + company.id
  await create(request, root + '/locations', owner.headers, {
    name:'Sucursal Centro C3', kind:'LOCAL', address:'Calle Central 123',
    map_url:'', can_sell:true, can_store:true,
  })
  const paused = await create(request, root + '/locations', owner.headers, {
    name:'Depósito Norte C3', kind:'DEPOSITO', address:'Zona Norte',
    map_url:'', can_sell:false, can_store:true,
  })
  const pause = await request.patch(api + root + '/locations/' + paused.id + '/status', {
    headers:owner.headers, data:{status:'PAUSADA'},
  })
  expect(pause.status(), await pause.text()).toBe(200)
  const issued = await create(request, root + '/invitations', owner.headers, {
    email:worker.email, role:'TRABAJADOR',
  })
  const accepted = await request.post(api + '/invitations/accept', {
    headers:worker.headers, data:{invitation_token:issued.invitation_token},
  })
  expect(accepted.status(), await accepted.text()).toBe(200)

  await page.setViewportSize({width:390,height:844})
  await page.goto('/real/empresas/' + company.id + '/ubicaciones')
  await signIn(page, owner)
  await expect(page.getByRole('heading', {name:'Ubicaciones',exact:true})).toBeVisible()
  await expect(page.getByLabel('Resumen de ubicaciones')).toContainText('2')
  const cards = page.locator('article.e3-ops-location-card')
  await expect(cards).toHaveCount(2)
  await page.getByLabel('Buscar ubicaciones').fill('Sucursal Centro')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText('Ventas habilitadas')
  await page.getByLabel('Buscar ubicaciones').clear()
  await page.getByLabel('Filtrar ubicaciones por estado').selectOption('PAUSADA')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText('Depósito Norte C3')
  await page.getByLabel('Filtrar ubicaciones por estado').selectOption('TODAS')

  // Cancelar no escribe ni altera la sede; el CRUD real ya se valida en T11-F.
  await page.getByRole('button', {name:'Crear ubicación real'}).click()
  await page.getByLabel('Nombre', {exact:true}).fill('Borrador C3')
  await page.getByRole('button', {name:'Cancelar',exact:true}).click()
  await expect(page.getByLabel('Formulario de ubicación')).toHaveCount(0)
  const locationsAfterCancel = await request.get(api + root + '/locations', {headers:owner.headers})
  expect(locationsAfterCancel.status()).toBe(200)
  expect(await locationsAfterCancel.json()).toHaveLength(2)

  await page.getByRole('button', {name:'Equipo',exact:true}).click()
  await expect(page.getByRole('heading', {name:'Equipo e invitaciones',exact:true})).toBeVisible()
  await expect(page.getByLabel('Resumen de equipo')).toContainText('2')
  await expect(page.locator('article.e3-ops-member')).toHaveCount(2)
  await page.getByLabel('Buscar integrantes').fill('Trabajador QA E3')
  await expect(page.locator('article.e3-ops-member')).toHaveCount(1)
  await expect(page.locator('article.e3-ops-member')).toContainText('TRABAJADOR')
  await page.getByLabel('Buscar integrantes').clear()
  await expect(page.getByRole('button', {name:'Emitir invitación REAL'})).toBeVisible()
  const width = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth))
  expect(width, 'Sin desplazamiento horizontal a 390 px').toBeLessThanOrEqual(391)

  await page.reload()
  await signIn(page, worker)
  await expect(page.getByRole('heading', {name:'Equipo e invitaciones',exact:true})).toBeVisible()
  await expect(page.getByText('El directorio de equipo es privado')).toBeVisible()
  await expect(page.getByLabel('Resumen de equipo')).toHaveCount(0)
  await expect(page.getByRole('button', {name:'Emitir invitación REAL'})).toHaveCount(0)
  await expect(page.locator('article.e3-ops-member')).toHaveCount(0)
})
