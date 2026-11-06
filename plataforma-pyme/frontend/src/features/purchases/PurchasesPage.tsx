import { useState } from 'react'
import { Icon } from '../../app/Icon'
import type { DemoBusiness, DemoCatalogItem, DemoLocation, DemoPurchase, DemoSupplier } from '../../data/demo/demoStore'
import { moneyDisplay } from '../../data/demo/catalogPolicy'
import { physicalPurchaseLines, quantityText } from '../../data/demo/purchasePolicy'
import { PurchaseForm } from './PurchaseForm'
import { PurchaseDetailDialog } from './PurchaseDetailDialog'

type PurchaseFilter = 'TODAS' | 'PENDIENTE' | 'RECIBIDA' | 'INFORMATIVA'
function receiptState(purchase: DemoPurchase): Exclude<PurchaseFilter, 'TODAS'> {
  if (purchase.receipt) return 'RECIBIDA'
  return physicalPurchaseLines(purchase.lines).length ? 'PENDIENTE' : 'INFORMATIVA'
}
const purchaseStatusLabels: Record<Exclude<PurchaseFilter, 'TODAS'>, string> = {
  PENDIENTE: 'Pendiente de recepción',
  RECIBIDA: 'Recepción confirmada',
  INFORMATIVA: 'Sin recepción física',
}

