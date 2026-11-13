import { useEffect, useMemo, useRef, useState } from 'react'
import { RealPhotoPreview } from '../photos/RealPhotos.tsx'
import { ApiHttpError, ApiTransportError } from '../../api/httpClient.ts'
import { centsToPesos, pesosToCents } from '../catalog/realCatalogGateway.ts'
import type { CatalogItem } from '../catalog/realCatalogGateway.ts'
import type { LocationRecord } from '../businesses/realOperationsGateway.ts'
import type { PosCartLine } from './realPosDraft.ts'
import { previewPosCart, posQuantityText } from './realPosDraft.ts'
import type { SaleCommand, SaleTotals } from './realSaleCommand.ts'
import { SALE_PAYMENT_METHODS } from './realSaleCommand.ts'
import { completeLastPosPayment, composePosCheckout, POS_PAYMENT_LABELS } from './realPosCheckoutDraft.ts'
import type { PosPaymentDraft } from './realPosCheckoutDraft.ts'
import { createSaleWriteCoordinator } from './realSaleWriteCoordinator.ts'
import type { ConfirmedSale } from './realSaleWriteCoordinator.ts'
import { createPaymentConnectionGateway } from '../payments/paymentConnectionGateway.ts'
import { createQrIntentGateway, makeQrIntentCommand, qrIntentError } from '../payments/qrIntentGateway.ts'
import {
  qrPendingJournal, qrPendingScope, newQrPending,
} from '../payments/qrPendingJournal.ts'
import type { QrPending } from '../payments/qrPendingJournal.ts'
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
  onStageChange: (stage: PosCheckoutStage) => void
  onConfirmed: () => void
  onUnauthorized: () => void
  onNavigate: (path: string) => void
}

/**
 * T10-D: explicit confirmation + IndexedDB-first POST, no automatic replay.
 * REAL sale mutation is OFF by default outside explicitly authorized environments.
 * This front-end switch is not RBAC: FastAPI validates every write.
 */
