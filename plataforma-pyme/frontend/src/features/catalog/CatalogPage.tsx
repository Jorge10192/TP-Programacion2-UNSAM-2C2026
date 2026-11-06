import { useState } from 'react'
import { CatalogDetailDialog } from './CatalogDetailDialog'
import { DemoImagePicker, DemoPhoto } from '../common/DemoPhoto'
import { demoImageKey } from '../../data/demo/imagePolicy'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon'
import type { IconName } from '../../app/navigation'
import { demoGateway } from '../../data/demo/demoStore'
import type { DemoBusiness, DemoCatalogItem } from '../../data/demo/demoStore'
import {
  catalogKinds, catalogKindLabels, catalogUnits, catalogUnitLabels,
  moneyDisplay, moneyInput, parseMoneyCents,
} from '../../data/demo/catalogPolicy'
import type { CatalogInput, CatalogKind, CatalogUnit } from '../../data/demo/catalogPolicy'

type CatalogDraft = Omit<CatalogInput, 'priceCents' | 'referenceCostCents'> & {
  priceText: string
  costText: string
}

const defaultDraft: CatalogDraft = {
  name: '', kind: 'REVENTA', category: 'General', sku: '', unit: 'UNIDAD',
  description: '', observations: '', sellable: true, priceText: '', costText: '',
}

const kindIcon: Record<CatalogKind, IconName> = {
  ELABORADO: 'package',
  REVENTA: 'shopping',
  INSUMO: 'boxes',
  SERVICIO: 'briefcase',
}

function draftOf(item: DemoCatalogItem): CatalogDraft {
  return {
    name: item.name, kind: item.kind, category: item.category, sku: item.sku,
    unit: item.unit, description: item.description, observations: item.observations ?? '', sellable: item.sellable,
    priceText: moneyInput(item.priceCents), costText: moneyInput(item.referenceCostCents),
  }
}

function toInput(draft: CatalogDraft): CatalogInput {
  return {
    name: draft.name, kind: draft.kind, category: draft.category, sku: draft.sku,
    unit: draft.unit, description: draft.description, observations: draft.observations, sellable: draft.sellable,
    priceCents: parseMoneyCents(draft.priceText),
    referenceCostCents: parseMoneyCents(draft.costText),
  }
}

