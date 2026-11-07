import { expect, test } from '@playwright/test'

test('navegación personal, tenants, placeholder y URL de empresa ajena', async ({ page }) => {
  await page.goto('/inicio')
  await expect(page.getByRole('heading', { name: 'Empezá tu jornada', level: 1, exact: true })).toBeVisible()

  await page.goto('/b/walos-demo/inicio')
  await expect(page.getByRole('heading', { name: 'Tu jornada en WALOS', level: 1, exact: true })).toBeVisible()

  await page.goto('/b/comercio-demo/inicio')
  await expect(page.getByRole('heading', { name: 'Tu jornada en Comercio Ejemplo', level: 1, exact: true })).toBeVisible()

  await page.goto('/b/walos-demo/analisis')
  await expect(page.getByRole('heading', { name: 'Estamos preparando esta sección' })).toBeVisible()

  await page.goto('/b/no-existe/ventas')
  await expect(page.getByRole('heading', { name: 'Empresa no disponible' })).toBeVisible()
})

test('menú único: compacto persiste, móvil abre completo y ampliar libera el fondo', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/b/walos-demo/inicio')
  const sidebar = page.locator('#app-sidebar')
  await expect(page.locator('.sidebar-actions button:visible')).toHaveCount(1)
  await page.getByRole('button', { name: 'Reducir menú', exact: true }).click()
  await expect(sidebar).toHaveCSS('width', '72px')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Mostrar nombres', exact: true })).toBeVisible()

  await page.setViewportSize({ width: 375, height: 812 })
  const trigger = page.getByRole('button', { name: 'Abrir menú principal' })
  await expect(page.locator('.sidebar-actions button:visible')).toHaveCount(1)
  await expect(trigger).toHaveCSS('border-radius', '12px')
  await trigger.click()
  const drawer = page.getByRole('dialog', { name: 'Menú principal' })
  await expect(drawer).toBeVisible()
  expect((await drawer.boundingBox())!.width).toBeGreaterThanOrEqual(280)
  await expect(drawer.getByRole('link', { name: 'Ventas', exact: true })).toBeVisible()
  const firstLink = drawer.getByRole('link', { name: 'Ir al inicio personal', exact: true })
  const lastControl = drawer.locator('summary').last()
  await firstLink.focus()
  await page.keyboard.press('Shift+Tab')
  await expect(lastControl).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(firstLink).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Menú principal' })).toHaveCount(0)
  await expect(trigger).toBeFocused()

  await trigger.click()
  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(page.getByRole('dialog', { name: 'Menú principal' })).toHaveCount(0)
  await expect(page.locator('.main-column')).not.toHaveAttribute('inert', '')
  await expect(page.getByRole('button', { name: 'Mostrar nombres', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Mostrar nombres', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Reducir menú', exact: true })).toBeVisible()

  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/b/walos-demo/catalogo', '/b/walos-demo/ventas', '/b/walos-demo/inventario']) {
      await page.goto(path)
      await expect(page.locator('#main-content')).toBeVisible()
      const overflow = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }))
      expect(overflow.documentWidth, 'Desborde horizontal en ' + path + ' a ' + width).toBeLessThanOrEqual(overflow.viewportWidth + 2)
    }
  }
})

