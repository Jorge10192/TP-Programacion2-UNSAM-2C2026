/**
 * Única fuente DEMO del perfil global y las empresas.
 * localStorage es almacenamiento del prototipo, NO autenticación ni aislamiento seguro.
 * No usar datos comerciales o personales verdaderos.
 */
import { useSyncExternalStore } from 'react'

export type BusinessKind = 'PRODUCTOS' | 'SERVICIOS' | 'MIXTO'
export type Accent = 'mint' | 'blue' | 'violet'
export type DemoProfile = { id: 'demo-user'; displayName: string; email: string }
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
}
export type DemoSnapshot = {
  version: 1
  profile: DemoProfile
  businessesById: Record<string, DemoBusiness>
  membershipsByBusinessId: Record<string, DemoMembership>
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
  return { businessId: id, userId: 'demo-user', role: 'TITULAR_ADMINISTRATIVO', status: 'ACTIVA' }
}

function defaults(): DemoSnapshot {
  return {
    version: 1,
    profile: { id: 'demo-user', displayName: 'Usuario DEMO', email: '' },
    businessesById: Object.fromEntries(fixtures.map((item) => [item.id, item])),
    membershipsByBusinessId: Object.fromEntries(fixtures.map((item) => [item.id, membership(item.id)])),
  }
}

type Stored = { version: 1; profile?: unknown; createdBusinesses?: unknown; fixtureEdits?: unknown }

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
export type ProfileInput = { displayName: string; email: string }
function requiredText(value: string, label: string, min: number, max: number): string {
  const clean = value.trim()
  if (clean.length < min || clean.length > max) throw new Error(label + ' debe tener entre ' + min + ' y ' + max + ' caracteres.')
  return clean
}

export const demoGateway = {
  async saveProfile(input: ProfileInput): Promise<DemoProfile> {
    const displayName = requiredText(input.displayName, 'El nombre visible', 2, 70)
    const email = input.email.trim()
    if (email.length > 120 || (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      throw new Error('Ingresá un correo válido o dejá el campo vacío.')
    }
    const profile: DemoProfile = { id: 'demo-user', displayName, email }
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
