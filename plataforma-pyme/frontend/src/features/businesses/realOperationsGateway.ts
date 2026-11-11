import { ApiHttpError, ApiTransportError, createApiClient } from '../../api/httpClient.ts'
import { parseRealBusiness, UUID_PATTERN } from '../businesses/businessGateway.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'

export type LocationKind = 'LOCAL' | 'FERIA' | 'DEPOSITO' | 'OFICINA' | 'CASA' | 'OTRO'
export type LocationInput = {
  name: string; kind: LocationKind; address: string; map_url: string
  can_sell: boolean; can_store: boolean
}
export type LocationRecord = LocationInput & {
  id: string; business_id: string; is_primary: boolean
  status: 'ACTIVA' | 'PAUSADA'; created_at: string; updated_at: string
}
export type TeamMember = {
  id: string; user_id: string; email: string; display_name: string
  role: string; status: 'ACTIVA' | 'INACTIVA'; job_title: string | null
}
export type InvitationIssued = {
  id: string; business_id: string; email: string
  role: 'ENCARGADO' | 'TRABAJADOR'; status: 'PENDIENTE'
  expires_at: string; invitation_token: string
}
export type Assignment = {
  business_id: string; location_id: string; membership_id: string; user_id: string
  status: 'ACTIVA' | 'REVOCADA'; created_at: string; updated_at: string; revoked_at: string | null
}
export type MemberChanges = { role?: 'ADMINISTRADOR' | 'ENCARGADO' | 'TRABAJADOR'; status?: 'ACTIVA' | 'INACTIVA' }
export type InvitationInput = { email: string; role: 'ENCARGADO' | 'TRABAJADOR' }

function data(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}
function fail(): never { throw new ApiTransportError('invalid-response', false) }
function isKind(v: unknown): v is LocationKind {
  return ['LOCAL','FERIA','DEPOSITO','OFICINA','CASA','OTRO'].includes(String(v))
}
function validDate(v: unknown): v is string {
  return typeof v === 'string' && Number.isFinite(Date.parse(v))
}
function list<T>(value: unknown, decode: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) return fail()
  return value.map(decode)
}
export function parseLocation(value: unknown, businessId: string): LocationRecord {
  if (!data(value) || !UUID_PATTERN.test(String(value.id))
    || value.business_id !== businessId || !nonEmpty(value.name)
    || !isKind(value.kind) || typeof value.address !== 'string'
    || typeof value.map_url !== 'string'
    || typeof value.can_sell !== 'boolean' || typeof value.can_store !== 'boolean'
    || typeof value.is_primary !== 'boolean'
    || (value.status !== 'ACTIVA' && value.status !== 'PAUSADA')
    || !validDate(value.created_at) || !validDate(value.updated_at)) return fail()
  return {
    id: value.id as string, business_id: businessId, name: value.name,
    kind: value.kind, address: value.address, map_url: value.map_url,
    can_sell: value.can_sell, can_store: value.can_store,
    is_primary: value.is_primary, status: value.status,
    created_at: value.created_at, updated_at: value.updated_at,
  }
}
export function parseTeamMember(value: unknown): TeamMember {
  if (!data(value) || !UUID_PATTERN.test(String(value.id))
    || !UUID_PATTERN.test(String(value.user_id))
    || !nonEmpty(value.email) || !nonEmpty(value.display_name)
    || !nonEmpty(value.role) || (value.status !== 'ACTIVA' && value.status !== 'INACTIVA')
    || !(value.job_title === null || typeof value.job_title === 'string')) return fail()
  return {
    id: value.id as string, user_id: value.user_id as string, email: value.email,
    display_name: value.display_name, role: value.role, status: value.status,
    job_title: value.job_title,
  }
}
export function parseInvitation(value: unknown, businessId: string): InvitationIssued {
  if (!data(value) || !UUID_PATTERN.test(String(value.id))
    || value.business_id !== businessId || !nonEmpty(value.email)
    || (value.role !== 'ENCARGADO' && value.role !== 'TRABAJADOR')
    || value.status !== 'PENDIENTE' || !validDate(value.expires_at)
    || typeof value.invitation_token !== 'string'
    || !/^[A-Za-z0-9_-]{43}$/.test(value.invitation_token)) return fail()
  return {
    id: value.id as string, business_id: businessId, email: value.email,
    role: value.role, status: 'PENDIENTE', expires_at: value.expires_at,
    invitation_token: value.invitation_token,
  }
}
export function parseAssignment(value: unknown, businessId: string, locationId: string): Assignment {
  if (!data(value) || value.business_id !== businessId || value.location_id !== locationId
    || !UUID_PATTERN.test(String(value.membership_id)) || !UUID_PATTERN.test(String(value.user_id))
    || (value.status !== 'ACTIVA' && value.status !== 'REVOCADA')
    || !validDate(value.created_at) || !validDate(value.updated_at)
    || !(value.revoked_at === null || validDate(value.revoked_at))) return fail()
  return {
    business_id: businessId, location_id: locationId,
    membership_id: value.membership_id as string, user_id: value.user_id as string,
    status: value.status, created_at: value.created_at,
    updated_at: value.updated_at, revoked_at: value.revoked_at,
  }
}

