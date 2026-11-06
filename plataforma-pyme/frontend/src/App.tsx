import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { Icon } from './app/Icon'
import { businessHref, demoBusinesses, navigationGroups, navigationItems } from './app/navigation'
import type { DemoBusiness, NavigationItem } from './app/navigation'
import './App.css'

type Navigate = (path: string) => void

function AppLink({
  to,
  navigate,
  children,
  className,
  onNavigate,
  ariaLabel,
}: {
  to: string
  navigate: Navigate
  children: React.ReactNode
  className?: string
  onNavigate?: () => void
  ariaLabel?: string
}) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(to)
    onNavigate?.()
  }

  return <a href={to} onClick={handleClick} className={className} aria-label={ariaLabel}>{children}</a>
}

function Sidebar({
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

function Topbar({
  business,
  title,
  navigate,
  onOpenMenu,
}: {
  business: DemoBusiness | undefined
  title: string
  navigate: Navigate
  onOpenMenu: () => void
}) {
  return <header className="topbar">
    <div className="topbar-left">
      <button type="button" className="icon-button menu-trigger" aria-label="Abrir menú" onClick={onOpenMenu}><Icon name="menu" /></button>
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

function Welcome({ navigate }: { navigate: Navigate }) {
  return <>
    <div className="page-heading">
      <div><p className="eyebrow">ESPACIO PERSONAL</p><h1>Bienvenido a tu espacio de trabajo</h1><p>Seleccioná una empresa de demostración para recorrer la plataforma.</p></div>
    </div>
    <section className="welcome-banner">
      <div className="welcome-symbol"><Icon name="building" size={28} /></div>
      <div><h2>Una plataforma, diferentes negocios</h2><p>Administrá productos, servicios, ubicaciones y operaciones desde un único lugar.</p></div>
      <span className="light-tag">Versión inicial</span>
    </section>

    <div className="section-header"><div><h2>Mis empresas de ejemplo</h2><p>Datos ficticios para mostrar la navegación; no hay registros comerciales.</p></div></div>
    <div className="company-grid">
      {demoBusinesses.map((business) => <button type="button" className="company-card" key={business.id} onClick={() => navigate(businessHref(business.id, 'inicio'))}>
        <span className={'company-icon ' + business.accent}>{business.initials}</span>
        <span className="company-copy"><strong>{business.name}</strong><small>{business.category}</small><span className="small-pill">Empresa DEMO</span></span>
        <Icon name="arrow" size={19} className="company-arrow" />
      </button>)}
      <button type="button" className="company-card new-company" onClick={() => navigate('/empresas/nueva')}>
        <span className="company-icon add-company"><Icon name="plus" size={23} /></span>
        <span className="company-copy"><strong>Crear una empresa</strong><small>Disponible en el próximo incremento E1-A2.</small><span className="small-pill amber-pill">Próximamente</span></span>
        <Icon name="arrow" size={19} className="company-arrow" />
      </button>
    </div>
    <div className="informational-note"><Icon name="shield" size={19}/><span>Este es un prototipo de interfaz. No hay autenticación ni autorización real; las empresas se muestran para probar el diseño.</span></div>
  </>
}

const summaryCards = [
  { label: 'Ventas del período', detail: 'Sin ventas registradas', icon: 'receipt' as const, accent: 'blue' },
  { label: 'Artículos y servicios', detail: 'Catálogo pendiente', icon: 'package' as const, accent: 'mint' },
  { label: 'Movimientos de stock', detail: 'Sin operaciones', icon: 'truck' as const, accent: 'violet' },
  { label: 'Jornada de caja', detail: 'Sin jornada activa', icon: 'wallet' as const, accent: 'orange' },
]

function BusinessDashboard({ business, navigate }: { business: DemoBusiness; navigate: Navigate }) {
  const priority = ['catalogo', 'inventario', 'ventas', 'compras', 'gastos', 'jornadas', 'ubicaciones', 'equipo']
  const quickActions = priority.map((id) => navigationItems.find((entry) => entry.id === id)).filter((item): item is NavigationItem => item !== undefined)

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">PANEL GENERAL DEL NEGOCIO</p><h1>Inicio</h1><p>Un vistazo a tu empresa y todas las herramientas de gestión.</p></div>
      <div className="heading-actions"><span className="outline-chip"><Icon name="shield" size={15}/> Entorno DEMO</span></div>
    </div>

    <section className="business-hero">
      <span className={'company-icon company-icon-large ' + business.accent}>{business.initials}</span>
      <div><p className="hero-caption">EMPRESA SELECCIONADA</p><h2>{business.name}</h2><p>{business.category} · Vista de demostración</p></div>
      <button type="button" className="button button-secondary hero-action" onClick={() => navigate(businessHref(business.id, 'empresa'))}>Ver empresa <Icon name="arrow" size={16}/></button>
    </section>

    <div className="section-header"><div><h2>Resumen del negocio</h2><p>Los indicadores aparecerán cuando conectemos las operaciones.</p></div><span className="small-pill">Sin datos reales</span></div>
    <div className="stats-grid">
      {summaryCards.map((item) => <div key={item.label} className="stat-card">
        <span className={'feature-icon ' + item.accent}><Icon name={item.icon} size={20}/></span>
        <span className="stat-label">{item.label}</span>
        <strong className="stat-value">—</strong>
        <small>{item.detail}</small>
      </div>)}
    </div>

    <div className="section-header spacing-top"><div><h2>Accesos rápidos</h2><p>Encontrá las herramientas principales desde un solo lugar.</p></div></div>
    <div className="tool-grid">
      {quickActions.map((item, index) => <AppLink to={businessHref(business.id, item.segment)} navigate={navigate} key={item.id} className="tool-card">
        <span className={'feature-icon ' + ['blue', 'mint', 'violet', 'orange'][index % 4]}><Icon name={item.icon} size={24}/></span>
        <span className="tool-copy"><strong>{item.label}</strong><small>{item.description}</small><span className="tool-status">Próximamente</span></span>
        <Icon name="arrow" size={17} className="tool-arrow"/>
      </AppLink>)}
    </div>

    <section className="all-features">
      <div><h2>Todas las secciones</h2><p>También disponibles en el menú lateral.</p></div>
      <div className="feature-chips">{navigationItems.filter((item) => !priority.includes(item.id) && item.id !== 'inicio').map((item) => <AppLink key={item.id} to={businessHref(business.id, item.segment)} navigate={navigate} className="feature-chip"><Icon name={item.icon} size={17}/>{item.label}<Icon name="chevron" size={13}/></AppLink>)}</div>
    </section>
  </>
}

function ComingSoon({ title, description, navigate, business }: { title: string; description: string; navigate: Navigate; business?: DemoBusiness }) {
  return <>
    <div className="page-heading"><div><p className="eyebrow">PLATAFORMA PYME · DEMO</p><h1>{title}</h1><p>{description}</p></div></div>
    <section className="empty-state">
      <div className="empty-icon"><Icon name="clock" size={36}/></div>
      <span className="soon-pill">Próximamente</span>
      <h2>Estamos preparando esta sección</h2>
      <p>El diseño se integrará a partir de los HTML originales seleccionados en E0-A. Por ahora esta pantalla no registra ni modifica información.</p>
      <button type="button" className="button button-primary" onClick={() => navigate(business ? businessHref(business.id, 'inicio') : '/inicio')}><Icon name="home" size={17}/> Volver al inicio</button>
    </section>
  </>
}

function NotFound({ navigate, accessDenied = false }: { navigate: Navigate; accessDenied?: boolean }) {
  return <section className="empty-state not-found">
    <div className="empty-icon"><Icon name="shield" size={34}/></div>
    <h1>{accessDenied ? 'Empresa no disponible' : 'No encontramos esta página'}</h1>
    <p>{accessDenied ? 'La empresa solicitada no forma parte de las empresas de ejemplo de esta sesión. No se muestran sus datos.' : 'La dirección solicitada no corresponde a una sección disponible.'}</p>
    <button type="button" className="button button-primary" onClick={() => navigate('/inicio')}>Volver a mi espacio</button>
  </section>
}

function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname || '/')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handlePopState = () => { setPathname(window.location.pathname); setMenuOpen(false) }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate: Navigate = (to) => {
    if (to !== window.location.pathname) window.history.pushState(null, '', to)
    setPathname(to)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const match = /^\/b\/([^/]+)\/([^/]+)$/.exec(pathname)
  const hasBusinessPath = pathname.startsWith('/b/')
  const business = match ? demoBusinesses.find((item) => item.id === match[1]) : undefined
  const section = match?.[2]
  const selectedPage = navigationItems.find((item) => item.segment === section)
  const personal = pathname === '/' || pathname === '/inicio'
  const pageTitle = business ? (selectedPage?.label ?? 'Sección desconocida') : pathname === '/perfil' ? 'Mi perfil' : pathname === '/empresas/nueva' ? 'Crear empresa' : 'Inicio'

  useEffect(() => { document.title = pageTitle + ' · Asistente PyME DEMO' }, [pageTitle])

  let content: React.ReactNode
  if (personal) content = <Welcome navigate={navigate} />
  else if (pathname === '/perfil') content = <ComingSoon title="Mi perfil" description="Tu perfil es personal e independiente de cada negocio." navigate={navigate} />
  else if (pathname === '/empresas/nueva') content = <ComingSoon title="Crear empresa" description="La creación de empresas se implementará en E1-A2." navigate={navigate} />
  else if (hasBusinessPath && !business) content = <NotFound navigate={navigate} accessDenied />
  else if (business && section === 'inicio') content = <BusinessDashboard business={business} navigate={navigate} />
  else if (business && selectedPage) content = <ComingSoon title={selectedPage.label} description={selectedPage.description} business={business} navigate={navigate} />
  else content = <NotFound navigate={navigate} />

  return <div className="app-layout">
    <Sidebar pathname={pathname} business={business} navigate={navigate} isOpen={menuOpen} onClose={() => setMenuOpen(false)}/>
    <div className="main-column">
      <Topbar business={business} title={pageTitle} navigate={navigate} onOpenMenu={() => setMenuOpen(true)} />
      <main id="main-content" className="main-content">{content}</main>
      <footer className="app-footer"><span>Asistente PyME · Prototipo E1-A1</span><span>Sin autenticación, stock ni cobros reales</span></footer>
    </div>
  </div>
}

export default App
