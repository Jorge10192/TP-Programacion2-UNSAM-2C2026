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
  { id: 'walos-demo', name: 'WALOS', category: 'Elaboración de productos', kind: 'PRODUCTOS', description: '', initials: 'W', accent: 'mint', source: 'fixture', founderUserId: 'demo-user', administrativeOwnerUserId: 'demo-user' },
  { id: 'comercio-demo', name: 'Comercio Ejemplo', category: 'Reventa de productos', kind: 'PRODUCTOS', description: '', initials: 'C', accent: 'blue', source: 'fixture', founderUserId: 'demo-user', administrativeOwnerUserId: 'demo-user' },
  { id: 'servicios-demo', name: 'Servicios Ejemplo', category: 'Prestación de servicios', kind: 'SERVICIOS', description: '', initials: 'S', accent: 'violet', source: 'fixture', founderUserId: 'demo-user', administrativeOwnerUserId: 'demo-user' },
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

type Stored = { version: 1; profile?: unknown; createdBusinesses?: unknown }
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
      kind: input.kind, description, initials: name.slice(0, 1).toUpperCase(),
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
}
