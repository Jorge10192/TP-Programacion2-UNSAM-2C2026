import { useEffect, useRef } from 'react'
import { profileInitials } from '../../data/models'
import { DemoPhoto } from '../../features/common/DemoPhoto'
import { AppLink } from '../AppLink'
import { Icon } from '../Icon'
import { businessHref } from '../navigation'
import type { Business, Profile } from '../../data/models'
import type { Navigate } from '../types'
import type { SidebarMode } from './sidebarPreference'
import { useAppData } from '../../data/dataContext'

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
  onLogout,
}: {
  business: Business | undefined
  businesses: Business[]
  profile: Profile
  title: string
  navigate: Navigate
  sidebarMode: SidebarMode
  menuOpen: boolean
  showBack: boolean
  onBack: () => void
  onToggleSidebar: () => void
  onHideSidebar: () => void
  onToggleMenu: () => void
  onLogout?: () => void
}) {
  const { mode, session, loadState } = useAppData()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(menuOpen)

  // Al cerrar el diálogo, el foco vuelve al botón que lo abrió.
  useEffect(() => {
    if (wasOpen.current && !menuOpen) triggerRef.current?.focus()
    wasOpen.current = menuOpen
  }, [menuOpen])

  const pinAction = sidebarMode === 'expanded'
    ? 'Mostrar sólo iconos'
    : sidebarMode === 'compact'
      ? 'Mostrar iconos y nombres'
      : 'Mostrar menú con nombres'

  return <header className={'topbar' + (mode === 'api' ? ' api-topbar' : '')}>
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
          aria-expanded={sidebarMode === 'expanded'}
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
        <span>{business?.name ?? 'Mi espacio'}</span>
        <Icon name="chevron" size={14} />
        <strong>{title}</strong>
      </div>
    </div>
    <div className="topbar-right">
      <label className="company-picker">
        <span className="sr-only">Empresa activa</span>
        <Icon name="building" size={16} />
        <select aria-label="Cambiar de empresa" disabled={mode === 'api'} value={business?.id ?? (mode === 'api' ? businesses[0]?.id ?? '' : '')} onChange={(event) => navigate(event.target.value ? businessHref(event.target.value, 'inicio') : '/inicio')}>
          {mode === 'demo' && <option value="">Mi espacio personal</option>}
          {businesses.map((item) => <option key={item.id} value={item.id}>{item.name}{mode === 'demo' ? ' · DEMO' : ''}</option>)}
        </select>
      </label>
      <span className="demo-chip">{mode === 'demo' ? 'DEMO' : loadState === 'error' ? 'Sin conexión' : 'Conectado'}</span>
      {mode === 'api' ? <><span className="session-user">{session?.user?.name}</span><button type="button" className="button button-secondary" aria-label={'Cerrar sesión de ' + session?.user?.name} onClick={onLogout}>Salir</button></> : <AppLink navigate={navigate} to="/perfil" className="user-avatar" ariaLabel="Ir a mi perfil">
        <DemoPhoto target={{ scope: 'profile' }} alt="Foto de perfil" fallback={profileInitials(profile)} className="demo-photo-avatar"/>
      </AppLink>}
    </div>
  </header>
}
