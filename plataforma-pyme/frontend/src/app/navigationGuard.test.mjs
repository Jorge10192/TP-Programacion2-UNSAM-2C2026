import test from 'node:test'
import assert from 'node:assert/strict'
import { createNavigationGuard } from './navigationGuard.ts'
import { installHistoryNavigation } from './historyNavigation.ts'

test('seguir editando conserva los cambios y no autoriza la salida ni la recarga', () => {
  const messages = []
  const guard = createNavigationGuard((message) => { messages.push(message); return false }, assert.fail)
  const draft = { dirty: true, busy: false, requestId: 'misma-solicitud', lines: ['uno', 'dos'] }
  const before = structuredClone(draft)
  const unregister = guard.register(draft)
  assert.equal(guard.requestLeave(), false)
  assert.deepEqual(draft, before)
  assert.equal(guard.shouldBlockUnload(), true)
  assert.match(messages[0], /descartar/)
  assert.match(messages[0], /seguir editando/)
  unregister()
  assert.equal(guard.shouldBlockUnload(), false)
})

test('un formulario intacto sale sin preguntar; un guardado pendiente impide salir', () => {
  let prompts = 0
  const warnings = []
  const guard = createNavigationGuard(() => { prompts++; return true }, (message) => warnings.push(message))
  const draft = { dirty: false, busy: false }
  guard.register(draft)
  assert.equal(guard.requestLeave(), true)
  assert.equal(prompts, 0)
  assert.equal(guard.shouldBlockUnload(), false)
  draft.busy = true
  assert.equal(guard.requestLeave(), false)
  assert.equal(guard.shouldBlockUnload(), true)
  assert.equal(warnings.length, 1)
  assert.equal(prompts, 0)
})

test('cerrar un detalle intacto no descarta otro borrador; navegar pregunta una sola vez', () => {
  let prompts = 0
  const guard = createNavigationGuard(() => { prompts++; return true }, assert.fail)
  const draft = { dirty: true, busy: false }
  const receipt = { dirty: false, busy: false }
  guard.register(draft)
  guard.register(receipt)
  assert.equal(guard.requestDiscard(receipt), true)
  assert.equal(prompts, 0)
  receipt.dirty = true
  assert.equal(guard.requestLeave(), true)
  assert.equal(prompts, 1)
  // La autorización no limpia campos: el formulario sólo desaparece al ejecutar la salida.
  assert.equal(draft.dirty, true)
  assert.equal(receipt.dirty, true)
})

function fakeBrowser() {
  const listeners = new Set()
  const entries = [{ url: 'http://localhost/inicio', state: { previousMetadata: 'preservar' } }]
  const queue = []
  let position = 0
  const location = { href: entries[0].url, pathname: '/inicio' }
  function updateLocation() {
    location.href = entries[position].url
    location.pathname = new URL(location.href).pathname
  }
  const history = {
    get state() { return entries[position].state },
    get length() { return entries.length },
    replaceState(state, _title, url) {
      entries[position] = { state, url: url ? new URL(url, location.href).href : location.href }
      updateLocation()
    },
    pushState(state, _title, url) {
      entries.splice(position + 1, entries.length, { state, url: new URL(url, location.href).href })
      position++
      updateLocation()
    },
    go(delta) {
      queue.push(() => {
        const next = position + delta
        if (next < 0 || next >= entries.length) return
        position = next
        updateLocation()
        for (const listener of listeners) listener({ state: history.state })
      })
    },
  }
  return {
    browser: { history, location, addEventListener: (_name, handler) => listeners.add(handler),
      removeEventListener: (_name, handler) => listeners.delete(handler) },
    flushNext: () => queue.shift()?.(),
    flush: () => { while (queue.length) queue.shift()() },
  }
}

test('cancelar navegación o cambio de empresa no agrega entradas ni cambia la pantalla', () => {
  const { browser } = fakeBrowser()
  let allowed = true
  const routes = []
  const navigation = installHistoryNavigation(browser, () => allowed, (path) => routes.push(path))
  assert.equal(browser.history.state.previousMetadata, 'preservar')
  navigation.navigate('/b/walos-demo/compras')
  allowed = false
  const before = browser.history.length
  assert.equal(navigation.navigate('/b/comercio-demo/inicio'), false)
  assert.equal(browser.location.pathname, '/b/walos-demo/compras')
  assert.equal(browser.history.length, before)
  assert.deepEqual(routes, ['/b/walos-demo/compras'])
  assert.equal(navigation.navigate('/b/walos-demo/compras'), true)
  navigation.dispose()
})

test('cancelar Atrás o Adelante restaura la entrada y conserva el historial en ambos sentidos', () => {
  const { browser, flushNext, flush } = fakeBrowser()
  let allowed = true
  const routes = []
  const navigation = installHistoryNavigation(browser, () => allowed, (path) => routes.push(path))
  navigation.navigate('/b/walos-demo/catalogo')
  navigation.navigate('/b/walos-demo/compras')
  allowed = false
  browser.history.go(-2)
  flushNext()
  assert.equal(routes.at(-1), '/b/walos-demo/compras')
  assert.equal(navigation.navigate('/perfil'), false)
  flush()
  assert.equal(browser.location.pathname, '/b/walos-demo/compras')
  assert.equal(browser.history.length, 3)
  allowed = true
  browser.history.go(-1)
  flush()
  assert.equal(routes.at(-1), '/b/walos-demo/catalogo')
  allowed = false
  browser.history.go(1)
  flush()
  assert.equal(browser.location.pathname, '/b/walos-demo/catalogo')
  assert.equal(routes.at(-1), '/b/walos-demo/catalogo')
  allowed = true
  browser.history.go(1)
  flush()
  assert.equal(routes.at(-1), '/b/walos-demo/compras')
  assert.equal(browser.history.length, 3)
  navigation.dispose()
})
