import { useLayoutEffect, useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { AppLink } from '../AppLink'
import { Icon } from '../Icon'
import { businessHref, navigationGroups, navigationItems } from '../navigation'
import type { Business } from '../navigation'
import type { Navigate } from '../types'
import type { SidebarMode } from './sidebarPreference'
import { useAppData } from '../../data/dataContext'

export function Sidebar({
  business,
  pathname,
  navigate,
  mode,
  isOpen,
  onClose,
}: {
  business: Business | undefined
  pathname: string
  navigate: Navigate
  mode: SidebarMode
  isOpen: boolean
  onClose: () => void
}) {
  const { mode: appMode, snapshot } = useAppData()
  const visibleItems = appMode === 'demo' ? navigationItems : navigationItems.filter((item) =>
    ['inicio', 'compras', 'inventario', 'jornadas', 'ventas', 'gastos', 'catalogo', 'proveedores', 'ubicaciones', 'movimientos'].includes(item.id)
    || item.id === 'historial' && Boolean(snapshot?.apiLegacyRecords?.length))
  const compact = mode === 'compact' && !isOpen
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const secondaryGroups = navigationGroups.filter((group) => group !== 'Tu jornada' && group !== 'Preparación'
    && visibleItems.some(item => item.group === group))
  const secondaryActive = !!business && visibleItems.some((item) => secondaryGroups.some((group) => group === item.group)
    && pathname === businessHref(business.id, item.segment))

  useLayoutEffect(() => {
    if (!isOpen) return
    // Opening visibility is immediate in CSS, so focus can enter before the drawer is painted.
    closeButtonRef.current?.focus({ preventScroll: true })
  }, [isOpen])

  // El drawer modal nunca debe dejar que Tab llegue al contenido bloqueado.
  function handleDrawerKeys(event: ReactKeyboardEvent<HTMLElement>) {
    if (!isOpen || event.key !== 'Tab') return
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'))
      .filter((element) => element.getClientRects().length > 0 && element.checkVisibility())
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function renderGroup(group: (typeof navigationGroups)[number]) {
    if (!business) return null
    const items = visibleItems.filter((item) => item.group === group)
    if (!items.length) return null
    return <div key={group} className={'sidebar-group' + (group === 'Tu jornada' ? ' sidebar-group-primary' : group === 'Preparación' ? ' sidebar-group-preparation' : ' sidebar-group-secondary')}>
      {(appMode === 'demo' || group === 'Tu jornada' || group === 'Preparación') && <p className="group-label">{group.toUpperCase()}</p>}
      {items.map((item) => {
        const href = businessHref(business.id, item.segment)
        const active = pathname === href
        const label = appMode === 'api' && item.id === 'historial' ? 'Registros anteriores' : item.label
        return <AppLink key={item.id} navigate={navigate} to={href} ariaLabel={label}
          ariaCurrent={active ? 'page' : undefined} title={compact ? label : undefined}
          className={'side-link' + (active ? ' active' : '')}>
          <Icon name={item.icon} size={19}/><span className="side-label">{label}</span>
          {item.phase === 'Posterior' && <span className="side-dot" title="Próximamente"/>}
        </AppLink>
      })}
    </div>
  }

  return (
    <>
      {isOpen && <button type="button" tabIndex={-1} className="mobile-scrim" aria-label="Cerrar menú al tocar fuera" onClick={onClose} />}
      <aside id="app-sidebar" className={'sidebar' + (isOpen ? ' sidebar-open' : '')} role={isOpen ? 'dialog' : undefined} aria-modal={isOpen ? true : undefined} aria-label={isOpen ? 'Menú principal' : 'Navegación principal'} onKeyDown={handleDrawerKeys}>
        <div className="sidebar-head">
          <AppLink navigate={navigate} to={appMode === 'api' ? businessHref(business?.id ?? 'walos', 'inicio') : '/inicio'} className="brand"
            ariaLabel={appMode === 'api' ? 'Inicio de WALOS' : 'Ir al inicio personal'} title={compact ? appMode === 'api' ? 'Inicio de WALOS' : 'Asistente PyME · Inicio personal' : undefined}>
            <span className="brand-logo"><Icon name="building" size={25} /></span>
            <span className="brand-copy"><strong>{appMode === 'api' ? business?.name ?? 'WALOS' : 'Asistente PyME'}</strong><small>Tu jornada de trabajo</small></span>
          </AppLink>
          <button type="button" ref={closeButtonRef} className="icon-button sidebar-close" aria-label="Cerrar menú" onClick={onClose}><Icon name="close" /></button>
        </div>

        <div className="sidebar-scroll">
          {!business ? (
            <nav className="sidebar-group" aria-label="Navegación personal">
              <p className="group-label">ESPACIO PERSONAL</p>
              <AppLink to="/inicio" navigate={navigate} ariaLabel="Inicio" ariaCurrent={pathname === '/inicio' || pathname === '/' ? 'page' : undefined} title={compact ? 'Inicio' : undefined} className={'side-link' + (pathname === '/inicio' || pathname === '/' ? ' active' : '')}>
                <Icon name="home" /><span className="side-label">Inicio</span>
              </AppLink>
              {appMode === 'demo' && <><AppLink to="/perfil" navigate={navigate} ariaLabel="Mi perfil" ariaCurrent={pathname === '/perfil' ? 'page' : undefined} title={compact ? 'Mi perfil' : undefined} className={'side-link' + (pathname === '/perfil' ? ' active' : '')}>
                <Icon name="user" /><span className="side-label">Mi perfil</span>
              </AppLink>
              <AppLink to="/empresas/nueva" navigate={navigate} ariaLabel="Crear empresa" ariaCurrent={pathname === '/empresas/nueva' ? 'page' : undefined} title={compact ? 'Crear empresa' : undefined} className={'side-link' + (pathname === '/empresas/nueva' ? ' active' : '')}>
                <Icon name="plus" /><span className="side-label">Crear empresa</span>
              </AppLink></>}
            </nav>
          ) : (
            <nav aria-label="Secciones del negocio">
              {navigationGroups.filter((group) => group === 'Tu jornada' || group === 'Preparación').map(renderGroup)}
              <details className="sidebar-secondary-options" open={compact || secondaryActive}>
                <summary className="group-label">{appMode === 'api' ? 'Consultas' : 'Más opciones'}</summary>
                {secondaryGroups.map(renderGroup)}
              </details>
            </nav>
          )}
        </div>
        {appMode === 'demo' && <div className="sidebar-foot">
          <div className="sidebar-foot-card" title={compact ? 'Entorno de demostración. Sin operaciones ni pagos reales.' : undefined}>
            <div className="sidebar-foot-icon"><Icon name="shield" size={17}/></div>
            <div className="sidebar-foot-copy"><strong>Entorno de demostración</strong><span>Sin operaciones reales ni pagos.</span></div>
          </div>
          <span className="sidebar-version">Jornada WALOS · Demo local</span>
        </div>}
      </aside>
    </>
  )
}
