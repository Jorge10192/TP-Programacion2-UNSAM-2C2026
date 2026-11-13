/** E3-1B. Navigation for API-backed screens ONLY; never import demoStore. */
import { UUID_PATTERN } from '../businesses/businessGateway.ts'

export type RealBusinessSection = '' | 'inicio' | 'ubicaciones' | 'equipo' | 'catalogo'
  | 'proveedores' | 'compras' | 'inventario' | 'pos' | 'ventas' | 'medios-de-cobro' | 'cobros-qr'

export type RealWorkspaceItem = {
  section: RealBusinessSection
  label: string
  group: 'Administración' | 'Operaciones'
  icon: 'home' | 'building' | 'pin' | 'users' | 'package' | 'briefcase'
    | 'shopping' | 'boxes' | 'receipt' | 'clock' | 'wallet'
}

export const REAL_WORKSPACE_ITEMS: readonly RealWorkspaceItem[] = [
  { section: 'inicio', label: 'Inicio', group: 'Administración', icon: 'home' },
  { section: '', label: 'Mi empresa', group: 'Administración', icon: 'building' },
  { section: 'ubicaciones', label: 'Ubicaciones', group: 'Administración', icon: 'pin' },
  { section: 'equipo', label: 'Equipo', group: 'Administración', icon: 'users' },
  { section: 'medios-de-cobro', label: 'Medios de cobro', group: 'Administración', icon: 'wallet' },
  { section: 'catalogo', label: 'Catálogo', group: 'Operaciones', icon: 'package' },
  { section: 'proveedores', label: 'Proveedores', group: 'Operaciones', icon: 'briefcase' },
  { section: 'compras', label: 'Compras y recepciones', group: 'Operaciones', icon: 'shopping' },
  { section: 'inventario', label: 'Inventario y movimientos', group: 'Operaciones', icon: 'boxes' },
  { section: 'pos', label: 'Punto de venta', group: 'Operaciones', icon: 'receipt' },
  { section: 'cobros-qr', label: 'Cobros QR', group: 'Operaciones', icon: 'wallet' },
  { section: 'ventas', label: 'Historial de ventas', group: 'Operaciones', icon: 'clock' },
] as const

const VALID_SECTIONS = new Set<string>(REAL_WORKSPACE_ITEMS.map((item) => item.section))

/** Never compose arbitrary tenant routes or expose unimplemented DEMO modules. */
export function realWorkspaceHref(businessId: string, section: RealBusinessSection = ''): string {
  if (!UUID_PATTERN.test(businessId) || !VALID_SECTIONS.has(section)) {
    throw new TypeError('Empresa o pantalla REAL no permitida')
  }
  const base = '/real/empresas/' + businessId
  return section ? base + '/' + section : base
}

/** Return a business only for the routes accepted by RealAuthApp. */
export function realWorkspaceBusinessId(path: string): string | null {
  const qrMatch = /^\/real\/empresas\/([^/]+)\/qr-cobros\/([^/]+)$/.exec(path)
  if (qrMatch && UUID_PATTERN.test(qrMatch[1]) && UUID_PATTERN.test(qrMatch[2]))
    return qrMatch[1]
  const match = /^\/real\/empresas\/([^/]+)(?:\/([a-z-]+))?$/.exec(path)
  if (!match || !UUID_PATTERN.test(match[1]) || !VALID_SECTIONS.has(match[2] ?? '')) return null
  return match[1]
}

export function realWorkspaceTitle(path: string): string {
  if (/^\/real\/empresas\/[^/]+\/qr-cobros\/[^/]+$/.test(path) && realWorkspaceBusinessId(path))
    return 'Cobro QR DEMO'
  if (path === '/real/perfil') return 'Mi perfil'
  if (path === '/real/invitaciones/aceptar') return 'Ingresar código de invitación'
  if (path === '/real/empresas/nueva') return 'Crear empresa'
  if (path === '/real/empresas') return 'Mis empresas'
  const businessId = realWorkspaceBusinessId(path)
  if (businessId) {
    const section = path.slice(realWorkspaceHref(businessId).length).replace(/^\//, '')
    return REAL_WORKSPACE_ITEMS.find((item) => item.section === section)?.label ?? 'Mi empresa'
  }
  return 'Mi espacio de trabajo'
}
