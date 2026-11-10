import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiHttpError, ApiTransportError } from '../../api/httpClient.ts'
import { centsToPesos, pesosToCents } from '../catalog/realCatalogGateway.ts'
import type { CatalogItem } from '../catalog/realCatalogGateway.ts'
import type { LocationRecord } from '../businesses/realOperationsGateway.ts'
import type { PosCartLine } from './realPosDraft.ts'
import { previewPosCart, posQuantityText } from './realPosDraft.ts'
import type { SaleCommand, SaleTotals } from './realSaleCommand.ts'
import { SALE_PAYMENT_METHODS } from './realSaleCommand.ts'
import { composePosCheckout, POS_PAYMENT_LABELS } from './realPosCheckoutDraft.ts'
import type { PosPaymentDraft } from './realPosCheckoutDraft.ts'
import { createSaleWriteCoordinator } from './realSaleWriteCoordinator.ts'
import type { ConfirmedSale } from './realSaleWriteCoordinator.ts'
import { salePendingOld } from './salePendingJournal.ts'
import type { SalePending } from './salePendingJournal.ts'

type Props = {
  token: string
  userId: string
  businessId: string
  businessName: string
  role: string
  businessActive: boolean
  location: LocationRecord | null
  items: readonly CatalogItem[]
  cart: readonly PosCartLine[]
  discountText: string
  onDraftLock: (locked: boolean) => void
  onConfirmed: () => void
  onUnauthorized: () => void
  onNavigate: (path: string) => void
}

/**
 * T10-D: explicit confirmation + IndexedDB-first POST, no automatic replay.
 * The local QA entry keeps mutations OFF by default until T10-E acceptance.
 * This front-end switch is not RBAC: FastAPI validates every write.
 */
const MUTATIONS_ENABLED = import.meta.env.VITE_PYME_ENABLE_REAL_SALES === '1'
const pesos = (c: number) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS',
}).format(c / 100)
type Stage = 'checking' | 'editing' | 'review' | 'sending' | 'pending' | 'confirmed' | 'blocked'
type Review = { body: SaleCommand; totals: SaleTotals }
const initialPayment = (amount: number | null): PosPaymentDraft => ({
  method: 'EFECTIVO', amountText: centsToPesos(amount), reference: '',
})

function readableError(error: unknown): string {
  if (error instanceof ApiHttpError) {
    if (error.status === 401) return 'Sesión vencida. El intento original sigue guardado: volvé a iniciar sesión.'
    if (error.status === 403) return 'La API denegó esta venta por permisos, sede o política de precios.'
    if (error.status === 409) return 'La API rechazó la operación (conflicto de stock o de solicitud). No generes otra clave: consultá el intento original.'
    if (error.status === 422) return 'La API rechazó el comando. Revisá precios, stock, sede y datos; la solicitud original se conserva.'
    return 'La API respondió HTTP ' + error.status + '. Consultá el estado antes de intentar nuevamente.'
  }
  if (error instanceof ApiTransportError)
    return 'No se recibió una confirmación fiable (' + error.reason +
      '). La venta podría haberse registrado. Consultá por request_id; no crees otra venta.'
  return error instanceof Error ? error.message : 'No se pudo comprobar el estado de la venta.'
}

