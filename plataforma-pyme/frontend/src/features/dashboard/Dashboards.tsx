import { AppLink } from '../../app/AppLink'
import { Icon } from '../../app/Icon'
import { DemoPhoto } from '../common/DemoPhoto'
import { businessHref } from '../../app/navigation'
import type { Business } from '../../app/navigation'
import type { Navigate } from '../../app/types'
import { useAppData } from '../../data/dataContext'

export function Welcome({ navigate, businesses }: { navigate: Navigate; businesses: Business[] }) {
  const { mode, capabilities } = useAppData()
  const featured = businesses.find((business) => business.id === 'walos-demo') ?? businesses[0]
  const otherBusinesses = businesses.filter((business) => business.id !== featured?.id)

  return <div className="personal-home">
    <div className="page-heading personal-heading">
      <div><p className="eyebrow">ASISTENTE PYME · {mode === 'demo' ? 'DEMO LOCAL' : 'CONECTADO'}</p><h1>Empezá tu jornada</h1><p>Entrá al negocio para preparar el stock, operar y cerrar la caja.</p></div>
    </div>
    {featured && <section className="personal-business-feature" aria-labelledby="featured-business-title">
      <DemoPhoto target={{ scope: 'business', businessId: featured.id, entityId: 'logo' }} alt={'Logo de ' + featured.name}
        fallback={featured.initials} className={'company-icon company-icon-large ' + featured.accent}/>
      <div className="personal-business-copy"><p className="eyebrow">NEGOCIO PRINCIPAL</p><h2 id="featured-business-title">{featured.name}</h2><p>Una guía para compras, stock, caja, ventas y gastos.</p></div>
      <AppLink to={businessHref(featured.id, 'inicio')} navigate={navigate} className="button button-primary personal-business-action">
        Entrar a {featured.name} <Icon name="arrow" size={17}/>
      </AppLink>
    </section>}

    {capabilities.multiBusiness && <details className="personal-other-businesses">
      <summary>Otros negocios y opciones <span className="small-pill">{otherBusinesses.length} negocios</span></summary>
      <div className="company-grid company-grid-secondary">
      {otherBusinesses.map((business) => <button type="button" className="company-card" key={business.id} onClick={() => navigate(businessHref(business.id, 'inicio'))}>
        <DemoPhoto target={{ scope: 'business', businessId: business.id, entityId: 'logo' }} alt={'Logo de ' + business.name}
          fallback={business.initials} className={'company-icon ' + business.accent}/>
        <span className="company-copy"><strong>{business.name}</strong><small>{business.category}</small><span className="small-pill">{business.source === 'created' ? 'Creada en DEMO' : 'Empresa de ejemplo'}</span></span>
        <Icon name="arrow" size={19} className="company-arrow" />
      </button>)}
      <button type="button" className="company-card new-company" onClick={() => navigate('/empresas/nueva')}>
        <span className="company-icon add-company"><Icon name="plus" size={23} /></span>
        <span className="company-copy"><strong>Crear una empresa</strong><small>Agregá otro negocio a tu espacio DEMO.</small></span>
        <Icon name="arrow" size={19} className="company-arrow" />
      </button>
      </div>
    </details>}
    <div className="informational-note personal-demo-note"><Icon name="shield" size={18}/><span>{mode === 'demo' ? 'Los datos son de demostración y se guardan en este navegador. No hay acceso seguro ni cobros reales.' : 'Los datos se consultan y guardan en el servidor. Los pagos son declaraciones, no acreditaciones bancarias.'}</span></div>
  </div>
}

const journeySteps = [
  { title: 'Comprá y recibí', segment: 'compras', link: 'Ir a Compras', text: 'Registrá la compra y confirmá dónde recibiste la mercadería. Comprar no registra un pago.' },
  { title: 'Revisá el stock', segment: 'inventario', link: 'Consultar Stock', text: 'Revisá existencias por ubicación. Cargá los productos terminados con un conteo.' },
  { title: 'Abrí caja', segment: 'jornadas', link: 'Abrir Caja', text: 'Indicá ubicación y fondo inicial antes de vender. El efectivo sin caja abierta queda fuera del arqueo.' },
  { title: 'Registrá las ventas', segment: 'ventas', link: 'Ir a Ventas', text: 'Elegí productos, cantidades y pagos. Usá la misma ubicación; la venta descuenta stock.' },
  { title: 'Registrá los gastos', segment: 'gastos', link: 'Ir a Gastos', text: 'Anotá cada egreso pagado. El efectivo de esa ubicación se descuenta de la caja abierta.' },
  { title: 'Cerrá caja', segment: 'jornadas', link: 'Ir a Caja para cerrar', text: 'Contá el efectivo y explicá diferencias. Volvé a Caja y confirmá el cierre.' },
]

