import { ApiHttpError, ApiTransportError, createApiClient } from '../../api/httpClient.ts'

/** E2-7 T02: DTOs based on backend/app/modules/auth/schemas.py. */
export type AuthUser = {
  id: string
  email: string
  display_name: string
  contact_phone: string | null
  status: string
  created_at: string
}
export type LoginResult = {
  access_token: string
  token_type: 'bearer'
  expires_at: string
  user: AuthUser
}
export type RegisterInput = {
  email: string
  password: string
  display_name: string
  contact_phone: string | null
}
export type LoginInput = { email: string; password: string }
export type AuthGateway = ReturnType<typeof createAuthGateway>

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseAuthUser(value: unknown): AuthUser {
  if (!object(value) || typeof value.id !== 'string' || typeof value.email !== 'string'
    || typeof value.display_name !== 'string' || typeof value.status !== 'string'
    || typeof value.created_at !== 'string'
    || !(value.contact_phone === null || typeof value.contact_phone === 'string')) {
    throw new ApiTransportError('invalid-response', false)
  }
  return {
    id: value.id, email: value.email, display_name: value.display_name,
    contact_phone: value.contact_phone, status: value.status, created_at: value.created_at,
  }
}

export function parseLoginResult(value: unknown): LoginResult {
  if (!object(value) || typeof value.access_token !== 'string' || value.access_token.length === 0
    || value.token_type !== 'bearer' || typeof value.expires_at !== 'string'
    || !Number.isFinite(Date.parse(value.expires_at))) {
    throw new ApiTransportError('invalid-response', false)
  }
  return {
    access_token: value.access_token,
    token_type: 'bearer',
    expires_at: value.expires_at,
    user: parseAuthUser(value.user),
  }
}

/** Token is supplied from the invoking component's in-memory session only. */
export function createAuthGateway(fetchImpl?: typeof fetch) {
  const publicClient = createApiClient({ fetchImpl })
  const privateClient = (token: string) => createApiClient({
    fetchImpl, getAccessToken: () => token,
  })
  return {
    async register(input: RegisterInput, signal?: AbortSignal): Promise<AuthUser> {
      const payload = await publicClient.request<unknown>('/auth/register',
        { method: 'POST', body: input, signal })
      return parseAuthUser(payload)
    },
    async login(input: LoginInput, signal?: AbortSignal): Promise<LoginResult> {
      const payload = await publicClient.request<unknown>('/auth/login',
        { method: 'POST', body: input, signal })
      return parseLoginResult(payload)
    },
    async me(token: string, signal?: AbortSignal): Promise<AuthUser> {
      const payload = await privateClient(token).request<unknown>('/auth/me', { signal })
      return parseAuthUser(payload)
    },
    async logout(token: string): Promise<void> {
      await privateClient(token).request<void>('/auth/logout', { method: 'POST' })
    },
  }
}

export function authErrorMessage(error: unknown, operation: 'register' | 'login' | 'me' | 'logout'): string {
  if (error instanceof ApiHttpError) {
    if (error.status === 401) return 'Sesión vencida o credenciales incorrectas. Iniciá sesión nuevamente.'
    if (error.status === 409 && operation === 'register') return 'No se pudo completar el registro. Revisá los datos o utilizá otra cuenta.'
    if (error.status === 422) return 'Revisá el correo, el nombre y los requisitos de la contraseña.'
    if (error.status === 403 || error.status === 404) return 'No tenés acceso a este recurso.'
    return 'El servidor no pudo completar la solicitud. Intentá nuevamente.'
  }
  if (error instanceof ApiTransportError) {
    if (error.reason === 'aborted') return 'Solicitud cancelada.'
    if (error.reason === 'timeout') return 'La respuesta está tardando demasiado. Verificá la conexión.'
    return 'No se pudo comunicar con FastAPI. Verificá que la API esté funcionando.'
  }
  return 'No se pudo completar la operación.'
}