export function RealPosCheckout({
  token, userId, businessId, businessName, role, businessActive, location,
  items, cart, discountText, onDraftLock, onConfirmed, onUnauthorized, onNavigate,
}: Props) {
  const coordinator = useMemo(
    () => createSaleWriteCoordinator(token, userId, businessId),
    [token, userId, businessId],
  )
  const [stage, setStage] = useState<Stage>('checking')
  const [payments, setPayments] = useState<PosPaymentDraft[]>([initialPayment(null)])
  const [paymentModified, setPaymentModified] = useState(false)
  const [notes, setNotes] = useState('')
  const [review, setReview] = useState<Review | null>(null)
  const [pending, setPending] = useState<SalePending | null>(null)
  const [confirmed, setConfirmed] = useState<ConfirmedSale | null>(null)
  const [notice, setNotice] = useState('')
  const [ack, setAck] = useState(false)
  const [recoveryChecked, setRecoveryChecked] = useState(false)
  const busy = useRef(false)

  const draft = useMemo(() => {
    try {
      const discount = pesosToCents(discountText)
      if (discount === null) throw new RangeError('Ingresá un descuento válido.')
      const value = previewPosCart(role, businessActive, location, items, cart, discount)
      return { totals: value.totals, problem: '' }
    } catch (error) {
      return { totals: null, problem: error instanceof Error ? error.message : 'Carrito inválido.' }
    }
  }, [role, businessActive, location, items, cart, discountText])

  useEffect(() => {
    if (!paymentModified && stage === 'editing')
      setPayments([initialPayment(draft.totals?.total_cents ?? null)])
  }, [paymentModified, draft.totals?.total_cents, stage])

  useEffect(() => {
    let mounted = true
    onDraftLock(true) // fail closed until IndexedDB verifies absence of pending command
    void coordinator.pending().then(row => {
      if (!mounted) return
      setPending(row)
      setStage(row ? 'pending' : 'editing')
      onDraftLock(Boolean(row))
    }).catch(error => {
      if (!mounted) return
      setStage('blocked')
      setNotice(readableError(error))
      onDraftLock(true)
    })
    return () => { mounted = false }
  }, [coordinator, onDraftLock])

  const changePayment = (i: number, changes: Partial<PosPaymentDraft>) => {
    setPaymentModified(true)
    setPayments(current => current.map((row, index) => index === i ? { ...row, ...changes } : row))
  }

  const reviewSale = () => {
    setNotice('')
    try {
      if (!draft.totals) throw new RangeError(draft.problem || 'Carrito inválido.')
      const command = composePosCheckout(
        location?.id ?? null, cart, draft.totals.discount_cents, notes, payments,
      )
      if (command.totals.total_cents !== draft.totals.total_cents)
        throw new RangeError('El total cambió durante la revisión.')
      setReview(command)
      setStage('review')
      setAck(false)
      onDraftLock(true)
    } catch (error) { setNotice(readableError(error)) }
  }

  const acceptConfirmed = (result: ConfirmedSale) => {
    setConfirmed(result)
    setPending(null)
    setReview(null)
    setNotice(result.journalCleared ? '' :
      'La venta está confirmada en PostgreSQL, pero no se pudo limpiar IndexedDB. Recuperala por GET antes de otra venta.')
    setStage('confirmed')
    setAck(false)
    if (result.journalCleared) {
      onConfirmed()
      onDraftLock(false)
    } else {
      onDraftLock(true)
    }
  }

  const readPendingAfterError = async (error: unknown) => {
    setNotice(readableError(error))
    setReview(null)
    setAck(false)
    setRecoveryChecked(false)
    onDraftLock(true)
    if (error instanceof ApiHttpError && error.status === 401) onUnauthorized()
    try {
      const row = await coordinator.pending()
      if (row) { setPending(row); setStage('pending') }
      else { setStage('blocked') }
    } catch { setStage('blocked') }
  }

  async function confirmReviewed() {
    if (busy.current || !MUTATIONS_ENABLED || !ack || !review || stage !== 'review') return
    busy.current = true
    setStage('sending')
    setNotice('')
    try {
      // Ordering is critical: durable IndexedDB write + read-back BEFORE POST.
      const saved = await coordinator.prepare(review.body)
      setPending(saved)
      const result = await coordinator.sendApproved(saved.key, true)
      acceptConfirmed(result)
    } catch (error) { await readPendingAfterError(error) }
    finally { busy.current = false }
  }

  async function recoverOriginal() {
    if (busy.current) return
    busy.current = true
    setStage('sending')
    setRecoveryChecked(false)
    setNotice('')
    try {
      const result = await coordinator.recover() // GET only
      if (result.state === 'confirmed') acceptConfirmed(result)
      else if (result.state === 'not-found') {
        setPending(result.pending)
        setRecoveryChecked(true)
        setNotice('GET devolvió 404: esto NO demuestra que el POST original no llegó. Podés reintentar explícitamente la MISMA clave y cuerpo, sin modificar importes.')
        setStage('pending')
      } else {
        setPending(null)
        setStage('editing')
        onDraftLock(false)
      }
    } catch (error) {
      setNotice(readableError(error))
      setStage('pending')
      if (error instanceof ApiHttpError && error.status === 401) onUnauthorized()
    } finally { busy.current = false }
  }

  async function replayOriginal() {
    if (busy.current || !MUTATIONS_ENABLED || stage !== 'pending' ||
      !pending || !recoveryChecked || !ack) return
    busy.current = true
    setStage('sending')
    setRecoveryChecked(false)
    setNotice('')
    try {
      const result = await coordinator.sendApproved(pending.key, true)
      acceptConfirmed(result)
    } catch (error) {
      await readPendingAfterError(error)
    } finally { busy.current = false }
  }

  async function verifyStorage() {
    if (busy.current) return
    busy.current = true
    setNotice('')
    try {
      const row = await coordinator.pending()
      setPending(row)
      setStage(row ? 'pending' : 'editing')
      onDraftLock(Boolean(row))
    } catch (error) {
      setNotice(readableError(error)); setStage('blocked')
      onDraftLock(true)
    } finally { busy.current = false }
  }

  const totalPayments = payments.reduce((acc, payment) => {
    try {
      const amount = pesosToCents(payment.amountText)
      return amount === null ? acc : acc + BigInt(amount)
    } catch { return acc }
  }, 0n)
  const currentTotal = draft.totals?.total_cents ?? null

  return <section className="real-ops-subpanel real-pos-checkout" aria-label="Pagos y confirmación REAL">
    <h2>4. Pagos declarados y confirmación</h2>
    <p className="real-auth-note"><strong>Los pagos son declaraciones del vendedor.</strong> No se consulta ni acredita dinero en bancos, tarjetas, Cuenta DNI o Mercado Pago. Una venta confirmada sí genera comprobante y, si incluye bienes físicos, descuenta stock en PostgreSQL.</p>

    {stage === 'checking' && <p role="status">Verificando ventas pendientes en IndexedDB…</p>}
    {stage === 'blocked' && <>
      <p role="alert" className="real-auth-message real-auth-error">{notice || 'No se pudo verificar si existe una venta pendiente. No se enviará ningún POST.'}</p>
      <button type="button" className="real-auth-secondary" onClick={() => void verifyStorage()}>Volver a comprobar almacenamiento local</button>
    </>}

    {stage === 'editing' && <>
      <p>Revisá los importes y declaralos en uno o varios medios. Los importes deben sumar exactamente el total de la venta.</p>
      {payments.map((row, i) => <div className="real-pos-payment" key={i}>
        <label>Medio de pago {i + 1}
          <select aria-label={'Medio de pago ' + (i + 1)} value={row.method} onChange={event =>
            changePayment(i, { method: event.target.value as PosPaymentDraft['method'] })}>
            {SALE_PAYMENT_METHODS.map(method =>
              <option value={method} key={method}>{POS_PAYMENT_LABELS[method]}</option>)}
          </select>
        </label>
        <label>Importe declarado (ARS) {i + 1}
          <input aria-label={'Importe declarado ' + (i + 1)} inputMode="decimal"
            value={row.amountText} onChange={event => changePayment(i, { amountText: event.target.value })}/>
        </label>
        <label>Referencia (opcional) {i + 1}
          <input aria-label={'Referencia de pago ' + (i + 1)} maxLength={120}
            value={row.reference} onChange={event => changePayment(i, { reference: event.target.value })}/>
        </label>
        {payments.length > 1 && <button className="real-auth-link" type="button" onClick={() => {
          setPaymentModified(true)
          setPayments(current => current.filter((_, index) => index !== i))
        }}>Quitar medio {i + 1}</button>}
      </div>)}
      <button type="button" className="real-auth-secondary" disabled={payments.length >= 6}
        onClick={() => {
          setPaymentModified(true)
          setPayments(current => [...current, { method: 'TRANSFERENCIA', amountText: '', reference: '' }])
        }}>Agregar otro medio de pago</button>
      <p className="real-pos-payment-summary">Pagos ingresados: <strong>{pesos(Number(totalPayments))}</strong>
        {' · '} Total a declarar: <strong>{currentTotal === null ? '—' : pesos(currentTotal)}</strong>
      </p>
      <label>Notas de la venta (opcional)
        <textarea aria-label="Notas de la venta" rows={2} maxLength={500}
          value={notes} onChange={event => setNotes(event.target.value)}/>
      </label>
      {notice && <p role="alert" className="real-auth-message real-auth-error">{notice}</p>}
      <button type="button" className="real-auth-primary" disabled={!currentTotal}
        onClick={reviewSale}>Revisar venta y pagos</button>
    </>}

    {stage === 'review' && review && <>
      <div className="real-pos-final-review" aria-label="Revisión final de la venta">
        <h3>Revisión final, antes del registro</h3>
        <p><strong>Empresa:</strong> {businessName}</p>
        <p><strong>Sede:</strong> {location?.name ?? 'Sin sede · servicios'}</p>
        {review.body.lines.map((line, i) => <p key={i}>
          {items.find(item => item.id === line.catalog_item_id)?.name ?? 'Artículo'}:
          {' '}{posQuantityText(line.quantity_milli)} × {pesos(line.unit_price_cents)}
          {' = '} <strong>{pesos(review.totals.line_totals_cents[i])}</strong>
        </p>)}
        <p>Subtotal: <strong>{pesos(review.totals.subtotal_cents)}</strong></p>
        <p>Descuento: <strong>−{pesos(review.totals.discount_cents)}</strong></p>
        <p className="real-pos-final-total">TOTAL: <strong>{pesos(review.totals.total_cents)}</strong></p>
        <h4>Pagos declarados</h4>
        {review.body.payments.map((payment, i) =>
          <p key={i}>{POS_PAYMENT_LABELS[payment.method]} · {pesos(payment.amount_cents)}
            {payment.reference ? ' · ' + payment.reference : ''}</p>)}
        {review.body.notes && <p>Notas: {review.body.notes}</p>}
      </div>
      <label className="real-pos-ack">
        <input type="checkbox" aria-label="Acepto registrar esta venta REAL"
          checked={ack} onChange={e => setAck(e.target.checked)}/>
        Confirmo empresa, sede, precios, cantidades y medios declarados. Entiendo que una venta confirmada registra comprobante y afecta stock físico.
      </label>
      {!MUTATIONS_ENABLED && <p className="real-auth-note">T10-D en validación: el registro REAL está bloqueado en tu entorno hasta completar la aceptación T10-E. Podés revisar todos los datos sin generar ventas.</p>}
      <div className="real-pos-confirm-actions">
        <button type="button" className="real-auth-secondary" onClick={() => {
          setStage('editing'); setReview(null); setAck(false); onDraftLock(false)
        }}>Volver a editar</button>
        <button type="button" className="real-auth-primary"
          disabled={!ack || !MUTATIONS_ENABLED} onClick={() => void confirmReviewed()}>
          Confirmar y registrar venta REAL
        </button>
      </div>
    </>}

    {stage === 'sending' && <p role="status">Verificando y enviando la solicitud original de manera segura… No cierres la sesión hasta consultar el resultado.</p>}

    {stage === 'pending' && pending && <>
      <p role="alert" className="real-auth-message real-ops-warning">
        Hay una solicitud de venta guardada que requiere recuperación. NO crees otra venta ni cambies su contenido.
      </p>
      <p><strong>Clave original:</strong> <code>{pending.key}</code></p>
      <p><strong>Total original:</strong> {pesos(
        pending.body.lines.reduce((total, line) =>
          total + Number((BigInt(line.quantity_milli) * BigInt(line.unit_price_cents) + 500n) / 1000n), 0)
        - pending.body.discount_cents)}</p>
      {salePendingOld(pending) &&
        <p className="real-auth-note">Este intento tiene más de 30 días. No se borra automáticamente.</p>}
      {notice && <p role="alert" className="real-auth-message real-ops-warning">{notice}</p>}
      <button type="button" className="real-auth-secondary" onClick={() => void recoverOriginal()}>
        Recuperar comprobante por solicitud (GET)
      </button>
      {recoveryChecked && <>
        <label className="real-pos-ack">
          <input type="checkbox" aria-label="Acepto reenviar la misma solicitud"
            checked={ack} onChange={event => setAck(event.target.checked)}/>
          Entiendo que el 404 es ambiguo. Autorizo reintentar exclusivamente la misma solicitud guardada (misma clave y cuerpo).
        </label>
        <button type="button" className="real-auth-primary"
          disabled={!MUTATIONS_ENABLED || !ack} onClick={() => void replayOriginal()}>
          Reintentar exactamente esta venta
        </button>
      </>}
    </>}

    {stage === 'confirmed' && confirmed && <>
      <p role="status" className="real-auth-message real-ops-success">Venta confirmada en PostgreSQL. Comprobante REAL: {confirmed.receipt.id}</p>
      <p><strong>Clave de solicitud:</strong> <code>{confirmed.receipt.request_id}</code></p>
      <p><strong>Total confirmado:</strong> {pesos(confirmed.receipt.total_cents)}</p>
      <p><strong>Pagos:</strong> declarados, sin acreditación externa.</p>
      {!confirmed.journalCleared && <p role="alert" className="real-auth-message real-ops-warning">{notice}</p>}
      {confirmed.journalCleared
        ? <button type="button" className="real-auth-secondary" onClick={() => {
          setConfirmed(null); setPaymentModified(false); setPayments([initialPayment(null)])
          setNotes(''); setAck(false); setStage('editing'); onDraftLock(false)
        }}>Preparar otra venta</button>
        : <button type="button" className="real-auth-secondary" onClick={() => void recoverOriginal()}>
            Reintentar limpieza mediante GET
          </button>}
      <button type="button" className="real-auth-link"
        onClick={() => onNavigate('/real/empresas/' + businessId + '/ventas')}>
        Abrir historial REAL
      </button>
    </>}
  </section>
}