function requireId(id: string): string {
  if (!UUID_PATTERN.test(id)) throw new TypeError('Identificador UUID inválido')
  return id
}
export function canManageLocations(business: RealBusiness) {
  return business.status === 'ACTIVA' && business.membership.status === 'ACTIVA'
    && ['TITULAR_ADMINISTRATIVO','ADMINISTRADOR'].includes(business.membership.role)
}
export function canReadTeam(business: RealBusiness) {
  return canManageLocations(business)
}
export function canManageTeam(business: RealBusiness) {
  return business.status === 'ACTIVA' && business.membership.status === 'ACTIVA'
    && business.membership.role === 'TITULAR_ADMINISTRATIVO'
}
export function canAcceptInvitationToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token)
}

export function createOperationsGateway(token: string, userId: string, fetchImpl?: typeof fetch) {
  if (!token || !UUID_PATTERN.test(userId)) throw new TypeError('Sesión inválida')
  const api = createApiClient({ getAccessToken: () => token, fetchImpl })
  const root = (b: string) => '/businesses/' + requireId(b)
  const locations = (b: string) => root(b) + '/locations'
  const at = (b: string, l: string) => locations(b) + '/' + requireId(l)
  const team = (b: string) => root(b) + '/memberships'
  return {
    async business(businessId: string, signal?: AbortSignal) {
      return parseRealBusiness(await api.request<unknown>(root(businessId), { signal }), userId)
    },
    async locations(businessId: string, signal?: AbortSignal) {
      return list(await api.request<unknown>(locations(businessId), { signal }),
        (value) => parseLocation(value, businessId))
    },
    async myAssignedLocationIds(businessId: string, signal?: AbortSignal): Promise<string[]> {
      const raw = await api.request<unknown>(locations(businessId) + '/my-assignments', { signal })
      if (!Array.isArray(raw) || raw.some(id => typeof id !== 'string' || !UUID_PATTERN.test(id))
        || new Set(raw).size !== raw.length) return fail()
      return raw as string[]
    },
    async createLocation(businessId: string, input: LocationInput) {
      return parseLocation(await api.request<unknown>(locations(businessId), { method: 'POST', body: input }), businessId)
    },
    async updateLocation(businessId: string, locationId: string, changes: Partial<LocationInput>) {
      return parseLocation(await api.request<unknown>(at(businessId, locationId), { method: 'PATCH', body: changes }), businessId)
    },
    async setLocationStatus(businessId: string, locationId: string, status: 'ACTIVA' | 'PAUSADA') {
      return parseLocation(await api.request<unknown>(at(businessId, locationId) + '/status',
        { method: 'PATCH', body: { status } }), businessId)
    },
    async makePrimary(businessId: string, locationId: string) {
      return parseLocation(await api.request<unknown>(at(businessId, locationId) + '/primary',
        { method: 'PUT' }), businessId)
    },
    async team(businessId: string, signal?: AbortSignal) {
      return list(await api.request<unknown>(team(businessId), { signal }), parseTeamMember)
    },
    async changeMember(businessId: string, membershipId: string, changes: MemberChanges) {
      return parseTeamMember(await api.request<unknown>(
        team(businessId) + '/' + requireId(membershipId), { method: 'PATCH', body: changes }))
    },
    async invite(businessId: string, input: InvitationInput) {
      return parseInvitation(await api.request<unknown>(root(businessId) + '/invitations',
        { method: 'POST', body: input }), businessId)
    },
    async acceptInvitation(invitationToken: string) {
      if (!canAcceptInvitationToken(invitationToken)) throw new TypeError('Token de invitación inválido')
      return parseRealBusiness(await api.request<unknown>('/invitations/accept',
        { method: 'POST', body: { invitation_token: invitationToken } }), userId)
    },
    async assignments(businessId: string, locationId: string, signal?: AbortSignal) {
      return list(await api.request<unknown>(at(businessId, locationId) + '/assignments', { signal }),
        (value) => parseAssignment(value, businessId, locationId))
    },
    async setAssignment(businessId: string, locationId: string, membershipId: string, status: 'ACTIVA'|'REVOCADA') {
      return parseAssignment(await api.request<unknown>(
        at(businessId, locationId) + '/assignments/' + requireId(membershipId),
        { method: 'PUT', body: { status } }), businessId, locationId)
    },
  }
}
export type OperationsGateway = ReturnType<typeof createOperationsGateway>
export function operationsError(error: unknown): string {
  if (error instanceof ApiHttpError) {
    if (error.status === 401) return 'Sesión inválida o vencida. Iniciá sesión otra vez.'
    if (error.status === 403) return 'Tu rol no tiene permiso para esta operación.'
    if (error.status === 404) return 'Recurso no disponible en esta empresa o para esta cuenta.'
    if (error.status === 409) return 'Conflicto: revisá estado, permisos y asignaciones antes de reintentar.'
    if (error.status === 422) return 'Revisá los campos y sus valores; la API rechazó la solicitud.'
    return 'No se pudo completar la solicitud en FastAPI.'
  }
  if (error instanceof ApiTransportError) {
    return error.outcomeUnknown
      ? 'Resultado no confirmado: puede haberse guardado. Consultá el estado actualizado antes de repetir.'
      : 'No se pudo completar la consulta. Comprobá la conexión y volvé a cargar.'
  }
  return 'Operación no completada. Comprobá los datos y la conexión.'
}
