import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon'
import { demoGateway } from '../../data/demo/demoStore'
import type { DemoBusiness, DemoCatalogItem, DemoLocation } from '../../data/demo/demoStore'
import type { InventoryCountInput, InventoryMovement } from '../../data/demo/inventoryPolicy'
import { parseCountedMilli, stockBalance } from '../../data/demo/inventoryPolicy'
import { quantityText } from '../../data/demo/purchasePolicy'

type PreviewLine = InventoryCountInput & { item: DemoCatalogItem; deltaMilli: number }

export function InventoryBatchCount({
  business, catalog, locations, movements, onDone, onCancel,
}: {
  business: DemoBusiness
  catalog: DemoCatalogItem[]
  locations: DemoLocation[]
  movements: InventoryMovement[]
  onDone: (message: string) => void
  onCancel: () => void
}) {
  const [requestId] = useState(() => 'demo-inventory-request-' + crypto.randomUUID())
  const [locationId, setLocationId] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [reason, setReason] = useState('')
  const [stage, setStage] = useState<'count' | 'review'>('count')
  const [review, setReview] = useState<PreviewLine[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const locationsAllowed = locations.filter((location) => location.status === 'ACTIVA' && location.canStore)
  const physical = catalog.filter((item) => item.status === 'ACTIVO' && item.kind !== 'SERVICIO')
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const term = search.trim().toLocaleLowerCase('es-AR')
  const visible = physical.filter((item) =>
    [item.name, item.sku, item.category].some((text) => text.toLocaleLowerCase('es-AR').includes(term)))
    .slice(0, 200)
  const counted = physical.filter((item) => values[item.id] !== undefined && values[item.id].trim() !== '')
  const progress = physical.length ? Math.round(counted.length * 100 / physical.length) : 0
  const chosenLocation = locationsAllowed.find((location) => location.id === locationId)

  function write(id: string, next: string) {
    setValues((previous) => ({ ...previous, [id]: next }))
    setError('')
  }
  function stepValue(item: DemoCatalogItem, direction: 1 | -1) {
    const oldValue = values[item.id]
    if ((!oldValue || !oldValue.trim()) && direction === -1) {
      setError('El artículo sigue sin contar. Usá «Marcar 0» si verificaste que no hay existencias.')
      return
    }
    let milli = 0
    try {
      milli = oldValue && oldValue.trim() ? parseCountedMilli(oldValue, item.unit) : 0
    } catch {
      setError('Corregí la cantidad ingresada antes de usar + o −.')
      return
    }
    const next = Math.max(0, milli + 1000 * direction)
    write(item.id, next === 0 ? '0' : quantityText(next, item.unit).split(' ')[0].replace(/\./g, ''))
  }

  function reviewCount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      if (!chosenLocation) throw new Error('Seleccioná una ubicación activa habilitada para almacenar.')
      if (counted.length === 0) throw new Error('Contá al menos un artículo. Los no contados quedan sin cambios.')
      if (counted.length > 200) throw new Error('La sesión permite hasta 200 artículos. Dividí el control en varias sesiones.')
      if (reason.trim().length < 5 || reason.trim().length > 180) {
        throw new Error('Indicá un motivo entre 5 y 180 caracteres.')
      }
      const lines = counted.map((item) => {
        const countedMilli = parseCountedMilli(values[item.id], item.unit)
        const expectedMilli = stockBalance(movements, locationId, item.id)
        return {
          catalogItemId: item.id, item, expectedMilli, countedMilli,
          deltaMilli: countedMilli - expectedMilli,
        }
      })
      setReview(lines)
      setStage('review')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo preparar el conteo.')
    }
  }

  async function confirm() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const operation = await demoGateway.countInventoryBatch(
        business.id, locationId,
        review.map(({ catalogItemId, expectedMilli, countedMilli }) => ({ catalogItemId, expectedMilli, countedMilli })),
        reason, requestId,
      )
      if (operation.kind !== 'BATCH_COUNT') throw new Error('Respuesta de conteo no esperada.')
      const modified = operation.lines.filter((line) => line.deltaMilli !== 0).length
      onDone('Control DEMO guardado: ' + operation.lines.length + ' artículos revisados y ' + modified +
        ' ajustes de stock. Los artículos sin contar no se modificaron.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo confirmar la sesión.')
      setStage('count')
    } finally {
      setBusy(false)
    }
  }

  return <section className="form-panel inventory-editor audit-panel" aria-label="Control de stock por ubicación">
    <div className="form-panel-header">
      <span className="feature-icon blue"><Icon name="boxes" size={24}/></span>
      <div>
        <h2>Control de stock · Conteo por ubicación</h2>
        <p>Contá varios artículos, revisá las diferencias y aplicá todos los ajustes en una sola operación DEMO.</p>
      </div>
    </div>
    <div className="informational-note inventory-note">
      <Icon name="shield" size={18}/>
      <span><strong>Sin contar no significa cero.</strong> Sólo se modificarán los artículos con una cantidad ingresada. Para registrar una existencia de cero, usá «Marcar 0».</span>
    </div>
    {stage === 'count' ? <form className="demo-form" onSubmit={reviewCount}>
      <div className="inventory-audit-head">
        <label className="form-field"><span>Ubicación a controlar *</span>
          <select required value={locationId} onChange={(event) => { setLocationId(event.target.value); setValues({}) }}>
            <option value="">Seleccionar ubicación…</option>
            {locationsAllowed.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>
        <div className="inventory-audit-progress">
          <div><strong>Progreso de conteo</strong><span>{counted.length} de {physical.length} artículos contados</span></div>
          <div className="inventory-audit-progress-track"><span style={{ width: progress + '%' }}/></div>
        </div>
      </div>
      <label className="form-field inventory-audit-search"><span>Buscar por nombre o SKU</span>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar artículos…"/>
      </label>
      {physical.length === 0 ? <p className="inventory-attention">Agregá artículos físicos al Catálogo antes de realizar un conteo.</p> :
        !chosenLocation ? <p className="inventory-attention">Seleccioná una ubicación para cargar las cantidades.</p> :
        <div className="inventory-audit-list" aria-label="Artículos para contar">
          {visible.map((item) => {
            const oldMilli = stockBalance(movements, locationId, item.id)
            const input = values[item.id] ?? ''
            let delta: number | null = null
            if (input.trim()) {
              try { delta = parseCountedMilli(input, item.unit) - oldMilli } catch { delta = null }
            }
            return <div className="inventory-audit-row" key={item.id}>
              <div className="inventory-audit-article">
                <strong>{item.name}</strong>
                <small>{item.sku || 'Sin SKU'} · {item.unit}</small>
              </div>
              <div className="inventory-audit-expected"><small>En sistema</small><strong>{quantityText(oldMilli, item.unit)}</strong></div>
              <div className="inventory-audit-controls">
                <small>Conteo real</small>
                <div>
                  <button type="button" aria-label={'Restar a ' + item.name} onClick={() => stepValue(item, -1)}>−</button>
                  <input aria-label={'Cantidad contada de ' + item.name} inputMode="decimal" value={input} maxLength={13}
                    placeholder="Sin contar" onChange={(event) => write(item.id, event.target.value)}/>
                  <button type="button" aria-label={'Sumar a ' + item.name} onClick={() => stepValue(item, 1)}>+</button>
                  <button type="button" onClick={() => write(item.id, '0')}>Marcar 0</button>
                  {input.trim() && <button type="button" onClick={() => write(item.id, '')}>Sin contar</button>}
                </div>
              </div>
              <div className="inventory-audit-difference"><small>Diferencia</small>
                <strong className={delta === null ? 'muted' : delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'muted'}>
                  {delta === null ? 'Sin contar' : delta === 0 ? 'Sin diferencia' : (delta > 0 ? '+ ' : '− ') + quantityText(Math.abs(delta), item.unit)}
                </strong>
              </div>
            </div>
          })}
          {visible.length === 0 && <p className="inventory-limit">No hay artículos con esa búsqueda.</p>}
          {physical.length > visible.length && <p className="inventory-limit">Mostrando hasta 200 coincidencias. Podés usar el buscador para seguir contando otros artículos de la misma sesión (máximo 200 contados).</p>}
        </div>}
      <label className="form-field"><span>Motivo u observación de control *</span>
        <textarea rows={2} required minLength={5} maxLength={180} value={reason}
          placeholder="Ej.: Conteo semanal de mercadería en depósito"
          onChange={(event) => setReason(event.target.value)}/>
      </label>
      {error && <p className="form-message error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="button button-secondary" onClick={onCancel}>Cancelar</button>
        <button className="button button-primary" type="submit" disabled={!chosenLocation || counted.length === 0}>
          Revisar diferencias <Icon name="arrow" size={17}/>
        </button>
      </div>
    </form> : <div className="inventory-audit-review">
      <div className="inventory-audit-review-top">
        <h3>Resumen antes de confirmar</h3>
        <p>Ubicación: <strong>{chosenLocation?.name}</strong> · Artículos contados: <strong>{review.length}</strong> · Con diferencias: <strong>{review.filter((line) => line.deltaMilli !== 0).length}</strong></p>
        <p>Los cambios se aplican juntos. Ningún artículo omitido será alterado.</p>
      </div>
      <div className="inventory-audit-list">
        {review.map((line) => <div className="inventory-audit-review-row" key={line.catalogItemId}>
          <strong>{line.item.name}</strong>
          <span>Sistema: {quantityText(line.expectedMilli, line.item.unit)}</span>
          <span>Real: {quantityText(line.countedMilli, line.item.unit)}</span>
          <strong className={line.deltaMilli > 0 ? 'positive' : line.deltaMilli < 0 ? 'negative' : 'muted'}>
            {line.deltaMilli === 0 ? 'Sin diferencia' : (line.deltaMilli > 0 ? '+ ' : '− ') + quantityText(Math.abs(line.deltaMilli), line.item.unit)}
          </strong>
        </div>)}
      </div>
      <div className="inventory-audit-reason"><strong>Observación:</strong> {reason}</div>
      {error && <p className="form-message error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => setStage('count')}>Volver a modificar</button>
        <button type="button" className="button button-primary" disabled={busy} onClick={() => void confirm()}>
          <Icon name="shield" size={17}/>{busy ? 'Confirmando…' : 'Confirmar control DEMO'}
        </button>
      </div>
    </div>}
  </section>
}
