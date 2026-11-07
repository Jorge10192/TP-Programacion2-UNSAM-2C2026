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
  onToggleMenu: () => void
  onLogout?: () => void
}) {
  const { mode, session, loadState, snapshot, runtime, recovery } = useAppData()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const desktopTriggerRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(menuOpen)

  // Al cerrar el diálogo, el foco vuelve al botón que lo abrió.
  useEffect(() => {
    if (wasOpen.current && !menuOpen) {
      const trigger = triggerRef.current?.checkVisibility() ? triggerRef.current : desktopTriggerRef.current
      trigger?.focus()
    }
    wasOpen.current = menuOpen
  }, [menuOpen])

  const pinAction = sidebarMode === 'expanded' ? 'Reducir menú' : 'Mostrar nombres'
  const updatedAt = snapshot?.apiAsOf
    ? new Date(snapshot.apiAsOf).toLocaleString('es-AR', { hour12: false })
    : 'Sin fecha de actualización'

  return <header className={'topbar' + (mode === 'api' ? ' api-topbar' : '')}>
    <div className="topbar-left">
      <div className="sidebar-actions">
        <button
          ref={triggerRef}
          type="button"
          className="menu-toggle menu-drawer-trigger"
          aria-label={menuOpen ? 'Cerrar menú principal' : 'Abrir menú principal'}
          title={menuOpen ? 'Cerrar menú' : 'Abrir menú principal'}
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          aria-controls="app-sidebar"
          onClick={onToggleMenu}
        >
          <Icon name="menu" size={20} /><span>Menú</span>
        </button>
        <button
          ref={desktopTriggerRef}
          type="button"
          className="menu-toggle desktop-menu-trigger"
          aria-label={pinAction}
          title={pinAction}
          aria-controls="app-sidebar"
          aria-expanded={sidebarMode === 'expanded'}
          onClick={onToggleSidebar}
        >
          <Icon name="panel" size={20} /><span>{pinAction}</span>
        </button>
      </div>
      {showBack && <button type="button" className="back-button" aria-label="Volver a la sección anterior" title="Volver" onClick={onBack}><Icon name="arrow-left" size={19}/><span>Volver</span></button>}
      <div className="breadcrumbs">
        <span>{business?.name ?? 'Mi espacio'}</span>
        <Icon name="chevron" size={14} />
        <strong>{title}</strong>
      </div>
    </div>
    <div className="topbar-right">
      {mode === 'demo' && <label className="company-picker">
        <span className="sr-only">Empresa activa</span>
        <Icon name="building" size={16} />
        <select aria-label="Cambiar de empresa" value={business?.id ?? ''} onChange={(event) => navigate(event.target.value ? businessHref(event.target.value, 'inicio') : '/inicio')}>
          <option value="">Mi espacio personal</option>
          {businesses.map((item) => <option key={item.id} value={item.id}>{item.name} · DEMO</option>)}
        </select>
      </label>}
      {mode === 'demo' ? <span className="demo-chip">DEMO</span> : <button type="button"
        className="icon-button data-refresh" aria-label="Actualizar datos" title={'Actualizar · Última actualización: ' + updatedAt}
        disabled={loadState === 'refreshing' || Boolean(recovery)} aria-busy={loadState === 'refreshing'}
        onClick={() => void runtime.refresh()}><Icon name="refresh" size={19}/><span className="refresh-label">{loadState === 'refreshing' ? 'Actualizando…' : 'Actualizar'}</span>
      </button>}
      {mode === 'api' ? <><span className="session-user">{session?.user?.name}</span><button type="button" className="button button-secondary" aria-label={'Cerrar sesión de ' + session?.user?.name} onClick={onLogout}>Salir</button></> : <AppLink navigate={navigate} to="/perfil" className="user-avatar" ariaLabel="Ir a mi perfil">
        <DemoPhoto target={{ scope: 'profile' }} alt="Foto de perfil" fallback={profileInitials(profile)} className="demo-photo-avatar"/>
      </AppLink>}
    </div>
  </header>
}
