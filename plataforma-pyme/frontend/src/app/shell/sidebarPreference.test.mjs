import test from 'node:test'
import assert from 'node:assert/strict'
import { loadSidebarMode, saveSidebarMode } from './sidebarPreference.ts'

const key = 'asistente-pyme.sidebar-mode.v3'
const legacyKey = 'asistente-pyme.sidebar-mode.v2'
const businessKey = 'asistente-pyme.e1a2.demo.v1'

function withStorage(entries, check) {
  const previous = globalThis.window
  const storage = new Map(Object.entries(entries))
  globalThis.window = { localStorage: {
    getItem: (name) => storage.get(name) ?? null,
    setItem: (name, value) => storage.set(name, value),
  } }
  try { check(storage) } finally {
    if (previous === undefined) delete globalThis.window
    else globalThis.window = previous
  }
}

test('el menú nuevo muestra nombres por defecto y migra hidden v2 sin tocar negocio', () => {
  withStorage({ [legacyKey]: 'hidden', [businessKey]: '{"purchases":["conservar"]}' }, (storage) => {
    assert.equal(loadSidebarMode(), 'expanded')
    assert.equal(storage.has(key), false)
    saveSidebarMode('compact')
    assert.equal(storage.get(key), 'compact')
    assert.equal(storage.get(legacyKey), 'hidden')
    assert.equal(storage.get(businessKey), '{"purchases":["conservar"]}')
    assert.equal(storage.size, 3)
  })
  withStorage({}, () => assert.equal(loadSidebarMode(), 'expanded'))
})

test('se conservan las elecciones anteriores compacto y expandido', () => {
  for (const mode of ['compact', 'expanded']) {
    withStorage({ [legacyKey]: mode }, () => assert.equal(loadSidebarMode(), mode))
  }
})

test('la preferencia v3 recuerda el botón y prima sobre el default oculto anterior', () => {
  withStorage({ [legacyKey]: 'hidden' }, () => {
    for (const mode of ['compact', 'expanded', 'hidden']) {
      saveSidebarMode(mode)
      assert.equal(loadSidebarMode(), mode)
    }
  })
})

test('preferencias inválidas o almacenamiento bloqueado conservan un menú usable con nombres', () => {
  withStorage({ [key]: 'invalid', [legacyKey]: 'invalid' }, () => assert.equal(loadSidebarMode(), 'expanded'))
  const previous = globalThis.window
  globalThis.window = { localStorage: {
    getItem: () => { throw new Error('Storage bloqueado') },
    setItem: () => { throw new Error('Storage bloqueado') },
  } }
  try {
    assert.equal(loadSidebarMode(), 'expanded')
    assert.doesNotThrow(() => saveSidebarMode('compact'))
  } finally {
    if (previous === undefined) delete globalThis.window
    else globalThis.window = previous
  }
})
