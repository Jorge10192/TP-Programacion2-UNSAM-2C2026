import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon'
import { demoGateway } from '../../data/demo/demoStore'
import type { DemoBusiness, DemoCatalogItem, DemoLocation } from '../../data/demo/demoStore'
import type { InventoryMovement } from '../../data/demo/inventoryPolicy'
import { parseCountedMilli, stockBalance } from '../../data/demo/inventoryPolicy'
import { parseQuantityMilli, quantityText } from '../../data/demo/purchasePolicy'

export function InventoryActionForm({
  business, catalog, locations, movements, kind, onDone, onCancel,
}: {
  business: DemoBusiness
  catalog: DemoCatalogItem[]
  locations: DemoLocation[]
  movements: InventoryMovement[]
  kind: 'TRANSFER' | 'COUNT'
  onDone: (message: string) => void
  onCancel: () => void
}) {
  const [requestId] = useState(() => 'demo-inventory-request-' + crypto.randomUUID())
  const [itemId, setItemId] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const physical = catalog.filter((item) => item.status === 'ACTIVO' && item.kind !== 'SERVICIO')
  const allowedLocations = locations.filter((location) => location.status === 'ACTIVA' && location.canStore)
  const item = physical.find((entry) => entry.id === itemId)
  const current = item && sourceId ? stockBalance(movements, sourceId, itemId) : null
  let preview: string | null = null
  try {
    if (item && quantity.trim()) {
      const number = kind === 'COUNT'
        ? parseCountedMilli(quantity, item.unit)
        : parseQuantityMilli(quantity, item.unit)
      if (kind === 'COUNT' && current !== null) {
        const difference = number - current
        preview = difference === 0 ? 'El conteo coincide con el saldo actual.'
          : (difference > 0 ? 'Entrada por ajuste: ' : 'Salida por ajuste: ') + quantityText(Math.abs(difference), item.unit)
      } else if (kind === 'TRANSFER') {
        preview = 'A trasladar: ' + quantityText(number, item.unit)
      }
    }
  } catch {
    // No mostrar valores aproximados si el ingreso todavía es inválido.
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (!item) throw new Error('Seleccioná un artículo físico activo.')
      const amount = kind === 'COUNT'
        ? parseCountedMilli(quantity, item.unit)
        : parseQuantityMilli(quantity, item.unit)
      if (kind === 'TRANSFER') {
        await demoGateway.transferInventory(
          business.id, item.id, sourceId, destinationId, amount, reason, requestId,
        )
        onDone('Traslado DEMO registrado. La salida y la entrada se reflejan juntas, sin alterar el total entre ubicaciones.')
      } else {
        await demoGateway.countInventory(business.id, item.id, sourceId, amount, reason, requestId)
        onDone('Conteo DEMO registrado: el saldo de esa ubicación se ajustó al valor contado.')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo registrar el movimiento.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="form-panel inventory-editor" aria-label={kind === 'TRANSFER' ? 'Trasladar existencias' : 'Registrar conteo físico'}>
    <div className="form-panel-header">
      <span className="feature-icon blue"><Icon name={kind === 'TRANSFER' ? 'truck' : 'boxes'} size={23}/></span>
      <div>
        <h2>{kind === 'TRANSFER' ? 'Trasladar mercadería' : 'Ajustar por conteo físico'}</h2>
        <p>{kind === 'TRANSFER'
          ? 'Mové una cantidad existente de una ubicación a otra dentro de la misma empresa.'
          : 'Indicá la cantidad efectivamente contada; se registrará la diferencia con el saldo anterior.'}</p>
      </div>
    </div>
    <form className="demo-form" onSubmit={save}>
      <div className="inventory-form-grid">
        <label className="form-field"><span>Artículo físico del Catálogo *</span>
          <select value={itemId} required disabled={busy} onChange={(event) => { setItemId(event.target.value); setQuantity('') }}>
            <option value="">Seleccionar artículo…</option>
            {physical.map((article) => <option key={article.id} value={article.id}>{article.name}{article.sku ? ' · ' + article.sku : ''}</option>)}
          </select>
        </label>
        <label className="form-field"><span>{kind === 'TRANSFER' ? 'Ubicación de origen *' : 'Ubicación del conteo *'}</span>
          <select value={sourceId} required disabled={busy} onChange={(event) => { setSourceId(event.target.value); setDestinationId('') }}>
            <option value="">Seleccionar ubicación…</option>
            {allowedLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>
        {kind === 'TRANSFER' && <label className="form-field"><span>Ubicación de destino *</span>
          <select value={destinationId} required disabled={busy} onChange={(event) => setDestinationId(event.target.value)}>
            <option value="">Seleccionar destino…</option>
            {allowedLocations.filter((location) => location.id !== sourceId).map((location) =>
              <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>}
        <label className="form-field"><span>{kind === 'TRANSFER' ? 'Cantidad a trasladar *' : 'Cantidad contada (puede ser cero) *'}</span>
          <input value={quantity} required disabled={busy} inputMode="decimal" maxLength={13}
            placeholder={item?.unit === 'KILOGRAMO' ? 'Ej.: 0,500' : 'Ej.: 5'}
            onChange={(event) => setQuantity(event.target.value)}/>
          <small>Unidad: {item?.unit ?? 'Seleccioná un artículo'}. No se convierten cajas, kg ni paquetes.</small>
        </label>
      </div>
      {item && sourceId && <div className="inventory-current">
        <span>Saldo actual en la ubicación seleccionada</span>
        <strong>{quantityText(current ?? 0, item.unit)}</strong>
      </div>}
      {preview && <p className="inventory-preview"><Icon name="shield" size={17}/> {preview}</p>}
      <label className="form-field"><span>Motivo del movimiento * (mínimo 5 caracteres)</span>
        <textarea value={reason} required minLength={5} maxLength={180} rows={2} disabled={busy}
          placeholder={kind === 'TRANSFER' ? 'Ej.: Reposición del local desde depósito' : 'Ej.: Conteo semanal, diferencia detectada en estante'}
          onChange={(event) => setReason(event.target.value)}/>
      </label>
      <p className="form-hint">Esta operación se guardará en el historial DEMO. Los movimientos no se editan ni se eliminan; las correcciones se realizan con un nuevo conteo.</p>
      {error && <p className="form-message error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button type="submit" className="button button-primary" disabled={busy || physical.length === 0 || allowedLocations.length < (kind === 'TRANSFER' ? 2 : 1)}>
          <Icon name="shield" size={16}/>
          {busy ? 'Registrando…' : kind === 'TRANSFER' ? 'Registrar traslado DEMO' : 'Guardar conteo DEMO'}
        </button>
      </div>
    </form>
  </section>
}
