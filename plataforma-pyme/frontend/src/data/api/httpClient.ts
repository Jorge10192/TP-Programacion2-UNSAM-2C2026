export type ErrorKind = 'unauthenticated' | 'forbidden' | 'validation' | 'conflict' | 'network' | 'server' | 'unsupported' | 'stale'

export class GatewayError extends Error {
  kind: ErrorKind
  status?: number
  outcome: 'rejected' | 'unknown'
  constructor(kind: ErrorKind, message: string, status?: number, outcome: 'rejected' | 'unknown' = 'rejected') {
    super(message)
    this.name = 'GatewayError'
    this.kind = kind
    this.status = status
    this.outcome = outcome
  }
}

export type AuthContext = { token: string | null; generation: number }
export type JsonRequest = { method?: string; body?: unknown; signal?: AbortSignal; authenticated?: boolean; idempotencyKey?: string }

function errorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object' || !('detail' in body)) return fallback
  const detail = body.detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object' && 'message' in detail && typeof detail.message === 'string') return detail.message
  if (Array.isArray(detail)) return detail.map((item) => typeof item?.msg === 'string' ? item.msg : '').filter(Boolean).join('. ') || fallback
  return fallback
}

export function createHttpClient(options: {
  fetcher?: typeof fetch
  auth: () => AuthContext
  onUnauthorized: (context: AuthContext) => void
  timeoutMs?: number
}) {
  const fetcher = options.fetcher ?? fetch
  return async function request<T>(path: string, input: JsonRequest = {}): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) throw new GatewayError('validation', 'La API debe usar una ruta relativa del mismo origen.')
    const auth = options.auth()
    const authenticated = input.authenticated !== false
    if (authenticated && !auth.token) throw new GatewayError('unauthenticated', 'Ingresá para continuar.', 401)
    const method = input.method ?? 'GET'
    const writes = method !== 'GET' && method !== 'HEAD'
    const abort = new AbortController()
    const onAbort = () => abort.abort()
    input.signal?.addEventListener('abort', onAbort, { once: true })
    if (input.signal?.aborted) abort.abort()
    const timer = setTimeout(() => abort.abort(), options.timeoutMs ?? 30_000)
    try {
      const response = await fetcher(path, {
        method, signal: abort.signal, cache: 'no-store', credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          ...(input.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(authenticated ? { Authorization: 'Bearer ' + auth.token } : {}),
          ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
        },
        ...(input.body === undefined ? {} : { body: JSON.stringify(input.body) }),
      })
      if (auth.generation !== options.auth().generation) throw new GatewayError('stale', 'La sesión cambió; se descartó la respuesta anterior.', undefined, writes ? 'unknown' : 'rejected')
      if (response.status === 401 && authenticated) options.onUnauthorized(auth)
      if (response.status === 204 && response.ok) return undefined as T
      const isJson = /\bapplication\/(?:[\w.-]+\+)?json\b/i.test(response.headers.get('content-type') ?? '')
      let body: unknown
      if (isJson) {
        try { body = await response.json() } catch {
          throw new GatewayError('server', 'El servidor devolvió una respuesta incompleta. Comprobá la operación antes de volver a enviarla.', response.status, writes ? 'unknown' : 'rejected')
        }
      }
      if (!response.ok) {
        const kind: ErrorKind = response.status === 401 ? 'unauthenticated' : response.status === 403 ? 'forbidden' : response.status === 409 ? 'conflict' : response.status === 422 || response.status === 400 ? 'validation' : 'server'
        const fallback = response.status === 401 ? 'La sesión venció. Volvé a ingresar sin cerrar el formulario.' : response.status === 403 ? 'Tu usuario no tiene permiso para esta operación.' : 'No se pudo completar la operación en el servidor.'
        throw new GatewayError(kind, errorMessage(body, fallback), response.status, writes && response.status >= 500 ? 'unknown' : 'rejected')
      }
      if (!isJson) throw new GatewayError('server', 'Se esperaba una respuesta JSON de la API. No se aceptaron datos de la página como resultado.', response.status, writes ? 'unknown' : 'rejected')
      if (auth.generation !== options.auth().generation) throw new GatewayError('stale', 'La sesión cambió; se descartó la respuesta anterior.', undefined, writes ? 'unknown' : 'rejected')
      return body as T
    } catch (error) {
      if (error instanceof GatewayError) throw error
      throw new GatewayError('network', writes
        ? 'No se pudo comprobar el resultado. Conservá este formulario y verificá la misma operación antes de reintentar.'
        : 'No se pudo conectar con el servidor. Reintentá cuando vuelva la conexión.', undefined, writes ? 'unknown' : 'rejected')
    } finally {
      clearTimeout(timer)
      input.signal?.removeEventListener('abort', onAbort)
    }
  }
}