export function BusinessDashboard({
  business, navigate, catalogCount, physicalItemCount, storageLocationCount,
  pendingPurchaseCount, hasStock, movementCount, saleCount, openCashCount,
}: {
  business: Business
  navigate: Navigate
  catalogCount: number
  physicalItemCount: number
  storageLocationCount: number
  pendingPurchaseCount: number
  hasStock: boolean
  movementCount: number
  saleCount: number
  openCashCount: number
}) {
  const { mode } = useAppData()
  const nextAction = catalogCount === 0 ? { segment: 'catalogo', label: 'Preparar el catálogo' }
    : physicalItemCount > 0 && storageLocationCount === 0 ? { segment: 'ubicaciones', label: 'Preparar una ubicación' }
      : pendingPurchaseCount > 0 ? { segment: 'compras', label: 'Revisar recepciones pendientes' }
        : openCashCount > 0 ? { segment: 'ventas', label: 'Registrar una venta' }
          : physicalItemCount > 0 && !hasStock ? { segment: 'compras', label: 'Registrar una compra' }
            : { segment: 'jornadas', label: 'Abrir caja' }
  const statusItems = [
    { label: 'Por recibir', value: pendingPurchaseCount, note: 'Compras físicas pendientes' },
    { label: 'Cajas abiertas', value: openCashCount, note: 'En esta empresa' },
    { label: 'Ventas registradas', value: saleCount, note: mode === 'demo' ? 'Histórico de la demo' : 'Histórico del servidor' },
    { label: 'Movimientos de stock', value: movementCount, note: mode === 'demo' ? 'Histórico de la demo' : 'Histórico del servidor' },
  ]
  const preparationItems = [
    { label: 'Catálogo', segment: 'catalogo', icon: 'package' as const, text: 'Definí artículos, unidades y precios. Las fichas no crean stock.', status: catalogCount + ' fichas activas' },
    { label: 'Proveedores', segment: 'proveedores', icon: 'briefcase' as const, text: mode === 'api' ? 'Registrá el proveedor antes de crear una compra.' : 'Contactos para comprar. No son obligatorios.', status: mode === 'api' ? 'Requerido para comprar' : 'Preparación opcional' },
    { label: 'Ubicaciones', segment: 'ubicaciones', icon: 'pin' as const, text: 'Elegí dónde almacenás y vendés durante la jornada.', status: storageLocationCount + ' activas con almacenamiento' },
  ]

  return <div className="dashboard-home">
    <div className="page-heading dashboard-heading">
      <div><p className="eyebrow">JORNADA DE TRABAJO · {mode === 'demo' ? 'DEMO LOCAL' : 'CONECTADO'}</p><h1>Tu jornada en {business.name}</h1><p>Prepará la operación, registrá lo que pasa y cerrá la caja.</p></div>
      <AppLink to={businessHref(business.id, nextAction.segment)} navigate={navigate} className="button button-primary dashboard-primary-action">
        {nextAction.label} <Icon name="arrow" size={17}/>
      </AppLink>
    </div>

    <dl className="dashboard-status" aria-label="Estado registrado del negocio">
      {statusItems.map((item) => <div key={item.label} className="dashboard-status-item">
        <dt>{item.label}</dt><dd><strong>{item.value}</strong><span className="dashboard-status-note">{item.note}</span></dd>
      </div>)}
    </dl>

    <section className="journey-guide" aria-labelledby="journey-guide-title">
      <div className="section-header journey-guide-heading"><h2 id="journey-guide-title">Cómo recorrer la jornada</h2></div>
      <p className="journey-guide-intro">Entrá a la sección que necesitás; no hay módulos que activar. Caja se usa al abrir y al cerrar.</p>
      <ol className="journey-guide-list">
        {journeySteps.map((step, index) => <li key={step.title} className="journey-guide-step">
          <span className="journey-guide-number" aria-hidden="true">{index + 1}</span>
          <div className="journey-guide-copy"><h3>{step.title}</h3><p>{mode === 'api' && index === 2 ? 'Abrí la jornada antes de registrar cualquier venta o gasto. Sólo el efectivo integra el arqueo.' : step.text}</p>
            <AppLink to={businessHref(business.id, step.segment)} navigate={navigate} className="journey-guide-link">{step.link} <Icon name="arrow" size={15}/></AppLink>
          </div>
        </li>)}
      </ol>
    </section>

    <section className="dashboard-preparation" aria-labelledby="dashboard-preparation-title">
      <div className="section-header"><div><h2 id="dashboard-preparation-title">Antes de empezar, sólo si falta</h2><p>Reutilizá estos datos. El stock terminado se carga por conteo, sin recetas.</p></div></div>
      <ul className="dashboard-preparation-list">
        {preparationItems.map((item) => <li key={item.segment} className="dashboard-preparation-item">
          <AppLink to={businessHref(business.id, item.segment)} navigate={navigate} className="dashboard-preparation-link">
            <Icon name={item.icon} size={21}/><span><strong>{item.label}</strong><small>{item.text}</small><span className="preparation-status">{item.status}</span></span><Icon name="arrow" size={16}/>
          </AppLink>
        </li>)}
      </ul>
    </section>
  </div>
}