export function PurchasesPage({
  business, purchases, catalog, suppliers, locations,
}: {
  business: DemoBusiness
  purchases: DemoPurchase[]
  catalog: DemoCatalogItem[]
  suppliers: DemoSupplier[]
  locations: DemoLocation[]
}) {
  const [creating, setCreating] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<PurchaseFilter>('TODAS')
  const [notice, setNotice] = useState('')

  const pending = purchases.filter((item) => receiptState(item) === 'PENDIENTE').length
  const received = purchases.filter((item) => receiptState(item) === 'RECIBIDA').length
  const term = query.trim().toLocaleLowerCase('es-AR')
  const filtered = purchases.filter((item) =>
    (filter === 'TODAS' || receiptState(item) === filter) &&
    (!term || [
      item.supplierNameSnapshot, item.reference, item.purchasedOn, item.notes,
      ...item.lines.map((line) => line.description), ...item.lines.map((line) => line.sku),
    ].some((value) => value.toLocaleLowerCase('es-AR').includes(term))))
  const detailed = detailId ? purchases.find((item) => item.id === detailId) : undefined

  function saveSuccess(id: string, containsPhysicalGoods: boolean) {
    setCreating(false)
    setNotice(containsPhysicalGoods
      ? 'Compra guardada. El paso pendiente es elegir la ubicación y confirmar la recepción de los bienes para que ingresen a Inventario.'
      : 'Compra registrada en esta empresa. No hay recepción física pendiente ni se registró un pago.')
    setFilter('TODAS')
    setDetailId(id)
  }

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">OPERACIONES · EMPRESA DEMO</p><h1>Compras</h1>
        <p>Compras y recepciones de «{business.name}», vinculadas con tu Catálogo y Proveedores.</p></div>
      <button className="button button-primary" type="button" onClick={() => { setCreating((x) => !x); setNotice('') }}>
        <Icon name={creating ? 'close' : 'plus'} size={17}/>
        {creating ? 'Cerrar formulario' : 'Registrar compra'}
      </button>
    </div>

    <section className="purchase-summary" aria-label="Indicadores de compras DEMO">
      <div><span className="feature-icon blue"><Icon name="receipt"/></span><small>Compras registradas</small><strong>{purchases.length}</strong></div>
      <div><span className="feature-icon orange"><Icon name="clock"/></span><small>Pendientes de recepción</small><strong>{pending}</strong></div>
      <div><span className="feature-icon mint"><Icon name="shield"/></span><small>Con recepción confirmada</small><strong>{received}</strong></div>
    </section>

    <div className="informational-note purchase-note">
      <Icon name="shield" size={19}/>
      <span>Registrar una compra <strong>no equivale a pagar ni recibir mercadería</strong>. Las entradas de stock requieren una confirmación posterior en una ubicación que permita almacenar; los servicios y conceptos libres nunca generan existencias físicas.</span>
    </div>

    {notice && <p className="form-message success purchase-page-message" role="status">{notice}</p>}

    {creating && <PurchaseForm
      key={business.id}
      business={business} catalog={catalog} suppliers={suppliers}
      onSaved={saveSuccess} onCancel={() => setCreating(false)}
    />}

    <section className="form-panel purchase-history">
      <div className="business-section-heading purchase-section-heading">
        <div><Icon name="receipt" size={22}/><h2>Historial de compras</h2></div>
        <span>{filtered.length} visibles de {purchases.length}</span>
      </div>

      <div className="purchase-filters">
        <label className="form-field"><span>Buscar por proveedor, concepto, SKU o comprobante</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en compras…"/>
        </label>
        <label className="form-field"><span>Estado de recepción</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value as PurchaseFilter)}>
            <option value="TODAS">Todas las compras</option>
            <option value="PENDIENTE">Pendiente de recepción</option>
            <option value="RECIBIDA">Recepción confirmada</option>
            <option value="INFORMATIVA">Sin recepción física</option>
          </select>
        </label>
      </div>

      {purchases.length === 0 && <div className="catalog-empty">
        <span className="feature-icon blue"><Icon name="shopping" size={25}/></span>
        <h3>Todavía no registraste compras</h3>
        <p>Podés empezar con un proveedor del directorio o con un concepto libre. Para ingresar artículos físicos, primero deben existir en Catálogo y una ubicación apta para almacenar.</p>
        {!creating && <button type="button" className="button button-primary" onClick={() => setCreating(true)}><Icon name="plus" size={16}/> Primera compra DEMO</button>}
      </div>}

      {purchases.length > 0 && filtered.length === 0 && <div className="catalog-empty">
        <h3>No hay resultados con estos filtros</h3>
        <p>Cambiá el estado de recepción o probá otra búsqueda.</p>
        <button type="button" className="button button-secondary" onClick={() => { setFilter('TODAS'); setQuery('') }}>Limpiar filtros</button>
      </div>}

      <div className="purchase-list">
        {filtered.map((purchase) => {
          const state = receiptState(purchase)
          return <article key={purchase.id} className="purchase-card">
            <div className="purchase-card-icon"><Icon name="shopping" size={21}/></div>
            <div className="purchase-card-copy">
              <div className="purchase-card-title"><h3>{purchase.supplierNameSnapshot || 'Compra sin proveedor'}</h3>
                <span className={'purchase-state state-' + state.toLowerCase()}>{purchaseStatusLabels[state]}</span>
              </div>
              <p>{new Date(purchase.purchasedOn + 'T12:00:00').toLocaleDateString('es-AR')} · {purchase.reference || 'Sin comprobante'} · {purchase.lines.length} {purchase.lines.length === 1 ? 'renglón' : 'renglones'}</p>
              <div className="purchase-card-items">{purchase.lines.slice(0, 3).map((line) =>
                <span key={line.id}>{line.description} · {quantityText(line.quantityMilli, line.unit)}</span>)}
                {purchase.lines.length > 3 && <span>+ {purchase.lines.length - 3} más</span>}
              </div>
            </div>
            <div className="purchase-card-right">
              <strong>{moneyDisplay(purchase.totalCents)}</strong>
              <button type="button" className="button button-secondary" onClick={() => setDetailId(purchase.id)}>
                {state === 'PENDIENTE' ? 'Confirmar ubicación y recepción' : 'Ver compra'} <Icon name="arrow" size={15}/>
              </button>
            </div>
          </article>
        })}
      </div>
    </section>

    {detailed && <PurchaseDetailDialog
      purchase={detailed} business={business} locations={locations}
      onClose={() => setDetailId(null)}
    />}
  </>
}
