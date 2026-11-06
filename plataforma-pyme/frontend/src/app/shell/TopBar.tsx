import { useEffect, useRef } from 'react'
import { profileInitials } from '../../features/profile/ProfilePage'
import { AppLink } from '../AppLink'
import { Icon } from '../Icon'
import { businessHref } from '../navigation'
import type { DemoBusiness, DemoProfile } from '../../data/demo/demoStore'
import type { Navigate } from '../types'
import type { SidebarMode } from './sidebarPreference'

export function Topbar({
  business,
  businesses,
  profile,
  title,
  navigate,
  sidebarMode,
  menuOpen,
  showBack,
  onBack,
  onToggleSidebar,
  onHideSidebar,
  onToggleMenu,
}: {
  business: DemoBusiness | undefined
  businesses: DemoBusiness[]
  profile: DemoProfile
  title: string
  navigate: Navigate
  sidebarMode: SidebarMode
  menuOpen: boolean
  showBack: boolean
  onBack: () => void
  onToggleSidebar: () => void
  onHideSidebar: () => void
  onToggleMenu: () => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(menuOpen)

  // Al cerrar el diálogo, el foco vuelve al botón que lo abrió.
  useEffect(() => {
    if (wasOpen.current && !menuOpen) triggerRef.current?.focus()
    wasOpen.current = menuOpen
  }, [menuOpen])

  const pinAction = sidebarMode === 'expanded'
    ? 'Contraer menú fijo a íconos'
    : sidebarMode === 'compact'
      ? 'Expandir menú fijo'
      : 'Fijar menú lateral'

  return <header className="topbar">
    <div className="topbar-left">
      <div className="sidebar-actions">
        <button
          ref={triggerRef}
          type="button"
          className="icon-button menu-drawer-trigger"
          aria-label={menuOpen ? 'Cerrar menú principal' : 'Abrir menú principal'}
          title={menuOpen ? 'Cerrar menú' : 'Abrir menú principal'}
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          aria-controls="app-sidebar"
          onClick={onToggleMenu}
        >
          <Icon name="menu" size={23} />
        </button>
        <button
          type="button"
          className="icon-button desktop-menu-trigger"
          aria-label={pinAction}
          title={pinAction}
          aria-controls="app-sidebar"
          onClick={onToggleSidebar}
        >
          <Icon name="panel" size={20} />
        </button>
        {sidebarMode !== 'hidden' && (
          <button
            type="button"
            className="icon-button desktop-hide-trigger"
            aria-label="Ocultar menú fijo"
            title="Ocultar menú fijo"
            aria-controls="app-sidebar"
            onClick={onHideSidebar}
          >
            <Icon name="panel-hide" size={19} />
          </button>
        )}
      </div>
      {showBack && <button type="button" className="back-button" aria-label="Volver a la sección anterior" title="Volver" onClick={onBack}><Icon name="arrow-left" size={19}/><span>Volver</span></button>}
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
          {businesses.map((item) => <option key={item.id} value={item.id}>{item.name} · DEMO</option>)}
        </select>
      </label>
      <span className="demo-chip">DEMO</span>
      <AppLink navigate={navigate} to="/perfil" className="user-avatar" ariaLabel="Ir a mi perfil">{profileInitials(profile)}</AppLink>
    </div>
  </header>
}
