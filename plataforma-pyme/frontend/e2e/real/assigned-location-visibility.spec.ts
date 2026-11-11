import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1') {
    throw new Error('T11-E requiere PostgreSQL QA efímero (PYME_DISPOSABLE_QA=1)')
  }
})

async function user(request: APIRequestContext, label: string) {
  const email = 't11-assign-' + randomUUID() + '@example.com'
  const password = 'T11 asignaciones QA aislado 2026!'
  const registration = await request.post(api + '/auth/register', {
    data: { email, password, display_name: label },
  })
  expect(registration.status(), await registration.text()).toBe(201)
  const login = await request.post(api + '/auth/login', { data: { email, password } })
  expect(login.status(), await login.text()).toBe(200)
  return { email, password, headers: { Authorization: 'Bearer ' + (await login.json()).access_token } }
}

async function post(request: APIRequestContext, path: string, token: { Authorization: string },
                    data: object, expected = 201) {
  const response = await request.post(api + path, {
    headers: { ...token, 'Idempotency-Key': randomUUID() }, data,
  })
  expect(response.status(), await response.text()).toBe(expected)
  return response.json()
}

async function signIn(page: Page, actor: { email: string, password: string }) {
  await page.getByLabel('Correo electrónico', { exact: true }).fill(actor.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(actor.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
}

test('T11-E: trabajador solo ve sus sedes SELL y STORE, revocación efectiva tras F5', async ({ request, page }) => {
  const owner = await user(request, 'Dueño T11-E')
  const worker = await user(request, 'Trabajador T11-E')
  const business = await post(request, '/businesses', owner.headers,
    { name: 'QA sedes exclusivas', category: 'QA', activity_kind: 'MIXTO' })
  const root = '/businesses/' + business.id
  const allowed = await post(request, root + '/locations', owner.headers,
    { name: 'Sede ASIGNADA T11', kind: 'LOCAL', can_sell: true, can_store: true,
      address: '', map_url: '' })
  const forbidden = await post(request, root + '/locations', owner.headers,
    { name: 'Sede NO ASIGNADA T11', kind: 'LOCAL', can_sell: true, can_store: true,
      address: '', map_url: '' })
  const invite = await post(request, root + '/invitations', owner.headers,
    { email: worker.email, role: 'TRABAJADOR' })
  const acceptance = await request.post(api + '/invitations/accept', {
    headers: worker.headers, data: { invitation_token: invite.invitation_token },
  })
  expect(acceptance.status(), await acceptance.text()).toBe(200)
  const membersResponse = await request.get(api + root + '/memberships', { headers: owner.headers })
  expect(membersResponse.status(), await membersResponse.text()).toBe(200)
  const members = await membersResponse.json()
  const member = members.find((x: { email: string }) => x.email === worker.email)
  expect(member?.id).toBeTruthy()
  const grant = await request.put(api + root + '/locations/' + allowed.id + '/assignments/' + member.id, {
    headers: owner.headers, data: { status: 'ACTIVA' },
  })
  expect(grant.status(), await grant.text()).toBe(200)

  const own = async () => {
    const response = await request.get(api + root + '/locations/my-assignments', { headers: worker.headers })
    expect(response.status(), await response.text()).toBe(200)
    return response.json() as Promise<string[]>
  }
  expect(await own()).toEqual([allowed.id])
  // Existing administration endpoint must not become readable to employees.
  const adminList = await request.get(api + root + '/locations/' + allowed.id + '/assignments', {
    headers: worker.headers,
  })
  expect(adminList.status()).toBe(403)

  let uiWrites = 0
  page.on('request', req => {
    if (req.method() !== 'GET' && req.url().includes('/api/v1/businesses/')) uiWrites++
  })
  await page.goto('/real/empresas/' + business.id + '/pos')
  await signIn(page, worker)
  await expect(page.getByRole('heading', { name: 'Punto de venta' })).toBeVisible()
  const pos = page.getByLabel('Sede del punto de venta')
  await expect(pos.locator('option[value="' + allowed.id + '"]')).toHaveCount(1)
  await expect(pos.locator('option[value="' + forbidden.id + '"]')).toHaveCount(0)
  await expect(pos).toContainText('Sede ASIGNADA T11')
  await expect(pos).not.toContainText('Sede NO ASIGNADA T11')

  await page.getByRole('button', { name: 'Empresa', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Empresa real' })).toBeVisible()
  await page.getByRole('button', { name: 'Inventario REAL' }).click()
  await expect(page.getByRole('heading', { name: 'Inventario' })).toBeVisible()
  await page.getByRole('button', { name: 'Transferir entre ubicaciones' }).click()
  await expect(page.getByRole('heading', { name: 'Trasladar stock entre ubicaciones' })).toBeVisible()
  const origin = page.getByLabel('Ubicación de origen')
  const destination = page.getByLabel('Ubicación de destino')
  for (const select of [origin, destination]) {
    await expect(select.locator('option[value="' + allowed.id + '"]')).toHaveCount(1)
    await expect(select.locator('option[value="' + forbidden.id + '"]')).toHaveCount(0)
  }
  await expect(page.getByRole('button', { name: 'Confirmar transferencia REAL' })).toBeDisabled()
  expect(uiWrites).toBe(0)

  // Revoking the only assignment must be reflected on a new session.
  const revoke = await request.put(api + root + '/locations/' + allowed.id + '/assignments/' + member.id, {
    headers: owner.headers, data: { status: 'REVOCADA' },
  })
  expect(revoke.status(), await revoke.text()).toBe(200)
  expect(await own()).toEqual([])
  await page.goto('/real/empresas/' + business.id + '/pos')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión real' })).toBeVisible()
  await signIn(page, worker)
  await expect(page.getByRole('heading', { name: 'Punto de venta' })).toBeVisible()
  await expect(page.getByLabel('Sede del punto de venta').locator('option')).toHaveCount(1)
  expect(uiWrites).toBe(0)
})
