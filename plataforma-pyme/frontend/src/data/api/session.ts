import { createHttpClient, GatewayError } from './httpClient.ts'
import type { AuthContext } from './httpClient.ts'

export type SessionUser = { id: string; name: string; role: 'administrador' | 'operador' }
export type SessionState = {
  status: 'checking' | 'anonymous' | 'authenticating' | 'authenticated' | 'expired' | 'unavailable' | 'signing-out'
  user: SessionUser | null
  error: string | null
}
type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export const SESSION_KEY = 'walos.api.session.v1'

function readUser(value: unknown): SessionUser {
  if (!value || typeof value !== 'object' || !('id' in value) || !('nombre' in value) || !('rol' in value)
    || !Number.isSafeInteger(value.id) || Number(value.id) <= 0 || typeof value.nombre !== 'string'
    || (value.rol !== 'administrador' && value.rol !== 'operador')) throw new GatewayError('server', 'El servidor devolvió una identidad inválida.')
  return { id: 'user:' + value.id, name: value.nombre, role: value.rol }
}

export function createSession(options: { fetcher?: typeof fetch; storage?: SessionStorage; now?: () => number } = {}) {
  const now = options.now ?? Date.now
  let state: SessionState = { status: 'checking', user: null, error: null }
  let token: string | null = null
  let generation = 0
  let expiresAt = 0
  let expiryTimer: ReturnType<typeof setTimeout> | undefined
  let starting: Promise<void> | null = null
  const listeners = new Set<() => void>()
  const publish = (next: SessionState) => { state = next; listeners.forEach((listener) => listener()) }
  const clearStored = () => { try { options.storage?.removeItem(SESSION_KEY) } catch { /* Memory-only session remains usable. */ } }
  const auth = (): AuthContext => ({ token, generation })
  function expire(context = auth()) {
    if (context.generation !== generation) return
    generation++
    token = null
    clearTimeout(expiryTimer)
    clearStored()
    publish({ status: 'expired', user: state.user, error: null })
  }
  const request = createHttpClient({ fetcher: options.fetcher, auth, onUnauthorized: expire })
  function scheduleExpiry() {
    clearTimeout(expiryTimer)
    expiryTimer = setTimeout(() => expire(), Math.max(0, expiresAt - now()))
  }
  async function restore() {
    const version = ++generation
    publish({ status: 'checking', user: state.user, error: null })
    try {
      const raw = options.storage?.getItem(SESSION_KEY)
      const stored = raw ? JSON.parse(raw) : null
      if (!stored || typeof stored.token !== 'string' || !stored.token || !Number.isFinite(stored.expiresAt) || stored.expiresAt <= now()) {
        token = null
        clearStored()
        publish({ status: 'anonymous', user: null, error: null })
        return
      }
      token = stored.token
      expiresAt = stored.expiresAt
      const user = readUser(await request('/auth/me'))
      if (version !== generation) return
      publish({ status: 'authenticated', user, error: null })
      scheduleExpiry()
    } catch (error) {
      if (version !== generation) return
      if (error instanceof GatewayError && error.kind === 'unauthenticated') return
      publish({ status: 'unavailable', user: state.user, error: 'No se pudo comprobar la sesión. Reintentá o ingresá de nuevo.' })
    }
  }
  return {
    request,
    getSnapshot: () => state,
    getGeneration: () => generation,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    start() { starting ??= restore(); return starting },
    retry: restore,
    async login(nombre: string, password: string) {
      const previousUser = state.user
      const version = ++generation
      publish({ status: 'authenticating', user: previousUser, error: null })
      try {
        const data = await request<{ access_token: string; expires_in: number }>('/auth/login', {
          method: 'POST', body: { nombre, password }, authenticated: false,
        })
        if (version !== generation) return
        if (typeof data.access_token !== 'string' || !data.access_token || !Number.isSafeInteger(data.expires_in) || data.expires_in <= 0) throw new GatewayError('server', 'La respuesta de acceso no es válida.')
        token = data.access_token
        expiresAt = now() + data.expires_in * 1000
        const user = readUser(await request('/auth/me'))
        if (version !== generation) return
        if (previousUser && previousUser.id !== user.id) {
          try { await request('/auth/logout', { method: 'POST' }) } catch { /* Do not adopt another identity's token. */ }
          throw new GatewayError('forbidden', 'Volvé a ingresar con la misma cuenta para conservar el borrador. Para cambiar de cuenta, descartá y cerrá la sesión.')
        }
        try { options.storage?.setItem(SESSION_KEY, JSON.stringify({ token, expiresAt })) } catch { /* Fall back to memory, never localStorage. */ }
        publish({ status: 'authenticated', user, error: null })
        scheduleExpiry()
      } catch (error) {
        if (version !== generation) return
        token = null
        clearStored()
        publish({ status: previousUser ? 'expired' : 'anonymous', user: previousUser,
          error: error instanceof Error ? error.message : 'No se pudo iniciar sesión.' })
      }
    },
    async logout() {
      publish({ ...state, status: 'signing-out', error: null })
      const ending = token ? request('/auth/logout', { method: 'POST' }) : Promise.resolve()
      generation++
      token = null
      clearTimeout(expiryTimer)
      clearStored()
      publish({ status: 'anonymous', user: null, error: null })
      try { await ending } catch { /* Local logout is immediate, even if the server is unreachable. */ }
    },
    dispose() { clearTimeout(expiryTimer); listeners.clear() },
  }
}

export type SessionClient = ReturnType<typeof createSession>
