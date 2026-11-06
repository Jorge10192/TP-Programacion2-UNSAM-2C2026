import { AppLink } from '../AppLink'
import { Icon } from '../Icon'
import { businessHref, demoBusinesses } from '../navigation'
import type { DemoBusiness } from '../navigation'
import type { Navigate } from '../types'
import type { SidebarMode } from './sidebarPreference'

export function Topbar({
  business,
  title,
  navigate,
  sidebarMode,
  mobileMenuOpen,
  onToggleSidebar,
  onHideSidebar,
  onToggleMobileMenu,
}: {
  business: DemoBusiness | undefined
  title: string
  navigate: Navigate
  sidebarMode: SidebarMode
  mobileMenuOpen: boolean
  onToggleSidebar: () => void
  onHideSidebar: () => void
  onToggleMobileMenu: () => void
}) {
  const sidebarAction = sidebarMode === 'expanded'
    ? 'Contraer menú a íconos'
    : sidebarMode === 'compact'
      ? 'Expandir menú lateral'
      : 'Mostrar menú lateral'

  return <header className="topbar">
    <div className="topbar-left">
      <div className="sidebar-actions">
        <button type="button" className="icon-button desktop-menu-trigger" aria-label={sidebarAction} title={sidebarAction} aria-controls="app-sidebar" onClick={onToggleSidebar}>
          <Icon name="panel" size={22} />
        </button>
        {sidebarMode !== 'hidden' && (
          <button type="button" className="icon-button desktop-hide-trigger" aria-label="Ocultar menú lateral" title="Ocultar menú lateral" aria-controls="app-sidebar" onClick={onHideSidebar}>
            <Icon name="panel-hide" size={20} />
          </button>
        )}
        <button type="button" className="icon-button mobile-menu-trigger" aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'} title={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileMenuOpen} aria-controls="app-sidebar" onClick={onToggleMobileMenu}>
          <Icon name={mobileMenuOpen ? 'close' : 'menu'} size={23} />
        </button>
      </div>
      <div className="breadcrumbs">
        <span>{business ? 'Mi negocio' : 'Mi espacio'}</span>
        <Icon name="chevron" size={14} />
        <strong>{title}</strong>
      </div>
    </div>
    <div className="topbar-right">
      <label className="company-picker">
        <span className="sr-only">Empresa activa</span>
        <Icon name="building" size={16} />
        <select aria-label="Cambiar de empresa" value={business?.id ?? ''} onChange={(event) => navigate(event.target.value ? businessHref(event.target.value, 'inicio') : '/inicio')}>
          <option value="">Mi espacio personal</option>
          {demoBusinesses.map((item) => <option key={item.id} value={item.id}>{item.name} · DEMO</option>)}
        </select>
      </label>
      <span className="demo-chip">DEMO</span>
      <AppLink navigate={navigate} to="/perfil" className="user-avatar" ariaLabel="Ir a mi perfil">UD</AppLink>
    </div>
  </header>
}
