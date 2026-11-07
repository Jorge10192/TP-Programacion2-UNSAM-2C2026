import { useState } from 'react'
import { Icon } from '../../app/Icon'
import type { DemoBusiness, DemoCatalogItem, DemoLocation } from '../../data/demo/demoStore'
import type { InventoryMovement, InventoryOperation } from '../../data/demo/inventoryPolicy'
import { inventoryHistoryEntries, inventoryMovementLabels, stockBalances, stockKey } from '../../data/demo/inventoryPolicy'
import { quantityText } from '../../data/demo/purchasePolicy'
import { InventoryActionForm } from './InventoryActionForm'
import { InventoryBatchCount } from './InventoryBatchCount'
import { DemoPhoto } from '../common/DemoPhoto'
import { demoImageKey } from '../../data/demo/imagePolicy'

type Tab = 'stock' | 'movements'
type Row = { item: DemoCatalogItem; location: DemoLocation; milli: number }
const movementsFilters = [
  { value: 'RECEPCION_COMPRA', label: 'Recepciones de compras' },
  { value: 'VENTA_SALIDA', label: 'Salidas por ventas' },
  { value: 'TRANSFER', label: 'Traslados entre ubicaciones' },
  { value: 'AJUSTE_CONTEO', label: 'Ajustes por conteo individual' },
  { value: 'BATCH_COUNT', label: 'Controles de stock por ubicación' },
] as const

