import test from 'node:test'
import assert from 'node:assert/strict'
import {
  REAL_WORKSPACE_ITEMS, realWorkspaceHref, realWorkspaceBusinessId, realWorkspaceTitle,
} from '../src/features/auth/realWorkspaceNavigation.ts'

const a = 'e5a347a3-d8e9-4a1a-9f51-72b1b2539c67'
const b = '713fa8a7-5c21-4c3b-9b39-ade992cf8df2'

test('navegación REAL sólo expone endpoints existentes y ningún módulo DEMO/diferido', () => {
  assert.deepEqual(REAL_WORKSPACE_ITEMS.map(x => x.section), [
    '', 'ubicaciones', 'equipo', 'catalogo', 'proveedores',
    'compras', 'inventario', 'pos', 'ventas',
  ])
  for (const item of REAL_WORKSPACE_ITEMS) {
    assert.match(realWorkspaceHref(a, item.section), /^\/real\/empresas\//)
    assert.equal(realWorkspaceBusinessId(realWorkspaceHref(a, item.section)), a)
  }
  assert.equal(REAL_WORKSPACE_ITEMS.some(x => /caja|cuentas|qr|gu[ií]as|gastos|reportes/i.test(x.label)), false)
})

test('tenant switch debe resolver contexto nuevo y rechazar rutas arbitrarias', () => {
  assert.notEqual(realWorkspaceHref(a, 'catalogo'), realWorkspaceHref(b, 'catalogo'))
  assert.equal(realWorkspaceBusinessId(realWorkspaceHref(b, 'ventas')), b)
  assert.equal(realWorkspaceBusinessId('/real/empresas/' + a + '/cuentas'), null)
  assert.equal(realWorkspaceBusinessId('/b/' + a + '/catalogo'), null)
  assert.equal(realWorkspaceBusinessId('/real/empresas/' + a + '/ventas/otra'), null)
  assert.equal(realWorkspaceBusinessId('/real/empresas/empresa-demo/catalogo'), null)
  assert.throws(() => realWorkspaceHref('empresa-demo', 'ventas'), TypeError)
  assert.throws(() => realWorkspaceHref(a, 'gastos'), TypeError)
})

test('títulos de rutas de identidad y comercio se muestran sin datos WALOS', () => {
  assert.equal(realWorkspaceTitle('/real/perfil'), 'Mi perfil')
  assert.equal(realWorkspaceTitle('/real/empresas'), 'Mis empresas')
  assert.equal(realWorkspaceTitle('/real/empresas/nueva'), 'Crear empresa')
  assert.equal(realWorkspaceTitle('/real/invitaciones/aceptar'), 'Aceptar invitación')
  assert.equal(realWorkspaceTitle(realWorkspaceHref(a, 'compras')), 'Compras y recepciones')
  assert.equal(realWorkspaceTitle(realWorkspaceHref(a, 'pos')), 'Punto de venta')
})
