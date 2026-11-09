import { ApiHttpError, ApiTransportError, createApiClient } from '../../api/httpClient.ts'

/** Contracts: backend/app/modules/businesses/schemas.py (CU-03). */
export type ActivityKind = 'PRODUCTOS' | 'SERVICIOS' | 'MIXTO'
export type BusinessMembership = {
  id: string
  user_id: string
  role: string
  status: string
  job_title: string | null
}
export type RealBusiness = {
  id: string
  name: string
  category: string
  activity_kind: ActivityKind
  status: 'ACTIVA' | 'SUSPENDIDA'
  founder_user_id: string
  created_at: string
  membership: BusinessMembership
}
export type NewBusiness = { name: string; category: string; activity_kind: ActivityKind }
export type BusinessChanges = Partial<NewBusiness>

export const UUID_PATTERN = /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function requiredText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
function kind(value: unknown): value is ActivityKind {
  return value === 'PRODUCTOS' || value === 'SERVICIOS' || value === 'MIXTO'
}
function invalidResponse(): never {
  throw new ApiTransportError('invalid-response', false)
}

export function parseRealBusiness(value: unknown, userId: string): RealBusiness {
  if (!record(value) || !requiredText(value.id) || !UUID_PATTERN.test(value.id)
    || !requiredText(value.name) || !requiredText(value.category) || !kind(value.activity_kind)
    || (value.status !== 'ACTIVA' && value.status !== 'SUSPENDIDA')
    || !requiredText(value.founder_user_id) || !requiredText(value.created_at)
    || !record(value.membership) || !requiredText(value.membership.id)
    || value.membership.user_id !== userId || !requiredText(value.membership.role)
    || value.membership.status !== 'ACTIVA'
    || !(value.membership.job_title === null || typeof value.membership.job_title === 'string')) {
    return invalidResponse()
  }
  return {
    id: value.id, name: value.name, category: value.category,
    activity_kind: value.activity_kind, status: value.status,
    founder_user_id: value.founder_user_id, created_at: value.created_at,
    membership: {
      id: value.membership.id, user_id: value.membership.user_id,
      role: value.membership.role, status: value.membership.status,
      job_title: value.membership.job_title,
    },
  }
}

export function parseRealBusinessList(value: unknown, userId: string): RealBusiness[] {
  if (!Array.isArray(value)) return invalidResponse()
  const businesses = value.map((item) => parseRealBusiness(item, userId))
  if (new Set(businesses.map((item) => item.id)).size !== businesses.length) return invalidResponse()
  return businesses
}

/** One authenticated gateway per in-memory session. Never touches demoStore. */
export function createBusinessGateway(token: string, userId: string, fetchImpl?: typeof fetch) {
  if (!token || !userId) throw new TypeError('Se requiere sesión autenticada')
  const client = createApiClient({ getAccessToken: () => token, fetchImpl })
  return {
    async list(signal?: AbortSignal): Promise<RealBusiness[]> {
      return parseRealBusinessList(
        await client.request<unknown>('/businesses', { signal }), userId)
    },
    async get(businessId: string, signal?: AbortSignal): Promise<RealBusiness> {
      if (!UUID_PATTERN.test(businessId)) throw new TypeError('ID de empresa inválido')
      return parseRealBusiness(
        await client.request<unknown>('/businesses/' + businessId, { signal }), userId)
    },
    async create(input: NewBusiness, key: string): Promise<RealBusiness> {
      if (!UUID_PATTERN.test(key)) throw new TypeError('Idempotency-Key debe ser UUID')
      return parseRealBusiness(await client.request<unknown>('/businesses', {
        method: 'POST', body: input, idempotencyKey: key,
      }), userId)
    },
    async update(businessId: string, changes: BusinessChanges): Promise<RealBusiness> {
      if (!UUID_PATTERN.test(businessId)) throw new TypeError('ID de empresa inválido')
      return parseRealBusiness(await client.request<unknown>('/businesses/' + businessId, {
        method: 'PATCH', body: changes,
      }), userId)
    },
  }
}

export function businessErrorMessage(error: unknown): string {
  if (error instanceof ApiHttpError) {
    if (error.status === 401) return 'La sesión ya no es válida. Volvé a iniciar sesión.'
    if (error.status === 403) return 'No tenés permiso para realizar esta operación.'
    if (error.status === 404) return 'La empresa no está disponible para tu cuenta.'
    if (error.status === 409) return 'La operación entra en conflicto con el estado actual o con su clave de solicitud.'
    if (error.status === 422) return 'Revisá los datos obligatorios y su formato.'
    return 'FastAPI no pudo completar la solicitud.'
  }
  if (error instanceof ApiTransportError) {
    if (error.reason === 'aborted') return 'Solicitud cancelada.'
    if (error.reason === 'timeout') return 'La API tardó demasiado en responder. El resultado del cambio podría ser incierto.'
    if (error.reason === 'invalid-response') return 'La API devolvió datos incompatibles con el contrato.'
    return 'No se pudo contactar a FastAPI. Comprobá la conexión.'
  }
  return 'No se pudo completar la operación.'
}

export function canEditBusiness(business: RealBusiness): boolean {
  return business.status === 'ACTIVA' && business.membership.status === 'ACTIVA'
    && ['TITULAR_ADMINISTRATIVO', 'ADMINISTRADOR'].includes(business.membership.role)
}