export function InventoryPage({
  business, catalog, locations, movements, operations, initialTab,
}: {
  business: DemoBusiness
  catalog: DemoCatalogItem[]
  locations: DemoLocation[]
  movements: InventoryMovement[]
  operations: InventoryOperation[]
  initialTab: Tab
}) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [action, setAction] = useState<'TRANSFER' | 'COUNT' | 'BATCH' | null>(null)
  const [formVersion, setFormVersion] = useState(0)
  const [query, setQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [notice, setNotice] = useState('')
  const [showEmpty, setShowEmpty] = useState(false)
  const physical = catalog.filter((item) => item.kind !== 'SERVICIO')
  const locById = new Map(locations.map((loc) => [loc.id, loc]))
  const itemById = new Map(physical.map((item) => [item.id, item]))
  const balances = stockBalances(movements)
  const positivePairs = [...balances.values()].filter((quantity) => quantity > 0).length
  const stockedArticles = new Set(
    [...balances].filter(([, quantity]) => quantity > 0).map(([key]) => (JSON.parse(key) as string[])[1]),
  ).size
  const receipts = movements.filter((movement) => movement.type === 'RECEPCION_COMPRA').length
  const history = inventoryHistoryEntries(movements, operations)

  const rows: Row[] = []
  if (locationFilter || showEmpty) {
    for (const location of locations) {
      if (locationFilter && location.id !== locationFilter) continue
      if (!location.canStore && ![...balances.keys()].some((key) => (JSON.parse(key) as string[])[0] === location.id)) continue
      for (const item of physical) {
        const milli = balances.get(stockKey(location.id, item.id)) ?? 0
        rows.push({ item, location, milli })
      }
    }
  } else {
    for (const [key, milli] of balances) {
      if (milli <= 0) continue
      const [locationId, itemId] = JSON.parse(key) as [string, string]
      const item = itemById.get(itemId)
      const location = locById.get(locationId)
      if (item && location) rows.push({ item, location, milli })
    }
  }
  const term = query.trim().toLocaleLowerCase('es-AR')
  const filteredRows = rows.filter(({ item, location, milli }) =>
    (locationFilter === '' || location.id === locationFilter) &&
    (!term || [item.name, item.sku, item.category, location.name].some((x) => x.toLocaleLowerCase('es-AR').includes(term))) &&
    (showEmpty || milli > 0 || locationFilter !== ''))
    .sort((a, b) => a.item.name.localeCompare(b.item.name, 'es') || a.location.name.localeCompare(b.location.name, 'es'))
  const shownRows = filteredRows.slice(0, 150)
  const filteredHistory = history.filter((entry) => {
    const places = entry.kind === 'TRANSFER'
      ? [entry.sourceLocationId, entry.destinationLocationId]
      : [entry.kind === 'BATCH_COUNT' ? entry.locationId : entry.movement.locationId]
    if (locationFilter && !places.includes(locationFilter)) return false
    if (typeFilter) {
      const isTransfer = entry.kind === 'TRANSFER' ||
        (entry.kind === 'MOVEMENT' && (entry.movement.type === 'TRASLADO_SALIDA' || entry.movement.type === 'TRASLADO_ENTRADA'))
      if (typeFilter === 'TRANSFER' && !isTransfer) return false
      if (typeFilter === 'BATCH_COUNT' && entry.kind !== 'BATCH_COUNT') return false
      if (typeFilter !== 'TRANSFER' && typeFilter !== 'BATCH_COUNT' &&
          (entry.kind !== 'MOVEMENT' || entry.movement.type !== typeFilter)) return false
    }
    if (!term) return true
    const searchable = entry.kind === 'BATCH_COUNT'
      ? [entry.reason, ...entry.lines.flatMap((line) => [
        line.itemNameSnapshot, itemById.get(line.catalogItemId)?.sku ?? '',
      ])]
      : entry.kind === 'TRANSFER'
        ? [entry.itemNameSnapshot, entry.reference, entry.reason, itemById.get(entry.catalogItemId)?.sku ?? '']
        : [entry.movement.itemNameSnapshot, entry.movement.reference,
          entry.movement.reason, itemById.get(entry.movement.catalogItemId)?.sku ?? '']
    return [...searchable, ...places.map((place) => locById.get(place)?.name ?? '')]
      .some((value) => value.toLocaleLowerCase('es-AR').includes(term))
  })
  const shownHistory = filteredHistory.slice(0, 90)
  const canMove = locations.filter((loc) => loc.status === 'ACTIVA' && loc.canStore).length >= 2
  const canCount = locations.some((loc) => loc.status === 'ACTIVA' && loc.canStore)
  const canAct = physical.some((item) => item.status === 'ACTIVO')

  function startAction(kind: 'TRANSFER' | 'COUNT' | 'BATCH') {
    setAction(kind)
    setFormVersion((n) => n + 1)
    setNotice('')
  }
  function completed(message: string) {
    setAction(null)
    setNotice(message)
    setTab('movements')
    setTypeFilter('')
  }

  return <>
    <div className="page-heading">
      <div>
        <p className="eyebrow">OPERACIONES · EMPRESA DEMO</p>
        <h1>{initialTab === 'movements' ? 'Movimientos de inventario' : 'Inventario'}</h1>
        <p>Existencias por ubicación calculadas a partir de recepciones, traslados y conteos en «{business.name}».</p>
      </div>
      <div className="inventory-heading-actions">
        <button type="button" className="button button-secondary" disabled={!canAct || !canMove}
          onClick={() => startAction('TRANSFER')}><Icon name="truck" size={17}/> Trasladar</button>
        <button type="button" className="button button-secondary" disabled={!canAct || !canCount}
          onClick={() => startAction('COUNT')}><Icon name="plus" size={17}/> Ajuste rápido</button>
        <button type="button" className="button button-primary" disabled={!canAct || !canCount}
          onClick={() => startAction('BATCH')}><Icon name="boxes" size={17}/> Control de stock</button>
      </div>
    </div>

    <section className="inventory-summary" aria-label="Indicadores de inventario DEMO">
      <div><span className="feature-icon blue"><Icon name="package" size={20}/></span><small>Artículos con stock</small><strong>{stockedArticles}</strong></div>
      <div><span className="feature-icon mint"><Icon name="pin" size={20}/></span><small>Combinaciones artículo / ubicación con stock</small><strong>{positivePairs}</strong></div>
      <div><span className="feature-icon violet"><Icon name="receipt" size={20}/></span><small>Entradas por recepción</small><strong>{receipts}</strong></div>
      <div><span className="feature-icon orange"><Icon name="clock" size={20}/></span><small>Operaciones de inventario</small><strong>{history.length}</strong></div>
    </section>

    <div className="informational-note inventory-note">
      <Icon name="shield" size={20}/>
      <span>Los saldos se derivan de recepciones, traslados, conteos y ventas registradas, en la <strong>unidad de cada artículo</strong>; no se suman cajas con unidades ni kilos con gramos. Esta DEMO no incluye reservas, lotes, producción ni concurrencia real entre dispositivos.</span>
    </div>
    {!canCount && <div className="inventory-attention">Para registrar un conteo o traslado, primero configurá al menos una ubicación activa con «Puede almacenar» en Ubicaciones. Para traslados necesitás dos.</div>}
    {!canAct && <div className="inventory-attention">Para operar, primero agregá un artículo físico activo (no un servicio) en Catálogo.</div>}
    {notice && <p className="form-message success inventory-notice" role="status">{notice}</p>}

    {action === 'BATCH' ? <InventoryBatchCount
      key={business.id + '-batch-' + formVersion}
      business={business} catalog={catalog} locations={locations} movements={movements}
      onDone={completed} onCancel={() => setAction(null)}
    /> : action && <InventoryActionForm
      key={business.id + '-' + action + '-' + formVersion}
      kind={action} business={business} catalog={catalog} locations={locations} movements={movements}
      onDone={completed} onCancel={() => setAction(null)}
    />}

    <section className="form-panel inventory-main-panel">
      <div className="inventory-tabs" role="tablist" aria-label="Vistas de inventario">
        <button type="button" role="tab" aria-selected={tab === 'stock'} className={tab === 'stock' ? 'active' : ''}
          onClick={() => setTab('stock')}><Icon name="boxes" size={17}/> Existencias</button>
        <button type="button" role="tab" aria-selected={tab === 'movements'} className={tab === 'movements' ? 'active' : ''}
          onClick={() => setTab('movements')}><Icon name="truck" size={17}/> Historial de movimientos</button>
      </div>
      <div className="inventory-filters">
        <label className="form-field"><span>Buscar artículo, SKU, ubicación o motivo</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar…"/>
        </label>
        <label className="form-field"><span>Ubicación</span>
          <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
            <option value="">Todas las ubicaciones</option>
            {locations.map((location) =>
              <option key={location.id} value={location.id}>{location.name}{location.status === 'PAUSADA' ? ' (pausada)' : ''}</option>)}
          </select>
        </label>
        {tab === 'movements' && <label className="form-field"><span>Tipo de movimiento</span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">Todos los movimientos</option>
            {movementsFilters.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>}
      </div>

      {tab === 'stock' ? <>
        <div className="inventory-table-heading">
          <div><h2>Existencias físicas</h2><p>{filteredRows.length} combinaciones visibles · valores en unidad de control</p></div>
          <label className="inventory-toggle"><input type="checkbox" checked={showEmpty} onChange={(event) => setShowEmpty(event.target.checked)}/> Incluir saldos en cero</label>
        </div>
        {filteredRows.length === 0 ? <div className="catalog-empty">
          <span className="feature-icon blue"><Icon name="boxes" size={25}/></span>
          <h3>No hay existencias con estos filtros</h3>
          <p>El stock aparecerá al confirmar una recepción de compra o registrar un conteo físico. Si querés ver artículos sin saldo, seleccioná una ubicación o activá «Incluir saldos en cero».</p>
        </div> : <>
          <div className="inventory-stock-list">
            {shownRows.map(({ item, location, milli }) => <article className="inventory-stock-row" key={stockKey(location.id, item.id)}>
              <DemoPhoto imageKey={demoImageKey('catalog', business.id, item.id)}
                alt={'Imagen de ' + item.name}
                fallback={<Icon name="package" size={20}/>}
                className="inventory-stock-photo inventory-stock-icon"/>
              <div className="inventory-stock-description">
                <strong>{item.name}</strong><small>{item.sku ? 'SKU: ' + item.sku + ' · ' : ''}{item.kind === 'INSUMO' ? 'Insumo' : item.kind === 'ELABORADO' ? 'Elaboración' : 'Reventa'}</small>
              </div>
              <div className="inventory-stock-location"><Icon name="pin" size={15}/>{location.name}{location.status === 'PAUSADA' ? ' · Pausada' : ''}</div>
              <div className={'inventory-stock-quantity ' + (milli > 0 ? 'positive' : 'zero')}>
                <strong>{quantityText(milli, item.unit)}</strong>
                <small>{milli > 0 ? 'Existencia registrada' : 'Sin existencias'}</small>
              </div>
            </article>)}
          </div>
          {filteredRows.length > shownRows.length && <p className="inventory-limit">Mostrando las primeras {shownRows.length} combinaciones. Usá los filtros para consultar el resto.</p>}
        </>}
      </> : <>
        <div className="inventory-table-heading">
          <div><h2>Trazabilidad de movimientos</h2><p>{filteredHistory.length} operaciones · los traslados y controles múltiples se agrupan por operación</p></div>
        </div>
        {filteredHistory.length === 0 ? <div className="catalog-empty">
          <span className="feature-icon blue"><Icon name="truck" size={25}/></span>
          <h3>Todavía no hay movimientos</h3><p>La confirmación de una compra con bienes físicos aparece aquí automáticamente.</p>
        </div> : <>
          <div className="inventory-movement-list">
            {shownHistory.map((entry) => entry.kind === 'TRANSFER' ? (
              <article className="inventory-movement-row" key={entry.id}>
                <span className="inventory-movement-icon transfer"><Icon name="truck" size={19}/></span>
                <div className="inventory-movement-info">
                  <strong>{entry.itemNameSnapshot}</strong>
                  <span><b>Traslado</b> · {locById.get(entry.sourceLocationId)?.name ?? 'Ubicación histórica'} → {locById.get(entry.destinationLocationId)?.name ?? 'Ubicación histórica'}</span>
                  <small>{entry.reason}{entry.reference ? ' · ' + entry.reference : ''}</small>
                </div>
                <div className="inventory-movement-aside">
                  <strong className="transfer-quantity">{quantityText(entry.quantityMilli, entry.unit)}</strong>
                  <small>Trasladadas · {new Date(entry.createdAt).toLocaleString('es-AR')}</small>
                </div>
              </article>
            ) : entry.kind === 'BATCH_COUNT' ? (
              <details className="inventory-audit-history" key={entry.id}>
                <summary className="inventory-movement-row">
                  <span className="inventory-movement-icon transfer"><Icon name="boxes" size={19}/></span>
                  <div className="inventory-movement-info">
                    <strong>Control de stock · {locById.get(entry.locationId)?.name ?? 'Ubicación histórica'}</strong>
                    <span>{entry.lines.length} artículos revisados · {entry.lines.filter((line) => line.deltaMilli !== 0).length} diferencias</span>
                    <small>{entry.reason}</small>
                  </div>
                  <div className="inventory-movement-aside">
                    <strong className="transfer-quantity">Una sesión</strong>
                    <small>{new Date(entry.createdAt).toLocaleString('es-AR')} · Ver detalle ▾</small>
                  </div>
                </summary>
                <div className="inventory-audit-history-lines">
                  {entry.lines.map((line) => <div key={line.catalogItemId}>
                    <strong>{line.itemNameSnapshot}</strong>
                    <span>Sistema: {quantityText(line.expectedMilli, line.unit)}</span>
                    <span>Contado: {quantityText(line.countedMilli, line.unit)}</span>
                    <strong className={line.deltaMilli > 0 ? 'positive' : line.deltaMilli < 0 ? 'negative' : 'muted'}>
                      {line.deltaMilli === 0 ? 'Sin diferencia' :
                        (line.deltaMilli > 0 ? '+ ' : '− ') + quantityText(Math.abs(line.deltaMilli), line.unit)}
                    </strong>
                  </div>)}
                </div>
              </details>
            ) : (
              <article className="inventory-movement-row" key={entry.id}>
                <span className={'inventory-movement-icon ' + (entry.movement.deltaMilli >= 0 ? 'inbound' : 'outbound')}>
                  <Icon name={entry.movement.type === 'RECEPCION_COMPRA' ? 'receipt' : entry.movement.type === 'AJUSTE_CONTEO' ? 'boxes' : 'truck'} size={19}/>
                </span>
                <div className="inventory-movement-info">
                  <strong>{entry.movement.itemNameSnapshot}</strong>
                  <span>{inventoryMovementLabels[entry.movement.type]} · {locById.get(entry.movement.locationId)?.name ?? 'Ubicación histórica'}</span>
                  <small>{entry.movement.reason}{entry.movement.reference ? ' · ' + entry.movement.reference : ''}</small>
                </div>
                <div className="inventory-movement-aside">
                  <strong className={entry.movement.deltaMilli >= 0 ? 'positive' : 'negative'}>
                    {entry.movement.deltaMilli > 0 ? '+' : '−'} {quantityText(Math.abs(entry.movement.deltaMilli), entry.movement.unit)}
                  </strong>
                  <small>{new Date(entry.createdAt).toLocaleString('es-AR')}</small>
                </div>
              </article>
            ))}
          </div>
          {filteredHistory.length > shownHistory.length && <p className="inventory-limit">Mostrando las {shownHistory.length} operaciones más recientes. Refiná la búsqueda para consultar otras.</p>}
        </>}
      </>}
    </section>
  </>
}
