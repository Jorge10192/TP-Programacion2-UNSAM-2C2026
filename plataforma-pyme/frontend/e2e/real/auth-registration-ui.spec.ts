import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1')
    throw new Error('T11-F auth UI solo en DB efímera')
})

test('E27-AUTH-01: registro por UI, login explícito y GET /me de PostgreSQL', async ({ page, request }) => {
  const email = 't11-register-' + randomUUID() + '@example.com'
  const password = 'Clave de registro E2E T11-F descartable 2026!'
  const name = 'QA Registro T11-F'
  let registrations = 0
  page.on('request', req => {
    if (req.method() === 'POST' && new URL(req.url()).pathname.endsWith('/api/v1/auth/register'))
      registrations++
  })

  await page.goto('/real/registro')
  await expect(page.getByRole('heading', { name: 'Crear cuenta real' })).toBeVisible()
  await page.getByLabel('Nombre visible').fill(name)
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña (mínimo 15 caracteres)').fill(password)
  await page.getByRole('button', { name: 'Registrarme' }).click()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión real' })).toBeVisible()
  await expect(page.getByText('Cuenta registrada. Iniciá sesión', { exact: false })).toBeVisible()
  expect(registrations).toBe(1)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible()
  await expect(page.getByText(name, { exact: true })).toBeVisible()
  await expect(page.getByText(email, { exact: true })).toBeVisible()

  // E3-1H3: abrir el formulario no acepta ninguna invitación ni emite escrituras.
  await page.getByRole('button', { name: 'Ingresar código de invitación' }).click()
  await expect(page.getByRole('heading', { name: 'Ingresar código de invitación' })).toBeVisible()
  await expect(page.getByLabel('Código de 43 caracteres')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aceptar invitación' })).toBeDisabled()
  await page.getByRole('button', { name: 'Mi perfil real' }).click()
  await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible()

  const login = await request.post(api + '/auth/login', { data: { email, password } })
  expect(login.status(), await login.text()).toBe(200)
  const token = (await login.json()).access_token
  const me = await request.get(api + '/auth/me', {
    headers: { Authorization: 'Bearer ' + token },
  })
  expect(me.status(), await me.text()).toBe(200)
  expect(await me.json()).toMatchObject({ email, display_name: name, status: 'ACTIVO' })
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión real' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión real' })).toBeVisible()
  expect(registrations).toBe(1)
})
