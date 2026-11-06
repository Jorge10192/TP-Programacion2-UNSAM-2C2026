import { AppLink } from '../../app/AppLink'
import { Icon } from '../../app/Icon'
import { businessHref, navigationItems } from '../../app/navigation'
import type { DemoBusiness, NavigationItem } from '../../app/navigation'
import type { Navigate } from '../../app/types'

export function Welcome({ navigate, businesses }: { navigate: Navigate; businesses: DemoBusiness[] }) {
  return <>
    <div className="page-heading">
      <div><p className="eyebrow">ESPACIO PERSONAL</p><h1>Bienvenido a tu espacio de trabajo</h1><p>Seleccioná una empresa de demostración para recorrer la plataforma.</p></div>
    </div>
    <section className="welcome-banner">
      <div className="welcome-symbol"><Icon name="building" size={28} /></div>
      <div><h2>Una plataforma, diferentes negocios</h2><p>Administrá productos, servicios, ubicaciones y operaciones desde un único lugar.</p></div>
      <span className="light-tag">Versión inicial</span>
    </section>

    <div className="section-header"><div><h2>Mis empresas</h2><p>Empresas de ejemplo y negocios creados en este navegador. No hay registros comerciales reales.</p></div></div>
    <div className="company-grid">
      {businesses.map((business) => <button type="button" className="company-card" key={business.id} onClick={() => navigate(businessHref(business.id, 'inicio'))}>
        <span className={'company-icon ' + business.accent}>{business.initials}</span>
        <span className="company-copy"><strong>{business.name}</strong><small>{business.category}</small><span className="small-pill">{business.source === 'created' ? 'Creada en DEMO' : 'Empresa de ejemplo'}</span></span>
        <Icon name="arrow" size={19} className="company-arrow" />
      </button>)}
      <button type="button" className="company-card new-company" onClick={() => navigate('/empresas/nueva')}>
        <span className="company-icon add-company"><Icon name="plus" size={23} /></span>
        <span className="company-copy"><strong>Crear una empresa</strong><small>Agregá otro negocio a tu espacio DEMO.</small><span className="small-pill">Disponible</span></span>
        <Icon name="arrow" size={19} className="company-arrow" />
      </button>
    </div>
    <div className="informational-note"><Icon name="shield" size={19}/><span>Este es un prototipo de interfaz: los negocios creados y el perfil se guardan solamente en tu navegador. No hay autenticación ni autorización real.</span></div>
  </>
}

const summaryCards = [
  { label: 'Ventas del período', detail: 'Sin ventas registradas', icon: 'receipt' as const, accent: 'blue' },
  { label: 'Artículos y servicios', detail: 'Catálogo pendiente', icon: 'package' as const, accent: 'mint' },
  { label: 'Movimientos de stock', detail: 'Sin operaciones', icon: 'truck' as const, accent: 'violet' },
  { label: 'Jornada de caja', detail: 'Sin jornada activa', icon: 'wallet' as const, accent: 'orange' },
]

export function BusinessDashboard({ business, navigate, catalogCount }: { business: DemoBusiness; navigate: Navigate; catalogCount: number }) {
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
        <strong className="stat-value">{item.label === 'Artículos y servicios' ? catalogCount : '—'}</strong>
        <small>{item.label === 'Artículos y servicios' ? 'Fichas activas DEMO' : item.detail}</small>
      </div>)}
    </div>

    <div className="section-header spacing-top"><div><h2>Accesos rápidos</h2><p>Encontrá las herramientas principales desde un solo lugar.</p></div></div>
    <div className="tool-grid">
      {quickActions.map((item, index) => <AppLink to={businessHref(business.id, item.segment)} navigate={navigate} key={item.id} className="tool-card">
        <span className={'feature-icon ' + ['blue', 'mint', 'violet', 'orange'][index % 4]}><Icon name={item.icon} size={24}/></span>
        <span className="tool-copy"><strong>{item.label}</strong><small>{item.description}</small><span className={'tool-status' + (['ubicaciones', 'equipo', 'catalogo'].includes(item.id) ? ' tool-available' : '')}>{['ubicaciones', 'equipo', 'catalogo'].includes(item.id) ? 'Disponible DEMO' : 'Próximamente'}</span></span>
        <Icon name="arrow" size={17} className="tool-arrow"/>
      </AppLink>)}
    </div>

  </>
}
