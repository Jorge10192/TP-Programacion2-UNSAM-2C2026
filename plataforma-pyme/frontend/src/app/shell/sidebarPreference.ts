/**
 * Preferencia exclusivamente visual, compartida entre todas las empresas.
 * No constituye autenticación ni estado de negocio.
 * Muestra nombres por defecto y conserva la elección compacto/expandido.
 * Las preferencias hidden anteriores vuelven a expanded, sin tocar negocio.
 */
export type SidebarMode = 'expanded' | 'compact'

const STORAGE_KEY = 'asistente-pyme.sidebar-mode.v3'
const LEGACY_STORAGE_KEY = 'asistente-pyme.sidebar-mode.v2'

export function loadSidebarMode(): SidebarMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'expanded' || stored === 'compact') return stored
    if (stored === 'hidden') return 'expanded'
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy === 'compact') return 'compact'
  } catch {
    // Navegación privada o storage deshabilitado: usar el valor predeterminado.
  }
  return 'expanded'
}

export function saveSidebarMode(mode: SidebarMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // El menú funciona durante la sesión aunque no pueda persistirse.
  }
}
