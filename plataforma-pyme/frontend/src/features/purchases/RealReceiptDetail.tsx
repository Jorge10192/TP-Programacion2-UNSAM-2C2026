import { receiptDisplay } from './receiptViewModel.ts'
import type { ReceiptViewer } from './receiptViewModel.ts'
import type { Purchase, PurchaseReceipt } from './realSupplyGateway.ts'
import type { LocationRecord } from '../businesses/realOperationsGateway.ts'

type Props={
  receipt:PurchaseReceipt
  purchase:Purchase|null
  locations:LocationRecord[]
  viewer:ReceiptViewer
  onClose:()=>void
}
export function RealReceiptDetail({receipt,purchase,locations,viewer,onClose}:Props){
  const info=receiptDisplay(receipt,purchase,locations,viewer)
  return <section className="real-supply-receipt-detail" aria-label="Detalle de recepción confirmada">
    <div className="real-supply-receipt-heading">
      <div>
        <h3>Detalle de recepción</h3>
        <p>{info.purchaseTitle}</p>
      </div>
      <span className="real-catalog-status real-catalog-active">CONFIRMADA</span>
    </div>
    <dl className="real-supply-receipt-facts">
      <div><dt>Ubicación de recepción</dt><dd>{info.locationName}</dd></div>
      <div><dt>Fecha y hora de confirmación</dt><dd>{info.confirmedAt}</dd></div>
      <div><dt>Responsable</dt><dd>{info.responsibleName}</dd></div>
      <div><dt>Identificador del responsable</dt><dd className="real-supply-receipt-id">{info.responsibleId}</dd></div>
    </dl>
    <div className="real-supply-receipt-movements">
      <h4>Entradas de inventario <span>({info.movementLines.length})</span></h4>
      {info.movementLines.length===0
        ?<p>No se informaron movimientos físicos para este comprobante.</p>
        :<ul>{info.movementLines.map(m=><li key={m.id}>
          <div><strong>{m.description}</strong>
            <small>{m.balanceAfter===null?'Saldo posterior no informado':`Saldo posterior: ${m.balanceAfter} ${m.unit}`}</small>
          </div>
          <strong className="real-supply-receipt-delta">+{m.entered} {m.unit}</strong>
        </li>)}</ul>}
    </div>
    <div className="real-supply-receipt-footer">
      <p>Registro interno confirmado en FastAPI y PostgreSQL. No es una factura del proveedor ni un archivo PDF.</p>
      <details>
        <summary>Identificadores de trazabilidad</summary>
        <dl>
          <dt>Recepción</dt><dd className="real-supply-receipt-id">{info.receiptId}</dd>
          <dt>Ubicación</dt><dd className="real-supply-receipt-id">{info.locationId}</dd>
        </dl>
      </details>
      <button className="real-auth-secondary" type="button" onClick={onClose}>Cerrar detalle</button>
    </div>
  </section>
}
