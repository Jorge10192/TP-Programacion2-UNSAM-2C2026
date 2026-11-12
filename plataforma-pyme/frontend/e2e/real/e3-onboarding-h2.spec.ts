import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api = 'http://127.0.0.1:18001/api/v1'
test.beforeAll(() => {
  if (process.env.PYME_DISPOSABLE_QA !== '1') {
    throw new Error('E3-1H2 solo se ejecuta contra PostgreSQL y API descartables')
  }
})

test('E3-1H2: crear empresa abre Inicio, menú contraíble en escritorio y drawer móvil', async ({ page, request }) => {
  const email = 'e3-h2-' + randomUUID() + '@example.com'
  const password = 'Clave E3 H2 QA descartable 2026!'
  const registered = await request.post(api + '/auth/register', {
    data: { email, password, display_name: 'QA onboarding H2' },
  })
  expect(registered.status(), await registered.text()).toBe(201)

  let commercialWrites = 0
  page.on('request', (req) => {
    if (/\/api\/v1\/businesses\/[^/]+\/(?:inventory|sales|purchases)/.test(req.url())
      && req.method() !== 'GET') commercialWrites++
  })
  await page.goto('/real/empresas/nueva')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Nueva empresa real' })).toBeVisible()
  await expect(page.getByText('Al confirmar, vas a llegar a Inicio.', { exact: false })).toBeVisible()
  await page.getByLabel('Nombre comercial').fill('Empresa E3 H2 ' + randomUUID().slice(0, 6))
  await page.getByLabel('Rubro').fill('Comercio QA')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Crear empresa', exact: true }).click()

  await expect(page).toHaveURL(/\/real\/empresas\/[0-9a-f-]{36}\/inicio$/)
  await expect(page.getByRole('heading', { name: 'Inicio', exact: true })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Configuración inicial observada' }))
    .toHaveAttribute('aria-valuenow', '0')
  const menu = page.locator('#real-workspace-nav')
  const frame = page.locator('.real-auth-layout')

  await page.getByRole('button', { name: 'Contraer menú lateral' }).click()
  await expect(frame).toHaveClass(/rw-collapsed/)
  await expect(menu).toHaveCSS('width', '76px')
  await expect(menu.getByRole('button', { name: 'Catálogo', exact: true })).toBeVisible()
  await menu.getByRole('button', { name: 'Catálogo', exact: true }).click()
  await expect(page).toHaveURL(/\/catalogo$/)
  await expect(frame).toHaveClass(/rw-collapsed/)

  await page.getByRole('button', { name: 'Expandir menú lateral' }).click()
  await expect(frame).not.toHaveClass(/rw-collapsed/)
  await expect(menu).toHaveCSS('width', '254px')

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('button', { name: 'Contraer menú lateral' })).toBeHidden()
  await page.getByRole('button', { name: 'Abrir menú' }).click()
  await expect(menu).toHaveClass(/rw-sidebar-open/)
  await expect(menu.locator('.rw-nav-text').filter({ hasText: /^Inicio$/ })).toBeVisible()
  await menu.getByRole('button', { name: 'Inicio', exact: true }).click()
  await expect(page).toHaveURL(/\/inicio$/)
  await expect(menu).not.toHaveClass(/rw-sidebar-open/)
  const width = await page.evaluate(() =>
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))
  expect(width, 'La navegación H2 no debe generar scroll horizontal móvil').toBeLessThanOrEqual(391)
  expect(commercialWrites).toBe(0)
})
