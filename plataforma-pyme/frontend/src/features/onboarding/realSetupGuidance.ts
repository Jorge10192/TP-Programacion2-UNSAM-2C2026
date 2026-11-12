import type { RealBusinessSection } from '../auth/realWorkspaceNavigation.ts'

/** H3: solely UI explanations. A suggestion never means authorization to write. */
export type RealSetupSuggestion = {
  id: 'locations-empty' | 'locations-paused' | 'team-solo' | 'catalog-empty'
    | 'inventory-locations' | 'inventory-catalog' | 'inventory-services' | 'inventory-no-balances'
  title: string
  detail: string
  route: RealBusinessSection
  actionLabel: string
}

export function locationSetupSuggestion(input: {
  verified: boolean; count: number; activeCount: number; canManage: boolean
}): RealSetupSuggestion | null {
  if (!input.verified) return null
  if (input.count === 0) return {
    id: 'locations-empty',
    title: 'Primero, definí dónde trabaja tu empresa',
    detail: input.canManage
      ? 'La sede puede ser un local, una feria, una oficina o un depósito. Usá «Crear ubicación real» y elegí si admite ventas, almacenamiento o ambos.'
      : 'No hay sedes registradas en la consulta. Una persona autorizada debe crearlas; tu rol no habilita esa operación.',
    route: 'inicio', actionLabel: 'Volver a primeros pasos',
  }
  if (input.activeCount === 0) return {
    id: 'locations-paused',
    title: 'Las ubicaciones consultadas están pausadas',
    detail: input.canManage
      ? 'Para preparar la primera sede, revisá cuál corresponde reactivar desde el listado. Reactivar es una operación explícita.'
      : 'La activación depende de alguien con permisos para administrar ubicaciones.',
    route: 'inicio', actionLabel: 'Volver a primeros pasos',
  }
  return null
}

export function teamSetupSuggestion(input: {
  verified: boolean; canRead: boolean; onlySelf: boolean; canInvite: boolean
}): RealSetupSuggestion | null {
  if (!input.verified || !input.canRead || !input.onlySelf) return null
  return {
    id: 'team-solo',
    title: 'Podés empezar trabajando por tu cuenta',
    detail: input.canInvite
      ? 'Invitar colaboradores es opcional. Cuando los necesites, emití un código desde el formulario de esta página; cada persona usará su propia cuenta.'
      : 'Incorporar colaboradores es opcional. Para emitir invitaciones necesitás que una persona con permisos administrativos las gestione.',
    route: 'inicio', actionLabel: 'Revisar primeros pasos',
  }
}

export function catalogSetupSuggestion(input: {
  verified: boolean; count: number; canWrite: boolean
}): RealSetupSuggestion | null {
  if (!input.verified || input.count !== 0) return null
  return {
    id: 'catalog-empty',
    title: 'Registrá lo que ofrecés',
    detail: input.canWrite
      ? 'Usá «Crear artículo REAL» para cargar un producto, insumo o servicio. Los servicios no necesitan stock; los bienes físicos se controlan después desde Inventario.'
      : 'Todavía no hay fichas en el catálogo consultado. Podés verlas, pero una persona autorizada debe crearlas.',
    route: 'inicio', actionLabel: 'Revisar primeros pasos',
  }
}

export function inventorySetupSuggestion(input: {
  verified: boolean
  locationsCount: number
  catalogCount: number
  catalogComplete: boolean
  physicalCount: number
  balancesLoaded: boolean
  balancesCount: number
  unfiltered: boolean
}): RealSetupSuggestion | null {
  if (!input.verified) return null
  if (input.locationsCount === 0) return {
    id: 'inventory-locations',
    title: 'Primero necesitás una ubicación',
    detail: 'Las existencias físicas se controlan por sede. Revisá Ubicaciones y habilitá almacenamiento cuando corresponda.',
    route: 'ubicaciones', actionLabel: 'Ir a Ubicaciones',
  }
  if (input.catalogComplete && input.catalogCount === 0) return {
    id: 'inventory-catalog',
    title: 'Primero cargá artículos físicos en el catálogo',
    detail: 'Inventario registra existencias de bienes físicos, no crea fichas de artículos. Podés empezar desde Catálogo.',
    route: 'catalogo', actionLabel: 'Ir a Catálogo',
  }
  if (input.catalogComplete && input.catalogCount > 0 && input.physicalCount === 0) return {
    id: 'inventory-services',
    title: 'Los servicios no requieren inventario físico',
    detail: 'El catálogo consultado contiene únicamente servicios. No cargues stock inicial para ellos. Podés gestionarlos desde Catálogo.',
    route: 'catalogo', actionLabel: 'Revisar Catálogo',
  }
  if (input.balancesLoaded && input.unfiltered && input.balancesCount === 0
    && input.catalogComplete && input.physicalCount > 0) return {
    id: 'inventory-no-balances',
    title: 'Todavía no hay saldos en la consulta general',
    detail: 'Si necesitás existencias de bienes físicos, revisá las sedes habilitadas y usá «Stock inicial y ajustes» solo con permisos y datos verificados. No se crea stock automáticamente.',
    route: 'inicio', actionLabel: 'Revisar primeros pasos',
  }
  return null
}
