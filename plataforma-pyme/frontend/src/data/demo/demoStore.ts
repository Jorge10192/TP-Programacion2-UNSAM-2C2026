/**
 * Única fuente DEMO del perfil global y las empresas.
 * localStorage es almacenamiento del prototipo, NO autenticación ni aislamiento seguro.
 * No usar datos comerciales o personales verdaderos.
 */
import { useSyncExternalStore } from 'react'
import { validateGoogleMapsLink } from './mapsLinks'
import { canReplyToInvitation, displayInvitationStatus, invitationExpiresAt, normalizeInviteInput } from './teamPolicy'
import type { InviteRole, InvitationStatus } from './teamPolicy'
import { catalogNameKey, normalizeCatalogInput } from './catalogPolicy'
import type { CatalogInput } from './catalogPolicy'

export type BusinessKind = 'PRODUCTOS' | 'SERVICIOS' | 'MIXTO'
export type Accent = 'mint' | 'blue' | 'violet'
export type DemoProfile = { id: 'demo-user'; displayName: string; email: string; avatarInitials: string; contactPhone: string }
export function profileInitials(profile: Pick<DemoProfile, 'displayName' | 'avatarInitials'>): string {
  return profile.avatarInitials ||
    profile.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() ||
    'UD'
}

export type DemoBusiness = {
  id: string
  name: string
  category: string
  kind: BusinessKind
  description: string
  slogan: string
  taxId: string
  initials: string
  accent: Accent
  source: 'fixture' | 'created'
  founderUserId: 'demo-user'
  administrativeOwnerUserId: 'demo-user'
}
export type DemoMembership = {
  businessId: string
  userId: 'demo-user'
  role: 'TITULAR_ADMINISTRATIVO'
  status: 'ACTIVA'
  jobTitle: string
}
export type LocationKind = 'LOCAL' | 'FERIA' | 'DEPOSITO' | 'OFICINA' | 'OTRO'
export type DemoLocation = {
  id: string
  businessId: string
  name: string
  kind: LocationKind
  address: string
  mapUrl: string
  canSell: boolean
  canStore: boolean
  isPrimary: boolean
  status: 'ACTIVA' | 'PAUSADA'
}
export type LocationInput = Pick<DemoLocation, 'name' | 'kind' | 'address' | 'mapUrl' | 'canSell' | 'canStore'>
export const locationKindLabels: Record<LocationKind, string> = {
  LOCAL: 'Local o sucursal',
  FERIA: 'Feria o punto temporal',
  DEPOSITO: 'Depósito',
  OFICINA: 'Oficina o espacio de trabajo',
  OTRO: 'Otro espacio',
}

export type DemoInvitation = {
  id: string
  businessId: string
  email: string
  role: InviteRole
  status: InvitationStatus
  createdAt: string
  expiresAt: string
  memberId?: string
}
export type DemoTeamMember = {
  id: string
  businessId: string
  email: string
  role: InviteRole
  status: 'ACTIVA'
  joinedAt: string
  sourceInvitationId: string
}

export type DemoCatalogItem = CatalogInput & {
  id: string
  businessId: string
  status: 'ACTIVO' | 'INACTIVO'
  createdAt: string
  updatedAt: string
}

export type DemoSnapshot = {
  version: 1
  profile: DemoProfile
  businessesById: Record<string, DemoBusiness>
  membershipsByBusinessId: Record<string, DemoMembership>
  locationsById: Record<string, DemoLocation>
  teamInvitationsById: Record<string, DemoInvitation>
  teamMembersById: Record<string, DemoTeamMember>
  catalogItemsById: Record<string, DemoCatalogItem>
}

const STORAGE_KEY = 'asistente-pyme.e1a2.demo.v1'
const fixtures: DemoBusiness[] = [
  { id: 'walos-demo', name: 'WALOS', category: 'Elaboración de productos', kind: 'PRODUCTOS', description: '', slogan: '', taxId: '', initials: 'W', accent: 'mint', source: 'fixture', founderUserId: 'demo-user', administrativeOwnerUserId: 'demo-user' },
  { id: 'comercio-demo', name: 'Comercio Ejemplo', category: 'Reventa de productos', kind: 'PRODUCTOS', description: '', slogan: '', taxId: '', initials: 'C', accent: 'blue', source: 'fixture', founderUserId: 'demo-user', administrativeOwnerUserId: 'demo-user' },
  { id: 'servicios-demo', name: 'Servicios Ejemplo', category: 'Prestación de servicios', kind: 'SERVICIOS', description: '', slogan: '', taxId: '', initials: 'S', accent: 'violet', source: 'fixture', founderUserId: 'demo-user', administrativeOwnerUserId: 'demo-user' },
]