test('DEMO: conserva el borrador al cancelar cierre, navegación y recarga; descarta al aceptar', async ({ page }) => {
  await page.goto('/b/walos-demo/compras')
  await page.getByRole('button', { name: 'Registrar compra', exact: true }).click()
  const editor = page.locator('.purchase-editor')
  const reference = page.getByLabel('Número de comprobante o referencia (opcional)', { exact: true })
  const draftReference = 'BORRADOR-E2E-SIN-GUARDAR'
  await reference.fill(draftReference)
  const originalUrl = page.url()
  const discardMessage = 'Tenés cambios sin guardar. ¿Querés descartarlos?\n\nAceptar: descartar los cambios y salir.\nCancelar: seguir editando sin perder los datos.'

  async function answerDiscard(action: () => Promise<unknown>, decision: 'dismiss' | 'accept') {
    const dialogEvent = page.waitForEvent('dialog')
    const attempt = action()
    const dialog = await dialogEvent
    expect(dialog.type()).toBe('confirm')
    expect(dialog.message()).toBe(discardMessage)
    if (decision === 'accept') await dialog.accept()
    else await dialog.dismiss()
    await attempt
  }

  async function expectDraftPreserved() {
    await expect(page).toHaveURL(originalUrl)
    await expect(editor).toBeVisible()
    await expect(reference).toHaveValue(draftReference)
  }

  await answerDiscard(() => page.getByRole('button', { name: 'Cerrar formulario', exact: true }).click(), 'dismiss')
  await expectDraftPreserved()

  const journey = page.getByRole('navigation', { name: 'Recorrido de la jornada', exact: true })
  await answerDiscard(() => journey.getByRole('link', { name: 'Stock', exact: true }).click(), 'dismiss')
  await expectDraftPreserved()

  const unloadEvent = page.waitForEvent('dialog')
  const reloadAttempt = page.evaluate(() => window.location.reload())
  const unloadDialog = await unloadEvent
  expect(unloadDialog.type()).toBe('beforeunload')
  // Ambos proyectos usan Chromium: el aviso nativo no expone el mensaje personalizado.
  expect(unloadDialog.message()).toBe('')
  await unloadDialog.dismiss()
  await reloadAttempt
  await expectDraftPreserved()

  await answerDiscard(() => page.getByRole('button', { name: 'Cerrar formulario', exact: true }).click(), 'accept')
  await expect(page).toHaveURL(originalUrl)
  await expect(editor).toHaveCount(0)
  await expect(reference).toHaveCount(0)

  // Reabrir comprueba que el descarte fue efectivo, sin registrar ninguna compra.
  await page.getByRole('button', { name: 'Registrar compra', exact: true }).click()
  await expect(reference).toHaveValue('')
  await page.getByRole('button', { name: 'Cerrar formulario', exact: true }).click()
  await expect(editor).toHaveCount(0)
})

test('servicio por empresa y QR DEMO: pendiente, persistencia, cancelación y aprobación única', async ({ page }) => {
  const service = 'Servicio E2E de prueba'
  await page.goto('/b/walos-demo/catalogo')
  await page.getByRole('button', { name: 'Agregar artículo o servicio' }).click()
  await page.getByLabel('Nombre del artículo o servicio *').fill(service)
  await page.getByLabel('Tipo *').selectOption('SERVICIO')
  await page.getByLabel('Precio de lista (ARS, opcional)').fill('1500,00')
  await page.getByRole('button', { name: 'Agregar a catálogo', exact: true }).click()
  await expect(page.getByText(service, { exact: true })).toBeVisible()

  await page.goto('/b/comercio-demo/catalogo')
  await expect(page.getByText(service, { exact: true })).toHaveCount(0)

  async function createQr() {
    await page.goto('/b/walos-demo/ventas')
    await page.getByRole('button', { name: 'Nueva venta' }).click()
    await page.getByLabel('Artículo o servicio 1').selectOption({ label: service + ' · Servicio' })
    await page.locator('.sales-payment-row').first().locator('select').first().selectOption('MERCADO_PAGO_DECLARADO')
    await page.getByLabel('Importe aplicado ARS').fill('1500')
    await page.getByRole('button', { name: 'Generar QR DEMO' }).click()
    await expect(page.getByRole('region', { name: 'Intención de cobro QR de demostración' })).toContainText('Pendiente (sin cobro)')
  }

  await createQr()
  await expect(page.getByRole('heading', { name: 'Comprobante de venta', level: 2, exact: true })).toHaveCount(0)

  // El estado sobrevive F5. En otra empresa el QR no debe aparecer.
  await page.reload()
  await page.getByRole('button', { name: 'Ver QR DEMO' }).click()
  await expect(page.getByRole('region', { name: 'Intención de cobro QR de demostración' })).toContainText('Pendiente (sin cobro)')
  await page.goto('/b/comercio-demo/ventas')
  await expect(page.getByRole('heading', { name: 'Intenciones QR DEMO' })).toHaveCount(0)

  await page.goto('/b/walos-demo/ventas')
  await page.getByRole('button', { name: 'Ver QR DEMO' }).click()
  await page.getByRole('button', { name: 'Cancelar intención' }).click()
  await expect(page.getByRole('region', { name: 'Intención de cobro QR de demostración' })).toContainText('Cancelado')
  await expect(page.locator('.sales-list-row')).toHaveCount(0)

  await createQr()
  await page.getByRole('button', { name: 'Simular aprobación (sin cobro real)' }).click()
  await expect(page.getByRole('heading', { name: 'Comprobante de venta', level: 2, exact: true })).toBeVisible()
  await expect(page.locator('.sales-list-row')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.sales-list-row')).toHaveCount(1)
  await expect(page.locator('.qr-demo-entry')).toHaveCount(2)
})
