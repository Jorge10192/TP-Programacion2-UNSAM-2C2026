import { useState } from 'react'
import { Icon } from '../../app/Icon'
import { demoGateway } from '../../data/demo/demoStore'
import type { DemoBusiness } from '../../data/demo/demoStore'
import { moneyDisplay } from '../../data/demo/catalogPolicy'
import { demoQrVisualCells, qrStatusLabels } from '../../data/demo/qrDemoPolicy'
import type { DemoQrIntent } from '../../data/demo/qrDemoPolicy'

export function QrDemoPanel({ intent, business, onApproved, onCanceled, onClose }: {
  intent: DemoQrIntent
  business: DemoBusiness
  onApproved: (saleId: string) => void
  onCanceled: () => void
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const cells = demoQrVisualCells(intent.id)
  async function act(action: 'approve' | 'cancel') {
    if (busy) return
    setBusy(true); setError('')
    try {
      if (action === 'approve') {
        const sale = await demoGateway.simulateQrDemoApproval(business.id, intent.id)
        onApproved(sale.id)
      } else {
        await demoGateway.cancelQrDemoIntent(business.id, intent.id)
        onCanceled()
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo completar la simulación QR.')
    } finally { setBusy(false) }
  }

  return <section className="form-panel qr-demo-panel" aria-label="Intención de cobro QR de demostración">
    <div className="business-section-heading">
      <div><Icon name="credit" size={22}/><h2>Cobro con QR · DEMO</h2></div>
      <button type="button" className="button button-secondary" onClick={onClose}><Icon name="close" size={16}/> Cerrar detalle</button>
    </div>
    <div className="qr-demo-content">
      <div className="qr-demo-visual">
        <svg viewBox="0 0 29 29" role="img" aria-label="Patrón gráfico ilustrativo, no es un QR escaneable ni un enlace de pago">
          <rect width="29" height="29" fill="#ffffff"/>
          {cells.map(cell => <rect key={cell.x + '-' + cell.y} x={cell.x} y={cell.y} width="1" height="1" fill="#163b6d"/>)}
        </svg>
        <strong>ILUSTRACIÓN DEMO</strong>
        <small>No escaneable · No transfiere dinero</small>
      </div>
      <div className="qr-demo-info">
        <span className={'qr-demo-state ' + (intent.status === 'PENDIENTE' ? 'pending' : intent.status === 'CANCELADO' ? 'cancelled' : 'approved')}>{qrStatusLabels[intent.status]}</span>
        <p className="qr-demo-amount">{moneyDisplay(intent.amountCents)}</p>
        <p>Empresa: <strong>{business.name}</strong></p>
        <p>Medio: <strong>Mercado Pago declarado (sin conexión)</strong></p>
        <p>Artículos o servicios: <strong>{intent.input.lines.length}</strong></p>
        <p>Referencia interna: <code>{intent.id}</code></p>
        <div className="informational-note">
          <Icon name="shield" size={18}/>
          <span><strong>Simulación exclusivamente local.</strong> El QR es ilustrativo; ningún cliente puede pagarlo. El estado pendiente no registra ventas ni modifica existencias. El botón de aprobación crea una venta DEMO declarada, pero nunca confirma dinero en Mercado Pago.</span>
        </div>
        {error && <p className="form-message error" role="alert">{error}</p>}
        {intent.status === 'PENDIENTE' && <div className="form-actions qr-demo-actions">
          <button type="button" className="button button-secondary" disabled={busy} onClick={() => void act('cancel')}>Cancelar intención</button>
          <button type="button" className="button button-primary" disabled={busy} onClick={() => void act('approve')}>
            <Icon name="check" size={16}/>{busy ? 'Procesando…' : 'Simular aprobación (sin cobro real)'}
          </button>
        </div>}
        {intent.status === 'SIMULADO_APROBADO' && <p className="cash-form-hint linked"><Icon name="receipt" size={17}/> Se registró una única venta DEMO. Se puede consultar en el historial de ventas.</p>}
        {intent.status === 'CANCELADO' && <p className="cash-form-hint unlinked"><Icon name="clock" size={17}/> Intención cancelada. No se generó ninguna venta; para reintentar creá un QR nuevo.</p>}
      </div>
    </div>
  </section>
}