const MUTATIONS_ENABLED = import.meta.env.VITE_PYME_ENABLE_REAL_SALES === '1'
const EXHIBITION_UI = import.meta.env.VITE_PYME_QR_EXHIBITION === '1'
const pesos = (c: number) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS',
}).format(c / 100)
export type PosCheckoutStage = 'checking' | 'editing' | 'review' | 'sending' | 'pending' | 'confirmed' | 'blocked'
type Stage = PosCheckoutStage
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
  items, cart, discountText, onDraftLock, onStageChange, onConfirmed, onUnauthorized, onNavigate,
}: Props) {
  const coordinator = useMemo(
    () => createSaleWriteCoordinator(token, userId, businessId),
    [token, userId, businessId],
  )
  const qrApi = useMemo(() => createQrIntentGateway(token, businessId), [token, businessId])
  const connectionApi = useMemo(() => createPaymentConnectionGateway(token, businessId), [token, businessId])
  const [qrConnection, setQrConnection] = useState<'loading' | 'active' | 'inactive' | 'error'>(EXHIBITION_UI ? 'active' : 'loading')
  const [qrUnknown, setQrUnknown] = useState(false)
  const [qrBusy, setQrBusy] = useState(false)
  const qrAttempt = useRef<QrPending | null>(null)
  const qrScope = useMemo(() => qrPendingScope(userId, businessId), [userId,businessId])
  const [qrRecoveryChecked, setQrRecoveryChecked] = useState(false)
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
  useEffect(()=>onStageChange(stage),[stage,onStageChange])

  useEffect(() => {
    if (EXHIBITION_UI) return // No consultar ni exigir vínculos con Mercado Pago.
    const ctrl = new AbortController()
    setQrConnection('loading')
    void connectionApi.get(ctrl.signal).then(row => {
      if (!ctrl.signal.aborted) setQrConnection(row.status === 'ACTIVA' ? 'active' : 'inactive')
    }).catch(err => {
      if (ctrl.signal.aborted) return
      if (err instanceof ApiHttpError && err.status === 401) onUnauthorized()
      else setQrConnection('error')
    })
    return () => ctrl.abort()
  }, [connectionApi, onUnauthorized])

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

  // Antes de una edición manual, el pago único sigue el total del carrito
  // directamente en el render. Evita sincronizar estado derivado con useEffect.
  const shownPayments = !paymentModified && stage === 'editing'
    ? [initialPayment(draft.totals?.total_cents ?? null)]
    : payments

  useEffect(() => {
    let mounted = true
    onDraftLock(true) // fail closed until IndexedDB verifies absence of pending command
    void Promise.all([coordinator.pending(), qrPendingJournal.load(qrScope)]).then(([row, qrRow]) => {
      if (!mounted) return
      setPending(row)
      qrAttempt.current = qrRow
      setQrUnknown(Boolean(qrRow))
      setStage(row ? 'pending' : 'editing')
      onDraftLock(Boolean(row || qrRow))
    }).catch(error => {
      if (!mounted) return
      setStage('blocked')
      setNotice(readableError(error))
      onDraftLock(true)
    })
    return () => { mounted = false }
  }, [coordinator, onDraftLock, qrScope])

  const changePayment = (i: number, changes: Partial<PosPaymentDraft>) => {
    setPaymentModified(true)
    setPayments(shownPayments.map((row, index) => index === i ? { ...row, ...changes } : row))
  }

  const reviewSale = () => {
    if (qrUnknown || busy.current) return
    setNotice('')
    try {
      if (!draft.totals) throw new RangeError(draft.problem || 'Carrito inválido.')
      const command = composePosCheckout(
        location?.id ?? null, cart, draft.totals.discount_cents, notes, shownPayments,
      )
      if (command.totals.total_cents !== draft.totals.total_cents)
        throw new RangeError('El total cambió durante la revisión.')
      setReview(command)
      setStage('review')
      setAck(false)
      onDraftLock(true)
    } catch (error) { setNotice(readableError(error)) }
  }

  async function beginQrIntent(replayOnly = false) {
    if (busy.current || stage !== 'editing' || qrConnection !== 'active') return
    if (qrUnknown && !replayOnly) return
    if (replayOnly && !qrRecoveryChecked) return
    setNotice('')
    busy.current = true
    setQrBusy(true)
    setStage('sending')
    onDraftLock(true)
    try {
      let saved: QrPending
      if (replayOnly) {
        const original = await qrPendingJournal.load(qrScope)
        if (!original || original.key !== qrAttempt.current?.key)
          throw new Error('El intento QR guardado cambió. Volvé a recuperar por GET.')
        saved = await qrPendingJournal.reserve(original)
      } else {
        if (!draft.totals) throw new RangeError(draft.problem || 'El carrito no tiene total válido.')
        const command = makeQrIntentCommand(location?.id ?? null, cart, draft.totals.discount_cents, notes)
        saved = await qrPendingJournal.reserve(newQrPending(userId, businessId, command))
      }
      qrAttempt.current = saved
      setQrUnknown(true)
      setQrRecoveryChecked(false)
      // El cuerpo y la clave se persistieron y releyeron de IndexedDB ANTES de POST.
      const result = await qrApi.create(saved.body, saved.key)
      await qrPendingJournal.close(saved, result)
      qrAttempt.current = null
      setQrUnknown(false)
      onNavigate('/real/empresas/' + businessId + '/qr-cobros/' + result.id)
    } catch (error) {
      setQrUnknown(true)
      setQrRecoveryChecked(false)
      setNotice(qrIntentError(error) + ' Recuperá el intento original por GET antes de reintentar.')
      setStage('editing')
      onDraftLock(true)
      if (error instanceof ApiHttpError && error.status === 401) onUnauthorized()
    } finally {
      busy.current = false
      setQrBusy(false)
    }
  }

  async function recoverQrAttempt() {
    if (busy.current) return
    busy.current = true
    setQrBusy(true)
    setNotice('')
    setQrRecoveryChecked(false)
    try {
      const original = await qrPendingJournal.load(qrScope)
      if (!original) throw new Error('No existe un intento QR guardado para esta cuenta y empresa.')
      qrAttempt.current = original
      const found = await qrApi.byRequest(original.key)
      await qrPendingJournal.close(original, found)
      qrAttempt.current = null
      setQrUnknown(false)
      onNavigate('/real/empresas/' + businessId + '/qr-cobros/' + found.id)
    } catch (error) {
      setQrUnknown(true)
      if (error instanceof ApiHttpError && error.status === 404) {
        setQrRecoveryChecked(true)
        setNotice('GET devolvió 404. El POST anterior podría no haber llegado. Podés reintentar explícitamente la misma clave y el mismo cuerpo guardado.')
      } else {
        setNotice(qrIntentError(error))
        if (error instanceof ApiHttpError && error.status === 401) onUnauthorized()
      }
      onDraftLock(true)
    } finally {
      busy.current = false
      setQrBusy(false)
    }
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
      const [row, qrRow] = await Promise.all([coordinator.pending(), qrPendingJournal.load(qrScope)])
      setPending(row)
      qrAttempt.current = qrRow
      setQrUnknown(Boolean(qrRow))
      setStage(row ? 'pending' : 'editing')
      onDraftLock(Boolean(row || qrRow))
    } catch (error) {
      setNotice(readableError(error)); setStage('blocked')
      onDraftLock(true)
    } finally { busy.current = false }
  }

  const totalPayments = shownPayments.reduce((acc, payment) => {
    try {
      const amount = pesosToCents(payment.amountText)
      return amount === null ? acc : acc + BigInt(amount)
    } catch { return acc }
  }, 0n)
  const currentTotal = draft.totals?.total_cents ?? null
  const outstandingCents=currentTotal===null?null:BigInt(currentTotal)-totalPayments
  function fillLastPayment(){
    setNotice('')
    try{
      if(currentTotal===null)throw new RangeError('Primero armá un carrito con total válido.')
      setPayments(completeLastPosPayment(currentTotal,shownPayments))
      setPaymentModified(true)
    }catch(err){
      setNotice(readableError(err))
    }
  }

  return <section className={'real-ops-subpanel real-pos-checkout e3-pos-checkout e3-pos-checkout-'+stage}
      aria-label="Pagos y confirmación REAL" data-stage={stage}>
    <h2>{stage==='review'?'Detalle final para confirmar la venta'
      :stage==='pending'?'Recuperar venta pendiente'
      :stage==='confirmed'?'Venta confirmada'
      :stage==='sending'?'Procesando venta'
      :stage==='blocked'?'Verificar venta pendiente'
      :'4. Pagos declarados y confirmación'}</h2>
    <p className="real-auth-note"><strong>Los pagos son declaraciones del vendedor.</strong> No se consulta ni acredita dinero en bancos, tarjetas, Cuenta DNI o Mercado Pago. Una venta confirmada sí genera comprobante y, si incluye bienes físicos, descuenta stock en PostgreSQL.</p>

    {stage === 'checking' && <p role="status">Verificando ventas pendientes en IndexedDB…</p>}
    {stage === 'blocked' && <>
      <p role="alert" className="real-auth-message real-auth-error">{notice || 'No se pudo verificar si existe una venta pendiente. No se enviará ningún POST.'}</p>
      <button type="button" className="real-auth-secondary" onClick={() => void verifyStorage()}>Volver a comprobar almacenamiento local</button>
    </>}

    {stage === 'editing' && <>
      <p>Revisá los importes y declaralos en uno o varios medios. Los importes deben sumar exactamente el total de la venta.</p>
      {draft.totals && <div className="e3-pos-payment-breakdown" aria-label="Cálculo del total a cobrar" role="status">
        <span>Subtotal de artículos <strong>{pesos(draft.totals.subtotal_cents)}</strong></span>
        <span>Descuento aplicado a la venta <strong>−{pesos(draft.totals.discount_cents)}</strong></span>
        <span>Total a cobrar <strong>{pesos(draft.totals.total_cents)}</strong></span>
        <small>El descuento cambia el total a pagar; no altera los precios unitarios de catálogo.</small>
      </div>}
      <div className="e3-pos-qr-action" aria-label={EXHIBITION_UI ? "QR de exhibición no pagable" : "Pago alternativo con QR DEMO"}>
        <h3>{EXHIBITION_UI ? 'QR de exhibición · NO PAGABLE' : 'Mercado Pago QR (DEMO)'}</h3>
        <p>{EXHIBITION_UI
          ? 'Solo exhibición: mostrará artículos, cantidades, descuentos y total del carrito. El código no abre Mercado Pago, no crea órdenes ni registra ventas o pagos. Para registrar una venta real utilizá los medios declarados.'
          : 'Alternativa a los pagos declarados: genera un intento para el total completo del carrito, sin registrar venta ni cobrar dinero. Podrás ver los artículos, cantidades y descuentos junto al QR.'}</p>
        {qrConnection === 'loading' && <p role="status">Consultando la vinculación de Mercado Pago…</p>}
        {qrConnection === 'error' && <p role="alert">No se pudo verificar la vinculación. Abrí Medios de cobro y volvé a intentar.</p>}
        {qrConnection === 'inactive' && <p role="status">Antes de generar un QR, vinculá la cuenta de Mercado Pago DEMO de esta empresa.</p>}
        {qrUnknown && <p role="alert" className="real-auth-message real-ops-warning">
          Existe un intento QR guardado en IndexedDB. No modifiques el carrito ni crees otra clave: consultá su estado original.
        </p>}
        <div className="e3-pos-qr-buttons">
          {qrConnection === 'active' && <button type="button" className="real-auth-primary"
            disabled={!draft.totals || qrBusy || qrUnknown}
            onClick={() => void beginQrIntent()}>
              {qrBusy ? 'Generando QR…' : EXHIBITION_UI ? 'Generar QR de exhibición' : 'Generar QR de cobro (DEMO)'}
          </button>}
          {qrUnknown && <button type="button" className="real-auth-secondary"
            disabled={qrBusy} onClick={() => void recoverQrAttempt()}>
            Consultar intento por solicitud
          </button>}
          {qrUnknown && <button type="button" className="real-auth-secondary"
            disabled={qrBusy || !qrRecoveryChecked} onClick={() => void beginQrIntent(true)}>
            Reintentar mismo QR y clave
          </button>}
          <button type="button" className="real-auth-secondary"
            onClick={() => onNavigate('/real/empresas/' + businessId + '/cobros-qr')}>
            {EXHIBITION_UI ? 'Ver QR de exhibición anteriores' : 'Ver cobros QR anteriores'}
          </button>
          {qrConnection !== 'active' && <button type="button" className="real-auth-secondary"
            onClick={() => onNavigate('/real/empresas/' + businessId + '/medios-de-cobro')}>
            Ir a Medios de cobro
          </button>}
        </div>
      </div>
      {shownPayments.map((row, i) => <div className="real-pos-payment" key={i}>
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
        {i===shownPayments.length-1&&<div className="e3-pos-fill-payment-block">
          <button type="button" className="real-auth-secondary e3-pos-fill-payment"
            aria-label="Completar saldo con último medio de pago" onClick={fillLastPayment}
            disabled={currentTotal===null}>Completar saldo pendiente</button>
          {currentTotal===null&&<small role="status">
            Primero agregá artículos al carrito y obtené un total válido para completar el saldo.
          </small>}
          {currentTotal!==null&&<small>
            Calcula el importe restante después del descuento y los medios anteriores. No registra la venta.
          </small>}
        </div>}
        {shownPayments.length > 1 && <button className="real-auth-link" type="button" onClick={() => {
          setPaymentModified(true)
          setPayments(shownPayments.filter((_, index) => index !== i))
        }}>Quitar medio {i + 1}</button>}
      </div>)}
      <button type="button" className="real-auth-secondary" disabled={shownPayments.length >= 6}
        onClick={() => {
          setPaymentModified(true)
          setPayments([...shownPayments, { method: 'TRANSFERENCIA', amountText: '', reference: '' }])
        }}>Agregar otro medio de pago</button>
      <p className="real-pos-payment-summary" role="status">Pagos ingresados: <strong>{pesos(Number(totalPayments))}</strong>
        {' · '} Total a declarar: <strong>{currentTotal === null ? '—' : pesos(currentTotal)}</strong>
        {outstandingCents!==null&&<span className={'e3-pos-outstanding'+
          (outstandingCents===0n?' e3-pos-paid':outstandingCents<0n?' e3-pos-excess':'')}>
          {outstandingCents===0n?' · Importe cubierto'
            :outstandingCents>0n?' · Falta declarar: '+pesos(Number(outstandingCents))
            :' · Excedente: '+pesos(Number(-outstandingCents))}
        </span>}
      </p>
      <label>Notas de la venta (opcional)
        <textarea aria-label="Notas de la venta" rows={2} maxLength={500}
          value={notes} onChange={event => setNotes(event.target.value)}/>
      </label>
      {notice && <p role="alert" className="real-auth-message real-auth-error">{notice}</p>}
      <div className="e3-pos-finalize-bar">
        <p>El siguiente paso muestra el detalle completo y pide confirmación. Todavía no registra la venta ni mueve stock.</p>
        <button type="button" className="real-auth-primary" disabled={!currentTotal || qrBusy || qrUnknown}
          onClick={reviewSale}>Finalizar venta</button>
      </div>
    </>}

    {stage === 'review' && review && <>
      <div className="real-pos-final-review" aria-label="Revisión final de la venta">
        <h3>Detalle completo de la venta · pendiente de confirmación</h3>
        <p><strong>Empresa:</strong> {businessName}</p>
        <p><strong>Sede:</strong> {location?.name ?? 'Sin sede · servicios'}</p>
        <div className="e3-pos-review-lines" aria-label="Artículos incluidos en la venta">
          {review.body.lines.map((line,i)=>{
            const item=items.find(entry=>entry.id===line.catalog_item_id)
            return <div key={line.catalog_item_id} className="e3-pos-review-line">
              {item&&<RealPhotoPreview token={token} owner={{kind:'CATALOG',businessId,resourceId:item.id}}
                alt={'Portada actual de '+item.name} className="e3-pos-review-photo"/>}
              <div><strong>{item?.name??'Artículo'}</strong>
                <small>{posQuantityText(line.quantity_milli)} {item?.unit??''} × {pesos(line.unit_price_cents)} por unidad</small>
              </div>
              <strong>{pesos(review.totals.line_totals_cents[i])}</strong>
            </div>
          })}
        </div>
        <p className="e3-photo-reference-note">Las imágenes son referencias visuales del catálogo actual; no forman parte del comprobante ni modifican importes.</p>
        <div className="e3-pos-review-totals" aria-label="Total con descuento">
          <p>Subtotal de artículos <strong>{pesos(review.totals.subtotal_cents)}</strong></p>
          <p>Descuento aplicado <strong>−{pesos(review.totals.discount_cents)}</strong></p>
          <p className="real-pos-final-total">Total a cobrar <strong>{pesos(review.totals.total_cents)}</strong></p>
        </div>
        <h4>Pagos declarados</h4>
        <div className="e3-pos-review-payments">
          {review.body.payments.map((payment,i)=>
            <div key={i}><span>{POS_PAYMENT_LABELS[payment.method]}{payment.reference?' · '+payment.reference:''}</span>
              <strong>{pesos(payment.amount_cents)}</strong></div>)}
        </div>
        {review.body.notes && <p>Notas: {review.body.notes}</p>}
      </div>
      <label className="real-pos-ack">
        <input type="checkbox" aria-label="Acepto registrar esta venta REAL"
          checked={ack} onChange={e => setAck(e.target.checked)}/>
        Confirmo empresa, sede, precios, cantidades y medios declarados. Entiendo que una venta confirmada registra comprobante y afecta stock físico.
      </label>
      {!MUTATIONS_ENABLED && <p className="real-auth-note">El registro de ventas REAL está deshabilitado en este entorno. Solo se habilita mediante configuración explícita en un entorno autorizado; podés revisar los datos sin registrar operaciones.</p>}
      <div className="real-pos-confirm-actions e3-pos-confirm-actions">
        <button type="button" className="real-auth-secondary" onClick={() => {
          setStage('editing'); setReview(null); setAck(false); onDraftLock(false)
        }}>Volver a editar</button>
        <button type="button" className="real-auth-primary"
          disabled={!ack || !MUTATIONS_ENABLED} onClick={() => void confirmReviewed()}>
          Confirmar y registrar venta REAL
        </button>
      </div>
    </>}

    {stage === 'sending' && <p role="status">{qrBusy ? 'Generando un QR DEMO y guardando su detalle en PostgreSQL…' : 'Verificando y enviando la solicitud original de venta… No cierres la sesión hasta consultar el resultado.'}</p>}

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