export const kindLabels: Record<BusinessKind, string> = {
  PRODUCTOS: 'Venta o elaboración de productos',
  SERVICIOS: 'Prestación de servicios',
  MIXTO: 'Productos y servicios',
}

function membership(id: string): DemoMembership {
  return { businessId: id, userId: 'demo-user', role: 'TITULAR_ADMINISTRATIVO', status: 'ACTIVA', jobTitle: '' }
}

function defaults(): DemoSnapshot {
  return {
    version: 1,
    profile: { id: 'demo-user', displayName: 'Usuario DEMO', email: '', avatarInitials: '', contactPhone: '' },
    businessesById: Object.fromEntries(fixtures.map((item) => [item.id, item])),
    membershipsByBusinessId: Object.fromEntries(fixtures.map((item) => [item.id, membership(item.id)])),
    locationsById: {},
    teamInvitationsById: {},
    teamMembersById: {},
    catalogItemsById: {},
  }
}

type Stored = { version: 1; profile?: unknown; createdBusinesses?: unknown; fixtureEdits?: unknown; memberJobs?: unknown; locations?: unknown; teamInvitations?: unknown; teamMembers?: unknown; catalogItems?: unknown }

export type EditableBusinessField = 'name' | 'category' | 'description' | 'slogan' | 'taxId'
export type BusinessDetailsPatch = Partial<Pick<DemoBusiness, EditableBusinessField>>

function editableFields(business: DemoBusiness): BusinessDetailsPatch {
  return { name: business.name, category: business.category, description: business.description, slogan: business.slogan, taxId: business.taxId }
}

function cleanEditable(raw: unknown): BusinessDetailsPatch {
  if (!isRecord(raw)) return {}
  const patch: BusinessDetailsPatch = {}
  if (typeof raw.name === 'string' && raw.name.trim().length >= 2 && raw.name.trim().length <= 80) patch.name = raw.name.trim()
  if (typeof raw.category === 'string' && raw.category.length <= 120) patch.category = raw.category.trim() || 'Sin rubro especificado'
  if (typeof raw.description === 'string' && raw.description.length <= 350) patch.description = raw.description.trim()
  if (typeof raw.slogan === 'string' && raw.slogan.length <= 120) patch.slogan = raw.slogan.trim()
  if (typeof raw.taxId === 'string' && raw.taxId.length <= 15 && (/^$|^\d{11}$|^\d{2}-\d{8}-\d$/.test(raw.taxId))) patch.taxId = raw.taxId
  return patch
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function validCreated(value: unknown): value is DemoBusiness {
  if (!isRecord(value)) return false
  return typeof value.id === 'string' && /^demo-business-[a-z0-9-]{16,}$/i.test(value.id)
    && typeof value.name === 'string' && value.name.trim().length >= 2 && value.name.length <= 80
    && typeof value.category === 'string' && value.category.length <= 120
    && typeof value.description === 'string' && value.description.length <= 350
    && ['PRODUCTOS', 'SERVICIOS', 'MIXTO'].includes(String(value.kind))
    && value.source === 'created' && value.founderUserId === 'demo-user'
    && value.administrativeOwnerUserId === 'demo-user'
}

function safeLoadedMapLink(input: string): string {
  try {
    return validateGoogleMapsLink(input)
  } catch {
    // Un enlace inválido no debe borrar los datos restantes de una ubicación.
    return ''
  }
}

function validLocation(raw: unknown): raw is DemoLocation {
  if (!isRecord(raw)) return false
  return typeof raw.id === 'string' && /^demo-location-[a-f0-9-]{36}$/.test(raw.id)
    && typeof raw.businessId === 'string'
    && typeof raw.name === 'string' && raw.name.trim().length >= 2 && raw.name.length <= 80
    && ['LOCAL', 'FERIA', 'DEPOSITO', 'OFICINA', 'OTRO'].includes(String(raw.kind))
    && typeof raw.address === 'string' && raw.address.length <= 160
    && typeof raw.canSell === 'boolean' && typeof raw.canStore === 'boolean'
    && typeof raw.isPrimary === 'boolean'
    && ['ACTIVA', 'PAUSADA'].includes(String(raw.status))
}

function normalizeLocationInput(input: LocationInput): LocationInput {
  const name = requiredText(input.name, 'El nombre de la ubicación', 2, 80)
  const address = input.address.trim()
  const mapUrl = validateGoogleMapsLink(input.mapUrl)
  if (address.length > 160) throw new Error('La referencia de ubicación admite hasta 160 caracteres.')
  if (!['LOCAL', 'FERIA', 'DEPOSITO', 'OFICINA', 'OTRO'].includes(input.kind)) {
    throw new Error('Tipo de ubicación inválido.')
  }
  if (typeof input.canSell !== 'boolean' || typeof input.canStore !== 'boolean') {
    throw new Error('Las capacidades de venta y almacenamiento deben ser explícitas.')
  }
  return { name, kind: input.kind, address, mapUrl, canSell: input.canSell, canStore: input.canStore }
}

export function listDemoLocations(snapshot: DemoSnapshot, businessId: string): DemoLocation[] {
  if (!findDemoBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.locationsById)
    .filter((location) => location.businessId === businessId)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name, 'es'))
}