export function CatalogPage({
  business, items,
}: {
  business: DemoBusiness
  items: DemoCatalogItem[]
}) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState<CatalogDraft>(defaultDraft)
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<CatalogKind | 'TODOS'>('TODOS')
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ACTIVO' | 'INACTIVO'>('ACTIVO')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [confirmationId, setConfirmationId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const active = items.filter((item) => item.status === 'ACTIVO').length
  const serviceCount = items.filter((item) => item.kind === 'SERVICIO').length
  const term = search.trim().toLocaleLowerCase('es-AR')
  const filtered = items.filter((item) => {
    if (kindFilter !== 'TODOS' && item.kind !== kindFilter) return false
    if (statusFilter !== 'TODOS' && item.status !== statusFilter) return false
    return !term || [item.name, item.sku, item.category, item.description]
      .some((value) => value.toLocaleLowerCase('es-AR').includes(term))
  })

  function startCreate() {
    setEditingId('new')
    setDraft(defaultDraft)
    setDetailId(null)
    setConfirmationId(null)
    setError('')
    setNotice('')
  }

  function startEdit(item: DemoCatalogItem) {
    setEditingId(item.id)
    setDraft(draftOf(item))
    setDetailId(null)
    setConfirmationId(null)
    setError('')
    setNotice('')
  }

  function cancelEdit() {
    setEditingId(null)
    setError('')
  }

  function setKind(kind: CatalogKind) {
    setDraft((current) => ({
      ...current,
      kind,
      unit: kind === 'SERVICIO' ? 'SERVICIO' : current.unit === 'SERVICIO' ? 'UNIDAD' : current.unit,
      sellable: kind === 'INSUMO' ? false : current.kind === 'INSUMO' ? true : current.sellable,
    }))
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || editingId === null) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const input = toInput(draft)
      if (editingId === 'new') {
        await demoGateway.createCatalogItem(business.id, input)
        setNotice('Artículo o servicio DEMO creado para «' + business.name + '». No se generó stock.')
      } else {
        await demoGateway.updateCatalogItem(business.id, editingId, input)
        setNotice('Ficha DEMO actualizada. No se modificaron cantidades de inventario.')
      }
      setEditingId(null)
      setStatusFilter('TODOS')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar el artículo.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleStatus(item: DemoCatalogItem) {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const status = item.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'
      await demoGateway.setCatalogItemStatus(business.id, item.id, status)
      setConfirmationId(null)
      setNotice(status === 'INACTIVO'
        ? 'Artículo inactivado. La ficha se conserva y aparece con el filtro Inactivos.'
        : 'Artículo reactivado en el catálogo DEMO.')
      setStatusFilter('TODOS')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado.')
    } finally {
      setBusy(false)
    }
  }

  const currentlyEditing = editingId !== null && editingId !== 'new'
    ? items.find((item) => item.id === editingId)
    : undefined
  const detailItem = detailId ? items.find((item) => item.id === detailId) : undefined

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">OPERACIONES · EMPRESA DEMO</p><h1>Catálogo general</h1><p>Productos, insumos y servicios de «{business.name}».</p></div>
      <button type="button" className="button button-primary" onClick={editingId === null ? startCreate : cancelEdit} disabled={busy}>
        <Icon name={editingId === null ? 'plus' : 'close'} size={18}/>
        {editingId === null ? 'Agregar artículo o servicio' : 'Cerrar formulario'}
      </button>
    </div>

    <section className="catalog-summary" aria-label="Resumen del catálogo">
      <div><span className="feature-icon blue"><Icon name="package"/></span><small>Fichas registradas</small><strong>{items.length}</strong></div>
      <div><span className="feature-icon mint"><Icon name="shield"/></span><small>Activas</small><strong>{active}</strong></div>
      <div><span className="feature-icon violet"><Icon name="briefcase"/></span><small>Servicios</small><strong>{serviceCount}</strong></div>
    </section>

    <div className="informational-note catalog-info-note"><Icon name="shield" size={19}/><span>
      Las fichas son exclusivas de esta empresa. Un <strong>servicio no tiene existencias físicas</strong>.
      Registrar un producto o insumo tampoco crea stock: las cantidades, compras y elaboraciones se incorporarán en otros módulos.
      Los precios son de demostración y se expresan en pesos argentinos (ARS).
    </span></div>

    {error && <p className="form-message error catalog-feedback" role="alert">{error}</p>}
    {notice && <p className="form-message success catalog-feedback" role="status">{notice}</p>}

    {editingId !== null && <section className="form-panel catalog-editor" aria-label="Formulario de catálogo">
      <div className="form-panel-header">
        <span className="feature-icon blue"><Icon name={currentlyEditing ? 'package' : 'plus'}/></span>
        <div><h2>{currentlyEditing ? 'Editar ficha de catálogo' : 'Agregar al catálogo'}</h2><p>
          {currentlyEditing ? 'Editás únicamente la ficha de «' + currentlyEditing.name + '».' : 'Creá un producto, insumo o servicio sin stock inicial obligatorio.'}
        </p></div>
      </div>
      <form className="demo-form" onSubmit={saveItem}>
        {currentlyEditing ? <DemoImagePicker imageKey={demoImageKey('catalog', business.id, currentlyEditing.id)} label="Imagen del artículo o servicio"/> :
          <p className="form-hint">Guardá primero la ficha; después vas a poder agregarle su foto desde «Editar».</p>}
        <div className="catalog-form-grid">
          <label className="form-field"><span>Nombre del artículo o servicio *</span>
            <input required minLength={2} maxLength={90} autoFocus value={draft.name} onChange={(e) => setDraft((x) => ({ ...x, name: e.target.value }))} placeholder="Ej.: Producto, insumo o servicio de prueba" />
          </label>
          <label className="form-field"><span>Tipo *</span>
            <select value={draft.kind} onChange={(e) => setKind(e.target.value as CatalogKind)}>
              {catalogKinds.map((kind) => <option key={kind} value={kind}>{catalogKindLabels[kind]}</option>)}
            </select>
          </label>
          <label className="form-field"><span>Categoría *</span>
            <input required maxLength={60} minLength={2} value={draft.category} onChange={(e) => setDraft((x) => ({ ...x, category: e.target.value }))} placeholder="Ej.: Accesorios / Servicios / Materiales" />
          </label>
          <label className="form-field"><span>Unidad de control *</span>
            <select value={draft.unit} disabled={draft.kind === 'SERVICIO'} onChange={(e) => setDraft((x) => ({ ...x, unit: e.target.value as CatalogUnit }))}>
              {catalogUnits.filter((unit) => draft.kind === 'SERVICIO' ? unit === 'SERVICIO' : unit !== 'SERVICIO').map((unit) =>
                <option key={unit} value={unit}>{catalogUnitLabels[unit]}</option>)}
            </select>
          </label>
          <label className="form-field"><span>SKU propio (opcional)</span>
            <input maxLength={32} autoComplete="off" value={draft.sku} onChange={(e) => setDraft((x) => ({ ...x, sku: e.target.value }))} placeholder="Ej.: ART-001" />
          </label>
          <label className="form-field"><span>Precio de lista (ARS, opcional)</span>
            <input inputMode="decimal" maxLength={14} autoComplete="off" value={draft.priceText} onChange={(e) => setDraft((x) => ({ ...x, priceText: e.target.value }))} placeholder="Ej.: 1500,50" />
          </label>
          <label className="form-field"><span>Costo de referencia (ARS, opcional)</span>
            <input inputMode="decimal" maxLength={14} autoComplete="off" value={draft.costText} onChange={(e) => setDraft((x) => ({ ...x, costText: e.target.value }))} placeholder="Ej.: 800,00" />
          </label>
          <div className="catalog-sellable">
            <label><input type="checkbox" checked={draft.sellable} onChange={(e) => setDraft((x) => ({ ...x, sellable: e.target.checked }))}/>
              <span><strong>Disponible para ofrecer o vender</strong><small>Un insumo puede ser sólo para consumo interno.</small></span>
            </label>
          </div>
        </div>
        <label className="form-field"><span>Descripción comercial (opcional)</span>
          <textarea rows={3} maxLength={450} value={draft.description} onChange={(e) => setDraft((x) => ({ ...x, description: e.target.value }))} placeholder="Información pública o comercial visible en la ficha."/>
        </label>
        <label className="form-field"><span>Observaciones internas (opcional)</span>
          <textarea rows={3} maxLength={600} value={draft.observations} onChange={(e) => setDraft((x) => ({ ...x, observations: e.target.value }))} placeholder="Indicaciones internas, cuidados y recordatorios del equipo."/>
          <small>Se guardan en esta DEMO local; todavía no existe autorización de lectura desde un servidor.</small>
        </label>
        <p className="form-hint">El SKU es único dentro de cada empresa, pero puede repetirse en negocios diferentes. No se convierten automáticamente paquetes, cajas ni kilos a otras unidades. Sin precio significa «A cotizar».</p>
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={cancelEdit} disabled={busy}>Cancelar</button>
          <button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Guardando…' : currentlyEditing ? 'Guardar cambios' : 'Agregar a catálogo DEMO'}</button>
        </div>
      </form>
    </section>}

    <section className="form-panel catalog-list-panel">
      <div className="business-section-heading catalog-list-heading">
        <div><Icon name="package" size={22}/><h2>Artículos y servicios</h2></div>
        <span>{filtered.length} visibles de {items.length}</span>
      </div>
      <div className="catalog-filters">
        <label className="form-field"><span>Buscar por nombre, SKU, categoría o descripción</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar en el catálogo…" />
        </label>
        <label className="form-field"><span>Tipo</span>
          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as CatalogKind | 'TODOS')}>
            <option value="TODOS">Todos los tipos</option>
            {catalogKinds.map((kind) => <option key={kind} value={kind}>{catalogKindLabels[kind]}</option>)}
          </select>
        </label>
        <label className="form-field"><span>Estado</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option><option value="TODOS">Todos</option>
          </select>
        </label>
      </div>

      {items.length === 0 && <div className="catalog-empty">
        <span className="feature-icon blue"><Icon name="package" size={25}/></span>
        <h3>Tu catálogo todavía está vacío</h3>
        <p>Agregá tu primer producto, insumo o servicio. Una empresa de servicios puede empezar sin inventario ni ubicaciones.</p>
        {editingId === null && <button className="button button-primary" type="button" onClick={startCreate}><Icon name="plus" size={17}/> Agregar primera ficha</button>}
      </div>}
      {items.length > 0 && filtered.length === 0 && <div className="catalog-empty">
        <h3>Sin coincidencias</h3><p>Probá otra búsqueda o cambiá los filtros. Las fichas inactivas se conservan en el catálogo.</p>
        <button className="button button-secondary" type="button" onClick={() => { setSearch(''); setKindFilter('TODOS'); setStatusFilter('TODOS') }}>Limpiar filtros</button>
      </div>}
      <div className="catalog-grid">
        {filtered.map((item) => <article key={item.id} className={'catalog-card'+(item.status === 'INACTIVO' ? ' catalog-card-inactive' : '')}>
          <div className="catalog-card-head">
            <DemoPhoto imageKey={demoImageKey('catalog', business.id, item.id)} alt={'Imagen de ' + item.name}
              fallback={<Icon name={kindIcon[item.kind]} size={23}/>} className="feature-icon blue demo-photo-list"/>
            <div className="catalog-card-title"><h3>{item.name}</h3><span>{catalogKindLabels[item.kind]}</span></div>
            <span className={'catalog-state '+(item.status === 'ACTIVO' ? 'is-active' : 'is-inactive')}>{item.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span>
          </div>
          <div className="catalog-tags"><span>{item.category}</span><span>{catalogUnitLabels[item.unit]}</span>{item.sku && <span>SKU: {item.sku}</span>}</div>
          <p className="catalog-description">{item.description || 'Sin descripción comercial.'}</p>
          <div className="catalog-value-row">
            <div><small>Precio de lista</small><strong>{item.sellable ? moneyDisplay(item.priceCents) : 'No ofrecido a la venta'}</strong></div>
            <div><small>Costo de referencia</small><strong>{item.referenceCostCents === null ? 'No informado' : moneyDisplay(item.referenceCostCents)}</strong></div>
          </div>
          <div className="catalog-card-note">{item.kind === 'SERVICIO'
            ? 'Servicio: sin stock físico propio'
            : 'Producto o material: stock todavía no integrado'}</div>
          <div className="catalog-card-actions">
            <button type="button" className="button button-secondary" onClick={() => { setDetailId(item.id); setConfirmationId(null) }}>Ver ficha</button>
            <button type="button" className="button button-secondary" onClick={() => startEdit(item)} disabled={busy}>Editar</button>
            <button type="button" className="button button-secondary" onClick={() => { setConfirmationId(confirmationId === item.id ? null : item.id); setDetailId(null) }} disabled={busy}>{item.status === 'ACTIVO' ? 'Desactivar' : 'Reactivar'}</button>
          </div>
          {confirmationId === item.id && <section className="catalog-confirm">
            <p>¿Querés {item.status === 'ACTIVO' ? 'desactivar' : 'reactivar'} esta ficha? No se borra su registro ni se modifican existencias.</p>
            <div><button className="button button-secondary" type="button" onClick={() => setConfirmationId(null)} disabled={busy}>Cancelar</button>
              <button className="button button-primary" type="button" onClick={() => toggleStatus(item)} disabled={busy}>{busy ? 'Procesando…' : 'Confirmar'}</button></div>
          </section>}
        </article>)}
      </div>
    </section>
    {detailItem && <CatalogDetailDialog
      item={detailItem}
      onClose={() => setDetailId(null)}
      onEdit={(item) => startEdit(item)}
    />}
  </>
}
