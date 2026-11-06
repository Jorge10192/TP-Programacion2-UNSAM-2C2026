/**
 * Preferencia exclusivamente visual, compartida entre todas las empresas.
 * No constituye autenticación ni estado de negocio.
 * El modo inicial del nuevo menú hamburguesa es oculto; el usuario puede fijarlo.
 */
export type SidebarMode = 'expanded' | 'compact' | 'hidden'

const STORAGE_KEY = 'asistente-pyme.sidebar-mode.v2'

export function loadSidebarMode(): SidebarMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'expanded' || stored === 'compact' || stored === 'hidden') return stored
  } catch {
    // Navegación privada o storage deshabilitado: usar el valor predeterminado.
  }
  return 'hidden'
}

export function saveSidebarMode(mode: SidebarMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // El menú funciona durante la sesión aunque no pueda persistirse.
  }
}