function activeBusiness(businessId: string): void {
  if (!findDemoBusiness(state, businessId)) throw new Error('La empresa DEMO no está disponible.')
}

function locationOfBusiness(businessId: string, locationId: string): DemoLocation {
  activeBusiness(businessId)
  const location = state.locationsById[locationId]
  if (!location || location.businessId !== businessId) throw new Error('Ubicación no disponible para esta empresa.')
  return location
}

function validInvitation(raw: unknown): raw is DemoInvitation {
  if (!isRecord(raw)) return false
  return typeof raw.id === 'string' && /^demo-invite-[0-9a-f-]{36}$/.test(raw.id)
    && typeof raw.businessId === 'string'
    && typeof raw.email === 'string' && raw.email.length <= 120
    && typeof raw.role === 'string' && ['ENCARGADO', 'TRABAJADOR'].includes(raw.role)
    && typeof raw.status === 'string' && ['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA'].includes(raw.status)
    && typeof raw.createdAt === 'string' && Number.isFinite(Date.parse(raw.createdAt))
    && typeof raw.expiresAt === 'string' && Number.isFinite(Date.parse(raw.expiresAt))
    && (raw.memberId === undefined || (typeof raw.memberId === 'string' && /^demo-team-[0-9a-f-]{36}$/.test(raw.memberId)))
}

function validTeamMember(raw: unknown): raw is DemoTeamMember {
  if (!isRecord(raw)) return false
  return typeof raw.id === 'string' && /^demo-team-[0-9a-f-]{36}$/.test(raw.id)
    && typeof raw.businessId === 'string'
    && typeof raw.email === 'string' && raw.email.length <= 120
    && typeof raw.role === 'string' && ['ENCARGADO', 'TRABAJADOR'].includes(raw.role)
    && raw.status === 'ACTIVA'
    && typeof raw.joinedAt === 'string' && Number.isFinite(Date.parse(raw.joinedAt))
    && typeof raw.sourceInvitationId === 'string'
}

