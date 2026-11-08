import { AppLink } from '../../app/AppLink'
import { Icon } from '../../app/Icon'
import { DemoPhoto } from '../common/DemoPhoto'
import { businessHref } from '../../app/navigation'
import type { Business } from '../../app/navigation'
import type { Navigate } from '../../app/types'
import { useAppData } from '../../data/dataContext'

export function Welcome({ navigate, businesses }: { navigate: Navigate; businesses: Business[] }) {
  const { mode, capabilities } = useAppData()

  return <div className="personal-home">
    <div className="page-heading personal-heading">
      <div><p className="eyebrow">ASISTENTE PYME - {mode === 'demo' ? 'DEMO LOCAL' : 'CONECTADO'}</p><h1>Mis empresas</h1><p>Elegí una empresa para trabajar. Cada una conserva su catálogo, stock, ventas y caja.</p></div>
      <AppLink to="/empresas/nueva" navigate={navigate} className="button button-primary"><Icon name="plus" size={17}/>Crear empresa</AppLink>
    </div>
    {capabilities.multiBusiness && <section aria-label="Empresas disponibles">
      {businesses.length === 0 && <p>Todavía no tenés empresas. Creá la primera para empezar.</p>}
      <div className="company-grid">
      {businesses.map((business) => <button type="button" className="company-card" aria-label={'Entrar a ' + business.name} key={business.id} onClick={() => navigate(businessHref(business.id, 'inicio'))}>
        <DemoPhoto target={{ scope: 'business', businessId: business.id, entityId: 'logo' }} alt={'Logo de ' + business.name}
          fallback={business.initials} className={'company-icon ' + business.accent}/>
        <span className="company-copy"><strong>{business.name}</strong><small>{business.category}</small><span className="small-pill">{business.source === 'server' ? 'Mi empresa' : 'Empresa DEMO'}</span></span>
        <Icon name="arrow" size={19} className="company-arrow" />
      </button>)}
      <button type="button" className="company-card new-company" onClick={() => navigate('/empresas/nueva')}>
        <span className="company-icon add-company"><Icon name="plus" size={23} /></span>
        <span className="company-copy"><strong>Crear una empresa</strong><small>Agregá otro negocio a tu espacio.</small></span>
        <Icon name="arrow" size={19} className="company-arrow" />
      </button>
      </div>
    </section>}
    <div className="informational-note personal-demo-note"><Icon name="shield" size={18}/><span>{mode === 'demo' ? 'Los datos son de demostración y se guardan en este navegador. No hay acceso seguro ni cobros reales.' : 'Los datos se consultan y guardan en el servidor. Los pagos son declaraciones, no acreditaciones bancarias.'}</span></div>
  </div>
}

const journeySteps = [
  { title: 'Comprá y recibí', segment: 'compras', link: 'Ir a Compras', text: 'Guardá la compra y confirmá la recepción para sumar stock.' },
  { title: 'Revisá el stock', segment: 'inventario', link: 'Consultar Stock', text: 'Contá y cargá las unidades de producto terminado.' },
  { title: 'Abrí caja', segment: 'jornadas', link: 'Abrir Caja', text: 'Indicá el efectivo inicial antes de vender.' },
  { title: 'Registrá las ventas', segment: 'ventas', link: 'Ir a Ventas', text: 'Elegí productos, cantidades y medios de pago.' },
  { title: 'Registrá los gastos', segment: 'gastos', link: 'Ir a Gastos', text: 'Anotá los gastos pagados durante la jornada.' },
  { title: 'Cerrá caja', segment: 'jornadas', link: 'Ir a Caja para cerrar', text: 'Contá el efectivo y explicá cualquier diferencia.' },
]

export function BusinessDashboard({
  business, navigate, catalogCount, physicalItemCount, storageLocationCount, supplierCount,
  pendingPurchaseCount, hasStock, openCashCount,
}: {
  business: Business
  navigate: Navigate
  catalogCount: number
  physicalItemCount: number
  storageLocationCount: number
  supplierCount: number
  pendingPurchaseCount: number
  hasStock: boolean
  openCashCount: number
}) {
  const { mode } = useAppData()
  const needsPreparation = catalogCount === 0 || physicalItemCount > 0 && storageLocationCount === 0
  const nextAction = catalogCount === 0 ? { segment: 'catalogo', label: 'Preparar el catálogo' }
    : physicalItemCount > 0 && storageLocationCount === 0 ? { segment: 'ubicaciones', label: 'Preparar una ubicación' }
      : pendingPurchaseCount > 0 ? { segment: 'compras', label: 'Revisar recepciones pendientes' }
        : openCashCount > 0 ? { segment: 'ventas', label: 'Registrar una venta' }
          : physicalItemCount > 0 && !hasStock ? { segment: 'compras', label: 'Registrar una compra' }
            : { segment: 'jornadas', label: 'Abrir caja' }
  const statusItems = [
    { label: 'Por recibir', value: pendingPurchaseCount, note: 'Compras físicas pendientes' },
    { label: 'Caja', value: openCashCount > 0 ? (openCashCount === 1 ? 'Abierta' : openCashCount + ' abiertas') : 'Cerrada', note: openCashCount > 0 ? 'Lista para registrar ventas y gastos' : 'Abrila antes de vender' },
  ]
  const preparationItems = [
    { label: 'Catálogo', segment: 'catalogo', icon: 'package' as const, text: 'Definí artículos, unidades y precios. Las fichas no crean stock.', status: catalogCount + ' fichas activas' },
    { label: 'Proveedores', segment: 'proveedores', icon: 'briefcase' as const, text: 'Contactos para comprar. No son obligatorios.', status: supplierCount + ' activos' },
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
      <p className="journey-guide-intro">{business.kind === 'SERVICIOS' ? 'Prepará tus servicios, abrí una caja general y registrá la operación. No necesitás stock ni local.' : 'Prepará el stock, abrí caja y registrá la operación. Al terminar, volvé a Caja para cerrar.'}</p>
      <ol className="journey-guide-list">
        {journeySteps.filter(step => business.kind !== 'SERVICIOS' || !['compras','inventario'].includes(step.segment)).map((step, index) => <li key={step.title} className="journey-guide-step">
          <span className="journey-guide-number" aria-hidden="true">{index + 1}</span>
          <div className="journey-guide-copy"><h3>{step.title}</h3><p>{step.text}</p>
            <AppLink to={businessHref(business.id, step.segment)} navigate={navigate} className="journey-guide-link">{step.link} <Icon name="arrow" size={15}/></AppLink>
          </div>
        </li>)}
      </ol>
    </section>

    <details className="dashboard-preparation" open={needsPreparation}>
      <summary>Preparación del negocio</summary>
      <ul className="dashboard-preparation-list">
        {preparationItems.map((item) => <li key={item.segment} className="dashboard-preparation-item">
          <AppLink to={businessHref(business.id, item.segment)} navigate={navigate} className="dashboard-preparation-link">
            <Icon name={item.icon} size={21}/><span><strong>{item.label}</strong><small>{item.text}</small><span className="preparation-status">{item.status}</span></span><Icon name="arrow" size={16}/>
          </AppLink>
        </li>)}
      </ul>
    </details>
  </div>
}
