import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../app/Icon'
import { demoGateway } from '../../data/demo/demoStore'
import type { DemoPurchase, DemoBusiness, DemoLocation } from '../../data/demo/demoStore'
import { moneyDisplay } from '../../data/demo/catalogPolicy'
import { physicalPurchaseLines, quantityText } from '../../data/demo/purchasePolicy'

export function PurchaseDetailDialog({
  purchase, business, locations, onClose,
}: {
  purchase: DemoPurchase
  business: DemoBusiness
  locations: DemoLocation[]
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [locationId, setLocationId] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const physical = physicalPurchaseLines(purchase.lines)
  const availableLocations = locations.filter((location) => location.status === 'ACTIVA' && location.canStore)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    return () => { if (dialog.open) dialog.close() }
  }, [])

  async function receive() {
    if (busy || !locationId || purchase.receipt) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await demoGateway.receivePurchase(business.id, purchase.id, locationId)
      setNotice('Recepción DEMO confirmada una única vez. La compra y los movimientos quedaron guardados.')
      setConfirming(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible confirmar la recepción.')
    } finally {
      setBusy(false)
    }
  }

  const locationName = purchase.receipt
    ? locations.find((location) => location.id === purchase.receipt?.locationId)?.name ?? 'Ubicación conservada en el historial'
    : null

  return <dialog
    ref={dialogRef}
    className="catalog-detail-modal purchase-detail-modal"
    aria-labelledby="purchase-detail-title"
    onCancel={(event) => { event.preventDefault(); onClose() }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
  >
    <div className="catalog-detail-body">
      <div className="catalog-detail-topline">
        <p className="eyebrow">COMPRA REGISTRADA · DEMO</p>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar detalle de compra"><Icon name="close" size={20}/></button>
      </div>
      <header className="purchase-detail-head">
        <div>
          <div className="purchase-title-line"><h2 id="purchase-detail-title">Detalle de compra</h2><span className="catalog-state is-active">Registrada</span></div>
          <p>{new Date(purchase.purchasedOn + 'T12:00:00').toLocaleDateString('es-AR')} · {purchase.supplierNameSnapshot || 'Sin proveedor asignado'}</p>
          <p className="purchase-detail-reference">{purchase.reference ? 'Comprobante: ' + purchase.reference : 'Sin número de comprobante'}</p>
        </div>
        <span className="purchase-detail-total">{moneyDisplay(purchase.totalCents)}</span>
      </header>
      <section className="purchase-detail-section">
        <h3><Icon name="receipt" size={18}/> Renglones guardados</h3>
        <div className="purchase-table-wrap">
          <table className="purchase-table">
            <thead><tr><th>Concepto</th><th>Cantidad</th><th>Costo unit.</th><th>Subtotal</th></tr></thead>
            <tbody>{purchase.lines.map((line) => <tr key={line.id}>
              <td><strong>{line.description}</strong><small>{line.kind === 'BIEN' ? 'Bien físico del catálogo' : line.kind === 'SERVICIO' ? 'Servicio sin stock' : 'Concepto libre'}{line.sku && ' · SKU ' + line.sku}</small></td>
              <td>{quantityText(line.quantityMilli, line.unit)}</td>
              <td>{moneyDisplay(line.unitCostCents)}</td>
              <td>{moneyDisplay(line.totalCents)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {purchase.notes && <div className="purchase-notes"><strong>Observaciones</strong><p>{purchase.notes}</p></div>}
        <p className="purchase-detail-muted">Los importes, conceptos y el nombre del proveedor son una foto histórica: no cambian al editar luego Catálogo o Proveedores. Registrar esta compra no representa un pago.</p>
      </section>

      <section className="purchase-detail-section">
        <h3><Icon name="boxes" size={18}/> Paso 2 · Ubicación y recepción de mercadería</h3>
        {purchase.receipt ? <>
          <div className="purchase-received-banner"><Icon name="shield" size={20}/><span>Recepción confirmada · {locationName} · {new Date(purchase.receipt.createdAt).toLocaleString('es-AR')}</span></div>
          <div className="purchase-received-lines">{purchase.receipt.movements.map((movement) => {
            const line = purchase.lines.find((entry) => entry.id === movement.purchaseLineId)
            return <div key={movement.id}><span>{line?.description ?? 'Artículo del catálogo'}</span><strong>+ {quantityText(movement.quantityMilli, movement.unit)}</strong></div>
          })}</div>
          <p className="purchase-detail-muted">Recepción única para esta compra. Volver a consultar o reintentar no duplica los movimientos. Estos eventos alimentarán el Inventario por ubicación.</p>
        </> : physical.length === 0 ? <p className="purchase-detail-muted">Esta compra contiene sólo servicios o conceptos libres. No hay bienes físicos del Catálogo para ingresar al inventario.</p>
          : <>
            <p className="purchase-location-pending"><Icon name="clock" size={17}/><span><strong>Compra guardada · ubicación por confirmar.</strong> Los artículos todavía no ingresaron al Inventario. Elegí a continuación dónde se recibieron y confirmá su ingreso.</span></p>
            <p className="purchase-detail-muted">Se recibirán {physical.length} {physical.length === 1 ? 'renglón físico' : 'renglones físicos'} en una única ubicación. Los servicios y los conceptos libres no ingresan a stock. No se realizan conversiones de cajas, paquetes, kilos u otras unidades.</p>
            {availableLocations.length === 0 ? <div className="purchase-warning">
              Para recibir necesitás una ubicación <strong>activa</strong> que tenga habilitada la capacidad «Puede almacenar». Creala o editala en <strong>Ubicaciones</strong>.
            </div> : <>
              <div className="purchase-receipt-preview">
                {physical.map((line) => <div key={line.id}><span>{line.description}</span><strong>+ {quantityText(line.quantityMilli, line.unit)}</strong></div>)}
              </div>
              <label className="form-field purchase-location-select"><span>Ubicación de recepción (pendiente de confirmar) *</span>
                <select value={locationId} onChange={(event) => { setLocationId(event.target.value); setConfirming(false) }}>
                  <option value="">Seleccionar ubicación activa con almacenamiento…</option>
                  {availableLocations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.kind}</option>)}
                </select>
              </label>
              {!confirming && <button type="button" className="button button-primary" disabled={!locationId || busy} onClick={() => setConfirming(true)}>
                <Icon name="truck" size={17}/> Revisar ubicación y mercadería
              </button>}
              {confirming && <div className="purchase-confirm-receipt">
                <strong>Confirmación de ingreso</strong>
                <p>Se registrarán {physical.length} {physical.length === 1 ? 'entrada' : 'entradas'} en «{availableLocations.find((location) => location.id === locationId)?.name}». Esta operación no se puede editar ni repetir; las recepciones parciales se incorporarán en otro incremento.</p>
                <div>
                  <button type="button" className="button button-secondary" disabled={busy} onClick={() => setConfirming(false)}>Volver</button>
                  <button type="button" className="button button-primary" disabled={busy || !locationId} onClick={receive}>{busy ? 'Confirmando…' : 'Confirmar ubicación e ingresar a Inventario'}</button>
                </div>
              </div>}
            </>}
          </>}
        {notice && <p className="form-message success purchase-inline-feedback" role="status">{notice}</p>}
        {error && <p className="form-message error purchase-inline-feedback" role="alert">{error}</p>}
      </section>
      <footer className="catalog-detail-footer">
        <div className="catalog-detail-dates"><span>Empresa: {business.name}</span><span>Registrada en DEMO: {new Date(purchase.createdAt).toLocaleString('es-AR')}</span></div>
        <button type="button" className="button button-secondary" disabled={busy} onClick={onClose}>Cerrar detalle</button>
      </footer>
    </div>
  </dialog>
}