export function listDemoInvitations(snapshot: DemoSnapshot, businessId: string): DemoInvitation[] {
  if (!findDemoBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.teamInvitationsById)
    .filter((invite) => invite.businessId === businessId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listDemoCatalog(snapshot: DemoSnapshot, businessId: string): DemoCatalogItem[] {
  if (!findDemoBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.catalogItemsById)
    .filter((item) => item.businessId === businessId)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

function catalogItemOfBusiness(businessId: string, itemId: string): DemoCatalogItem {
  activeBusiness(businessId)
  const item = state.catalogItemsById[itemId]
  if (!item || item.businessId !== businessId) throw new Error('Artículo no disponible para esta empresa DEMO.')
  return item
}

function catalogUniqueness(businessId: string, input: CatalogInput, excludeItemId?: string) {
  const otherItems = Object.values(state.catalogItemsById)
    .filter((item) => item.businessId === businessId && item.id !== excludeItemId)
  if (otherItems.some((item) => catalogNameKey(item.name) === catalogNameKey(input.name))) {
    throw new Error('Esta empresa ya tiene un artículo o servicio con el mismo nombre, incluso si está inactivo.')
  }
  if (input.sku && otherItems.some((item) => item.sku === input.sku)) {
    throw new Error('Ese SKU ya está utilizado dentro de esta empresa.')
  }
}

function validCatalogItem(raw: unknown): raw is DemoCatalogItem {
  if (!isRecord(raw)) return false
  return typeof raw.id === 'string' && /^demo-catalog-[a-f0-9-]{36}$/.test(raw.id)
    && typeof raw.businessId === 'string'
    && typeof raw.name === 'string' && typeof raw.category === 'string'
    && typeof raw.kind === 'string' && typeof raw.unit === 'string'
    && typeof raw.sku === 'string' && typeof raw.description === 'string'
    && typeof raw.sellable === 'boolean'
    && (raw.priceCents === null || typeof raw.priceCents === 'number')
    && (raw.referenceCostCents === null || typeof raw.referenceCostCents === 'number')
    && (raw.status === 'ACTIVO' || raw.status === 'INACTIVO')
    && typeof raw.createdAt === 'string' && Number.isFinite(Date.parse(raw.createdAt))
    && typeof raw.updatedAt === 'string' && Number.isFinite(Date.parse(raw.updatedAt))
}

export function listDemoTeamMembers(snapshot: DemoSnapshot, businessId: string): DemoTeamMember[] {
  if (!findDemoBusiness(snapshot, businessId)) return []
  return Object.values(snapshot.teamMembersById)
    .filter((member) => member.businessId === businessId && member.status === 'ACTIVA')
    .sort((a, b) => a.email.localeCompare(b.email))
}

function invitationInBusiness(businessId: string, invitationId: string): DemoInvitation {
  activeBusiness(businessId)
  const found = state.teamInvitationsById[invitationId]
  if (!found || found.businessId !== businessId) throw new Error('Invitación DEMO no disponible para esta empresa.')
  return found
}

function load(): DemoSnapshot {
  const state = defaults()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return state
    const stored: unknown = JSON.parse(raw)
    if (!isRecord(stored) || stored.version !== 1) return state
    const data = stored as Stored
    if (isRecord(data.profile) && typeof data.profile.displayName === 'string' && data.profile.displayName.trim().length >= 2 && data.profile.displayName.length <= 70) {
      state.profile = {
        id: 'demo-user',
        displayName: data.profile.displayName.trim(),
        email: typeof data.profile.email === 'string' && data.profile.email.length <= 120 ? data.profile.email : '',
        avatarInitials: typeof data.profile.avatarInitials === 'string' && /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{0,4}$/.test(data.profile.avatarInitials.trim()) ? data.profile.avatarInitials.trim().toUpperCase() : '',
        contactPhone: typeof data.profile.contactPhone === 'string' && data.profile.contactPhone.length <= 30 && /^[+()\d\s.-]*$/.test(data.profile.contactPhone) ? data.profile.contactPhone.trim() : '',
      }
    }
    if (Array.isArray(data.createdBusinesses)) {
      for (const rawBusiness of data.createdBusinesses.slice(0, 50)) {
        if (!validCreated(rawBusiness)) continue
        const item: DemoBusiness = {
          id: rawBusiness.id,
          name: rawBusiness.name.trim(),
          category: rawBusiness.category.trim() || 'Sin rubro especificado',
          description: rawBusiness.description.trim(),
          slogan: typeof rawBusiness.slogan === 'string' && rawBusiness.slogan.length <= 120 ? rawBusiness.slogan.trim() : '',
          taxId: typeof rawBusiness.taxId === 'string' && rawBusiness.taxId.length <= 15 && (/^$|^\d{11}$|^\d{2}-\d{8}-\d$/.test(rawBusiness.taxId)) ? rawBusiness.taxId : '',
          kind: rawBusiness.kind,
          initials: rawBusiness.name.trim().slice(0, 1).toUpperCase(),
          accent: 'blue',
          source: 'created',
          founderUserId: 'demo-user',
          administrativeOwnerUserId: 'demo-user',
        }
        state.businessesById[item.id] = item
        state.membershipsByBusinessId[item.id] = membership(item.id)
      }
    }
    // Compatible con la versión E1-A2: el nuevo campo fixtureEdits es opcional.
    if (isRecord(data.fixtureEdits)) {
      for (const item of fixtures) {
        const updated = { ...state.businessesById[item.id], ...cleanEditable(data.fixtureEdits[item.id]) }
        state.businessesById[item.id] = { ...updated, initials: updated.name.slice(0, 1).toUpperCase() }
      }
    }
    // Puesto laboral se asocia a la membresía por empresa, nunca al perfil global.
    if (isRecord(data.memberJobs)) {
      for (const [id, jobTitle] of Object.entries(data.memberJobs)) {
        const existing = state.membershipsByBusinessId[id]
        if (existing && typeof jobTitle === 'string' && jobTitle.length <= 80) {
          state.membershipsByBusinessId[id] = { ...existing, jobTitle: jobTitle.trim() }
        }
      }
    }
    if (Array.isArray(data.locations)) {
      const countByBusiness = new Map<string, number>()
      const primaryByBusiness = new Set<string>()
      for (const rawLocation of data.locations.slice(0, 2000)) {
        if (!validLocation(rawLocation) || !state.businessesById[rawLocation.businessId]) continue
        if ((countByBusiness.get(rawLocation.businessId) ?? 0) >= 100) continue
        if (state.locationsById[rawLocation.id]) continue
        const isPrimary = rawLocation.status === 'ACTIVA' && rawLocation.isPrimary && !primaryByBusiness.has(rawLocation.businessId)
        if (isPrimary) primaryByBusiness.add(rawLocation.businessId)
        state.locationsById[rawLocation.id] = {
          id: rawLocation.id, businessId: rawLocation.businessId,
          name: rawLocation.name.trim(), kind: rawLocation.kind, address: rawLocation.address.trim(),
          mapUrl: typeof rawLocation.mapUrl === 'string' ? safeLoadedMapLink(rawLocation.mapUrl) : '',
          canSell: rawLocation.canSell, canStore: rawLocation.canStore,
          status: rawLocation.status, isPrimary,
        }
        countByBusiness.set(rawLocation.businessId, (countByBusiness.get(rawLocation.businessId) ?? 0) + 1)
      }
    }
    // Listas opcionales: compatibilidad con E1-A2, Datos Empresa, Perfil y Ubicaciones.
    if (Array.isArray(data.teamInvitations)) {
      const counts = new Map<string, number>()
      for (const rawInvitation of data.teamInvitations.slice(0, 5000)) {
        if (!validInvitation(rawInvitation) || !state.businessesById[rawInvitation.businessId]) continue
        if ((counts.get(rawInvitation.businessId) ?? 0) >= 100) continue
        const email = rawInvitation.email.trim().toLowerCase()
        try {
          normalizeInviteInput(email, rawInvitation.role)
        } catch {
          continue
        }
        if (state.teamInvitationsById[rawInvitation.id]) continue
        state.teamInvitationsById[rawInvitation.id] = {
          id: rawInvitation.id, businessId: rawInvitation.businessId, email,
          role: rawInvitation.role, status: rawInvitation.status,
          createdAt: rawInvitation.createdAt, expiresAt: rawInvitation.expiresAt,
          memberId: rawInvitation.memberId,
        }
        counts.set(rawInvitation.businessId, (counts.get(rawInvitation.businessId) ?? 0) + 1)
      }
    }
    if (Array.isArray(data.teamMembers)) {
      const counts = new Map<string, number>()
      for (const rawMember of data.teamMembers.slice(0, 5000)) {
        if (!validTeamMember(rawMember) || !state.businessesById[rawMember.businessId]) continue
        if ((counts.get(rawMember.businessId) ?? 0) >= 50) continue
        if (state.teamMembersById[rawMember.id]) continue
        const invitation = state.teamInvitationsById[rawMember.sourceInvitationId]
        if (!invitation || invitation.businessId !== rawMember.businessId
          || invitation.status !== 'ACEPTADA' || invitation.memberId !== rawMember.id) continue
        if (invitation.email !== rawMember.email || invitation.role !== rawMember.role) continue
        if (Object.values(state.teamMembersById).some((existing) => existing.businessId === rawMember.businessId && existing.email === rawMember.email)) continue
        state.teamMembersById[rawMember.id] = {
          id: rawMember.id, businessId: rawMember.businessId, email: rawMember.email,
          role: rawMember.role, status: 'ACTIVA',
          joinedAt: rawMember.joinedAt, sourceInvitationId: rawMember.sourceInvitationId,
        }
        counts.set(rawMember.businessId, (counts.get(rawMember.businessId) ?? 0) + 1)
      }
    }
    // Los artículos del catálogo son opcionales y no introducen stock ni ubicaciones implícitas.
    if (Array.isArray(data.catalogItems)) {
      const countByBusiness = new Map<string, number>()
      for (const rawItem of data.catalogItems.slice(0, 10000)) {
        if (!validCatalogItem(rawItem) || !state.businessesById[rawItem.businessId]) continue
        if (state.catalogItemsById[rawItem.id]) continue
        if ((countByBusiness.get(rawItem.businessId) ?? 0) >= 500) continue
        try {
          const fields = normalizeCatalogInput(rawItem)
          const existing = Object.values(state.catalogItemsById).filter((item) => item.businessId === rawItem.businessId)
          if (existing.some((item) => catalogNameKey(item.name) === catalogNameKey(fields.name)
              || (fields.sku && item.sku === fields.sku))) continue
          const clean: DemoCatalogItem = {
            ...fields, id: rawItem.id, businessId: rawItem.businessId, status: rawItem.status,
            createdAt: rawItem.createdAt, updatedAt: rawItem.updatedAt,
          }
          state.catalogItemsById[clean.id] = clean
          countByBusiness.set(clean.businessId, (countByBusiness.get(clean.businessId) ?? 0) + 1)
        } catch {
          // Un registro inválido no debe eliminar los demás datos previos.
        }
      }
    }
  } catch {
    // Datos corruptos o almacenamiento bloqueado: mostrar fixtures conocidos.
  }
  return state
}

let state = load()
const listeners = new Set<() => void>()
function notify(next: DemoSnapshot) {
  state = next
  try {
    const saved: Stored = {
      version: 1,
      profile: state.profile,
      createdBusinesses: Object.values(state.businessesById).filter((b) => b.source === 'created'),
      fixtureEdits: Object.fromEntries(fixtures.map((item) => [item.id, editableFields(state.businessesById[item.id])])),
      memberJobs: Object.fromEntries(Object.entries(state.membershipsByBusinessId).map(([id, membership]) => [id, membership.jobTitle])),
      locations: Object.values(state.locationsById),
      teamInvitations: Object.values(state.teamInvitationsById),
      teamMembers: Object.values(state.teamMembersById),
      catalogItems: Object.values(state.catalogItemsById),
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  } catch {
    // Sigue funcionando en memoria si el navegador no permite persistir.
  }
  listeners.forEach((fn) => fn())
}

export const demoStore = {
  getSnapshot: (): DemoSnapshot => state,
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useDemoSnapshot(): DemoSnapshot {
  return useSyncExternalStore(demoStore.subscribe, demoStore.getSnapshot)
}

export function listDemoBusinesses(snapshot: DemoSnapshot): DemoBusiness[] {
  return Object.values(snapshot.businessesById).filter((item) => snapshot.membershipsByBusinessId[item.id]?.status === 'ACTIVA')
}

export function findDemoBusiness(snapshot: DemoSnapshot, id: string): DemoBusiness | undefined {
  if (snapshot.membershipsByBusinessId[id]?.status !== 'ACTIVA') return undefined
  return snapshot.businessesById[id]
}

export type BusinessInput = { name: string; category: string; kind: BusinessKind; description: string }
export type ProfileInput = { displayName: string; email: string; avatarInitials: string; contactPhone: string }
function requiredText(value: string, label: string, min: number, max: number): string {
  const clean = value.trim()
  if (clean.length < min || clean.length > max) throw new Error(label + ' debe tener entre ' + min + ' y ' + max + ' caracteres.')
  return clean
}

export const demoGateway = {
  async createCatalogItem(businessId: string, input: CatalogInput): Promise<DemoCatalogItem> {
    activeBusiness(businessId)
    if (listDemoCatalog(state, businessId).length >= 500) {
      throw new Error('La DEMO admite hasta 500 artículos por empresa.')
    }
    const fields = normalizeCatalogInput(input)
    catalogUniqueness(businessId, fields)
    const now = new Date().toISOString()
    const item: DemoCatalogItem = {
      ...fields, id: 'demo-catalog-' + crypto.randomUUID(), businessId,
      status: 'ACTIVO', createdAt: now, updatedAt: now,
    }
    notify({ ...state, catalogItemsById: { ...state.catalogItemsById, [item.id]: item } })
    return item
  },

  async updateCatalogItem(businessId: string, itemId: string, input: CatalogInput): Promise<DemoCatalogItem> {
    const current = catalogItemOfBusiness(businessId, itemId)
    const fields = normalizeCatalogInput(input)
    catalogUniqueness(businessId, fields, itemId)
    const updated: DemoCatalogItem = { ...current, ...fields, updatedAt: new Date().toISOString() }
    notify({ ...state, catalogItemsById: { ...state.catalogItemsById, [itemId]: updated } })
    return updated
  },

  async setCatalogItemStatus(businessId: string, itemId: string, status: DemoCatalogItem['status']): Promise<DemoCatalogItem> {
    const current = catalogItemOfBusiness(businessId, itemId)
    if (status !== 'ACTIVO' && status !== 'INACTIVO') throw new Error('Estado inválido.')
    if (current.status === status) return current
    const updated: DemoCatalogItem = { ...current, status, updatedAt: new Date().toISOString() }
    notify({ ...state, catalogItemsById: { ...state.catalogItemsById, [itemId]: updated } })
    return updated
  },

  async createInvitation(businessId: string, emailInput: string, role: InviteRole): Promise<DemoInvitation> {
    activeBusiness(businessId)
    const { email } = normalizeInviteInput(emailInput, role)
    if (state.profile.email && email === state.profile.email.trim().toLowerCase()) {
      throw new Error('No podés invitar a tu mismo perfil DEMO.')
    }
    if (Object.values(state.teamMembersById).some((item) => item.businessId === businessId && item.email === email && item.status === 'ACTIVA')) {
      throw new Error('Ya existe una membresía DEMO activa para ese correo dentro de esta empresa.')
    }
    const existing = Object.values(state.teamInvitationsById).filter((item) => item.businessId === businessId)
    if (existing.length >= 100) throw new Error('La DEMO permite hasta 100 invitaciones históricas por empresa.')
    if (existing.some((item) => item.email === email && displayInvitationStatus(item) === 'PENDIENTE')) {
      throw new Error('Ya hay una invitación pendiente para ese correo en esta empresa.')
    }
    const createdAt = new Date().toISOString()
    const invitation: DemoInvitation = {
      id: 'demo-invite-' + crypto.randomUUID(), businessId, email, role, status: 'PENDIENTE',
      createdAt, expiresAt: invitationExpiresAt(createdAt),
    }
    notify({ ...state, teamInvitationsById: { ...state.teamInvitationsById, [invitation.id]: invitation } })
    return invitation
  },

  async cancelInvitation(businessId: string, invitationId: string): Promise<DemoInvitation> {
    const current = invitationInBusiness(businessId, invitationId)
    if (current.status === 'CANCELADA') return current
    if (!canReplyToInvitation(current)) throw new Error('Sólo puede cancelarse una invitación pendiente y vigente.')
    const updated: DemoInvitation = { ...current, status: 'CANCELADA' }
    notify({ ...state, teamInvitationsById: { ...state.teamInvitationsById, [invitationId]: updated } })
    return updated
  },

  async simulateInvitationResponse(businessId: string, invitationId: string, action: 'ACEPTAR' | 'RECHAZAR'): Promise<DemoInvitation> {
    const invitation = invitationInBusiness(businessId, invitationId)
    if (action !== 'ACEPTAR' && action !== 'RECHAZAR') throw new Error('Respuesta DEMO inválida.')
    if (invitation.status === 'ACEPTADA' && action === 'ACEPTAR' && invitation.memberId && state.teamMembersById[invitation.memberId]) {
      return invitation // doble click/reintento no duplica integrante
    }
    if (!canReplyToInvitation(invitation)) throw new Error('La invitación no está pendiente o ya venció.')
    if (action === 'RECHAZAR') {
      const rejected: DemoInvitation = { ...invitation, status: 'RECHAZADA' }
      notify({ ...state, teamInvitationsById: { ...state.teamInvitationsById, [invitationId]: rejected } })
      return rejected
    }
    if (Object.values(state.teamMembersById).some((item) => item.businessId === businessId && item.email === invitation.email)) {
      throw new Error('Ese correo ya tiene un integrante DEMO en esta empresa.')
    }
    if (listDemoTeamMembers(state, businessId).length >= 50) throw new Error('La DEMO admite hasta 50 integrantes invitados por empresa.')
    const member: DemoTeamMember = {
      id: 'demo-team-' + crypto.randomUUID(), businessId, email: invitation.email,
      role: invitation.role, status: 'ACTIVA', joinedAt: new Date().toISOString(),
      sourceInvitationId: invitation.id,
    }
    const accepted: DemoInvitation = { ...invitation, status: 'ACEPTADA', memberId: member.id }
    // Una única actualización local representa invitación ACEPTADA + nueva membresía.
    notify({
      ...state,
      teamInvitationsById: { ...state.teamInvitationsById, [invitation.id]: accepted },
      teamMembersById: { ...state.teamMembersById, [member.id]: member },
    })
    return accepted
  },

  async createLocation(businessId: string, input: LocationInput): Promise<DemoLocation> {
    activeBusiness(businessId)
    const current = Object.values(state.locationsById).filter((location) => location.businessId === businessId)
    if (current.length >= 100) throw new Error('El prototipo admite hasta 100 ubicaciones por empresa.')
    const fields = normalizeLocationInput(input)
    const location: DemoLocation = {
      ...fields, id: 'demo-location-' + crypto.randomUUID(), businessId,
      status: 'ACTIVA', isPrimary: !current.some((item) => item.isPrimary && item.status === 'ACTIVA'),
    }
    notify({ ...state, locationsById: { ...state.locationsById, [location.id]: location } })
    return location
  },

  async updateLocation(businessId: string, locationId: string, input: LocationInput): Promise<DemoLocation> {
    const previous = locationOfBusiness(businessId, locationId)
    const fields = normalizeLocationInput(input)
    const updated: DemoLocation = { ...previous, ...fields }
    notify({ ...state, locationsById: { ...state.locationsById, [locationId]: updated } })
    return updated
  },

  async setPrimaryLocation(businessId: string, locationId: string): Promise<DemoLocation> {
    const location = locationOfBusiness(businessId, locationId)
    if (location.status !== 'ACTIVA') throw new Error('Sólo una ubicación activa puede ser principal.')
    const locationsById = { ...state.locationsById }
    for (const item of Object.values(state.locationsById)) {
      if (item.businessId === businessId && item.isPrimary) locationsById[item.id] = { ...item, isPrimary: false }
    }
    locationsById[locationId] = { ...location, isPrimary: true }
    notify({ ...state, locationsById })
    return locationsById[locationId]
  },

  async setLocationStatus(businessId: string, locationId: string, status: DemoLocation['status']): Promise<DemoLocation> {
    const previous = locationOfBusiness(businessId, locationId)
    if (!['ACTIVA', 'PAUSADA'].includes(status)) throw new Error('Estado de ubicación inválido.')
    if (previous.status === status) return previous
    const updated: DemoLocation = { ...previous, status, isPrimary: status === 'PAUSADA' ? false : previous.isPrimary }
    notify({ ...state, locationsById: { ...state.locationsById, [locationId]: updated } })
    return updated
  },

  async saveProfile(input: ProfileInput): Promise<DemoProfile> {
    const displayName = requiredText(input.displayName, 'El nombre visible', 2, 70)
    const email = input.email.trim()
    if (email.length > 120 || (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      throw new Error('Ingresá un correo válido o dejá el campo vacío.')
    }
    const avatarInitials = input.avatarInitials.trim().toUpperCase()
    if (!/^[A-ZÁÉÍÓÚÜÑ]{0,4}$/.test(avatarInitials)) {
      throw new Error('Las iniciales pueden contener hasta 4 letras, sin números ni símbolos.')
    }
    const contactPhone = input.contactPhone.trim()
    if (contactPhone.length > 30 || !/^[+()\d\s.-]*$/.test(contactPhone)) {
      throw new Error('El contacto debe usar números y signos telefónicos, con hasta 30 caracteres.')
    }
    const profile: DemoProfile = { id: 'demo-user', displayName, email, avatarInitials, contactPhone }
    notify({ ...state, profile })
    return profile
  },

  async createBusiness(input: BusinessInput): Promise<DemoBusiness> {
    const name = requiredText(input.name, 'El nombre de la empresa', 2, 80)
    const category = input.category.trim()
    const description = input.description.trim()
    if (category.length > 120) throw new Error('El rubro puede tener hasta 120 caracteres.')
    if (description.length > 350) throw new Error('La descripción puede tener hasta 350 caracteres.')
    if (!['PRODUCTOS', 'SERVICIOS', 'MIXTO'].includes(input.kind)) throw new Error('Seleccioná un tipo de actividad válido.')
    if (Object.keys(state.businessesById).length >= 53) throw new Error('La demostración admite hasta 50 empresas nuevas.')
    const id = 'demo-business-' + crypto.randomUUID()
    const business: DemoBusiness = {
      id, name, category: category || 'Sin rubro especificado',
      kind: input.kind, description, slogan: '', taxId: '', initials: name.slice(0, 1).toUpperCase(),
      accent: 'blue', source: 'created',
      founderUserId: 'demo-user', administrativeOwnerUserId: 'demo-user',
    }
    notify({
      ...state,
      businessesById: { ...state.businessesById, [id]: business },
      membershipsByBusinessId: { ...state.membershipsByBusinessId, [id]: membership(id) },
    })
    return business
  },

  async saveMemberJobTitle(businessId: string, jobTitle: string): Promise<DemoMembership> {
    const current = state.membershipsByBusinessId[businessId]
    if (!current || current.status !== 'ACTIVA' || !state.businessesById[businessId]) {
      throw new Error('Membresía DEMO no disponible para esta empresa.')
    }
    const title = jobTitle.trim()
    if (title.length > 80) throw new Error('La función laboral admite hasta 80 caracteres.')
    const updated = { ...current, jobTitle: title }
    notify({
      ...state,
      membershipsByBusinessId: { ...state.membershipsByBusinessId, [businessId]: updated },
    })
    return updated
  },

  /** Edita exclusivamente los campos comerciales de la empresa solicitada. */
  async updateBusinessDetails(businessId: string, patch: BusinessDetailsPatch): Promise<DemoBusiness> {
    const current = findDemoBusiness(state, businessId)
    if (!current) throw new Error('Empresa DEMO no disponible.')
    if (Object.keys(patch).some((key) => !['name', 'category', 'description', 'slogan', 'taxId'].includes(key))) {
      throw new Error('Campo de empresa no permitido.')
    }
    const name = patch.name === undefined ? current.name : requiredText(patch.name, 'El nombre comercial', 2, 80)
    const category = patch.category === undefined ? current.category : patch.category.trim() || 'Sin rubro especificado'
    const description = patch.description === undefined ? current.description : patch.description.trim()
    const slogan = patch.slogan === undefined ? current.slogan : patch.slogan.trim()
    const taxId = patch.taxId === undefined ? current.taxId : patch.taxId.trim()
    if (category.length > 120) throw new Error('El rubro admite hasta 120 caracteres.')
    if (description.length > 350) throw new Error('La descripción admite hasta 350 caracteres.')
    if (slogan.length > 120) throw new Error('El eslogan admite hasta 120 caracteres.')
    if (taxId.length > 0 && !/^\d{11}$|^\d{2}-\d{8}-\d$/.test(taxId)) {
      throw new Error('El CUIT de prueba debe tener 11 dígitos, con guiones opcionales.')
    }
    const updated: DemoBusiness = { ...current, name, category, description, slogan, taxId, initials: name.slice(0, 1).toUpperCase() }
    notify({ ...state, businessesById: { ...state.businessesById, [businessId]: updated } })
    return updated
  },
}
