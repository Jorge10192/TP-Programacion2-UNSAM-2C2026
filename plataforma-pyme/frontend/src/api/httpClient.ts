/** E2-7 T01: transport only. No user session, tenant state, or DEMO fallback. */
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type ApiRequestOptions = {
  method?: ApiMethod
  body?: unknown
  signal?: AbortSignal
  headers?: Record<string, string>
  idempotencyKey?: string
  timeoutMs?: number
}

export type ApiClientOptions = {
  basePath?: string
  getAccessToken?: () => string | null
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

export class ApiHttpError extends Error {
  readonly name = 'ApiHttpError'
  readonly status: number
  readonly detail: unknown
  constructor(status: number, detail: unknown) {
    super(`La API devolvió HTTP ${status}`)
    this.status = status
    this.detail = detail
  }
}

export type TransportFailure = 'network' | 'timeout' | 'aborted' | 'invalid-response'

export class ApiTransportError extends Error {
  readonly name = 'ApiTransportError'
  readonly reason: TransportFailure
  readonly outcomeUnknown: boolean
  constructor(reason: TransportFailure, outcomeUnknown: boolean) {
    super(reason === 'timeout' ? 'Se agotó el tiempo de espera de la API'
      : reason === 'aborted' ? 'La solicitud fue cancelada'
      : reason === 'invalid-response' ? 'La API devolvió una respuesta no válida'
      : 'No se pudo contactar con la API')
    this.reason = reason
    this.outcomeUnknown = outcomeUnknown
  }
}

function safePath(path: string): void {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('#') || /(^|\/)\.\.?($|\/)/.test(path)) {
    throw new TypeError('La ruta API debe ser relativa y no contener segmentos especiales')
  }
}

function isJson(contentType: string | null): boolean {
  return !!contentType && /(^|\/)json(?:\s*;|$)|\+json(?:\s*;|$)/i.test(contentType)
}

function isMutation(method: ApiMethod): boolean {
  return method !== 'GET'
}

/** A client for /api/v1, supporting an opaque Bearer token provided at request time. */
export function createApiClient(config: ApiClientOptions = {}) {
  const basePath = config.basePath ?? '/api/v1'
  if (!/^\/[a-zA-Z0-9/_-]+$/.test(basePath) || basePath.endsWith('/')) {
    throw new TypeError('La base de la API debe ser una ruta local sin barra final')
  }
  const transport = config.fetchImpl ?? fetch
  const defaultTimeoutMs = config.timeoutMs ?? 30_000

  async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    safePath(path)
    const method = options.method ?? 'GET'
    const timeoutMs = options.timeoutMs ?? defaultTimeoutMs
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
      throw new RangeError('timeoutMs debe ser un entero positivo')
    }
    if (method === 'GET' && options.body !== undefined) {
      throw new TypeError('GET no admite cuerpo')
    }
    const headers = new Headers(options.headers)
    headers.set('Accept', 'application/json')
    if (options.body !== undefined) headers.set('Content-Type', 'application/json')
    if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey)
    const token = config.getAccessToken?.()
    // Do not let call sites forge the auth header; session layer is introduced in T02.
    headers.delete('Authorization')
    if (token) headers.set('Authorization', `Bearer ${token}`)

    const controller = new AbortController()
    let timedOut = false
    const abortFromCaller = () => controller.abort()
    if (options.signal?.aborted) controller.abort()
    else options.signal?.addEventListener('abort', abortFromCaller, { once: true })
    const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeoutMs)
    try {
      const response = await transport(basePath + path, {
        method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal, credentials: 'omit', redirect: 'error', cache: 'no-store',
      })
      if (response.status === 204 || response.status === 205) {
        if (!response.ok) throw new ApiHttpError(response.status, null)
        return undefined as T
      }
      const contentType = response.headers.get('Content-Type')
      if (!isJson(contentType)) {
        if (!response.ok) throw new ApiHttpError(response.status, null)
        throw new ApiTransportError('invalid-response', isMutation(method))
      }
      let payload: unknown
      try { payload = await response.json() }
      catch { throw new ApiTransportError('invalid-response', isMutation(method)) }
      if (!response.ok) {
        const detail = typeof payload === 'object' && payload !== null && 'detail' in payload
          ? (payload as { detail: unknown }).detail : null
        throw new ApiHttpError(response.status, detail)
      }
      return payload as T
    } catch (err) {
      if (err instanceof ApiHttpError || err instanceof ApiTransportError) throw err
      if (controller.signal.aborted) {
        throw new ApiTransportError(timedOut ? 'timeout' : 'aborted', isMutation(method))
      }
      throw new ApiTransportError('network', isMutation(method))
    } finally {
      clearTimeout(timer)
      options.signal?.removeEventListener('abort', abortFromCaller)
    }
  }
  return { request }
}

export const apiClient = createApiClient()
