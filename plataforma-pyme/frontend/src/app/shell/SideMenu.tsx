import { AppLink } from '../AppLink'
import { Icon } from '../Icon'
import { businessHref, navigationGroups, navigationItems } from '../navigation'
import type { DemoBusiness } from '../navigation'
import type { Navigate } from '../types'

export function Sidebar({
  business,
  pathname,
  navigate,
  isOpen,
  onClose,
}: {
  business: DemoBusiness | undefined
  pathname: string
  navigate: Navigate
  isOpen: boolean
  onClose: () => void
}) {
  return (
    <>
      {isOpen && <button type="button" className="mobile-scrim" aria-label="Cerrar menú" onClick={onClose} />}
      <aside className={'sidebar' + (isOpen ? ' sidebar-open' : '')} aria-label="Navegación principal">
        <div className="sidebar-head">
          <AppLink navigate={navigate} to="/inicio" className="brand">
            <span className="brand-logo"><Icon name="building" size={25} /></span>
            <span><strong>Asistente PyME</strong><small>Gestión de negocios</small></span>
          </AppLink>
          <button type="button" className="icon-button sidebar-close" aria-label="Cerrar menú" onClick={onClose}><Icon name="close" /></button>
        </div>

        <div className="sidebar-scroll">
          {!business ? (
            <nav className="sidebar-group" aria-label="Navegación personal">
              <p className="group-label">ESPACIO PERSONAL</p>
              <AppLink to="/inicio" navigate={navigate} className={'side-link' + (pathname === '/inicio' || pathname === '/' ? ' active' : '')}>
                <Icon name="home" /><span>Inicio</span>
              </AppLink>
              <AppLink to="/perfil" navigate={navigate} className={'side-link' + (pathname === '/perfil' ? ' active' : '')}>
                <Icon name="user" /><span>Mi perfil</span>
              </AppLink>
              <AppLink to="/empresas/nueva" navigate={navigate} className={'side-link' + (pathname === '/empresas/nueva' ? ' active' : '')}>
                <Icon name="plus" /><span>Crear empresa</span>
              </AppLink>
            </nav>
          ) : (
            <nav aria-label="Secciones del negocio">
              {navigationGroups.map((group) => (
                <div key={group} className="sidebar-group">
                  <p className="group-label">{group.toUpperCase()}</p>
                  {navigationItems.filter((item) => item.group === group).map((item) => {
                    const href = businessHref(business.id, item.segment)
                    return (
                      <AppLink key={item.id} navigate={navigate} to={href} className={'side-link' + (pathname === href ? ' active' : '')}>
                        <Icon name={item.icon} size={19} /><span>{item.label}</span>
                        {item.phase === 'Posterior' && <span className="side-dot" title="Próximamente" />}
                      </AppLink>
                    )
                  })}
                </div>
              ))}
            </nav>
          )}
        </div>
        <div className="sidebar-foot">
          <div className="sidebar-foot-card">
            <div className="sidebar-foot-icon"><Icon name="shield" size={17}/></div>
            <div><strong>Entorno de demostración</strong><span>Sin operaciones reales ni pagos.</span></div>
          </div>
          <span className="sidebar-version">Prototipo E1-A1 · v0.1</span>
        </div>
      </aside>
    </>
  )
}
