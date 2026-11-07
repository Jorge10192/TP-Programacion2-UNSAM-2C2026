import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon'
import { demoGateway } from '../../data/demo/demoStore'
import type { DemoBusiness, DemoCatalogItem, DemoLocation, DemoSale } from '../../data/demo/demoStore'
import type { DemoCashSession } from '../../data/demo/cashPolicy'
import { moneyDisplay, moneyInput, parseMoneyCents } from '../../data/demo/catalogPolicy'
import { lineTotalCents, parseQuantityMilli, quantityText } from '../../data/demo/purchasePolicy'
import { saleAmounts, salePaymentLabels } from '../../data/demo/salePolicy'
import type { SaleInput, SalePaymentMethod } from '../../data/demo/salePolicy'
import { DemoPhoto } from '../common/DemoPhoto'
import { demoImageKey } from '../../data/demo/imagePolicy'
import { stockBalances, stockKey } from '../../data/demo/inventoryPolicy'
import type { InventoryMovement } from '../../data/demo/inventoryPolicy'
import { SaleCatalogPicker } from './SaleCatalogPicker'
import { accountSupportsDeclaredPayment } from '../../data/demo/financialAccountPolicy'
import type { DemoFinancialAccount } from '../../data/demo/financialAccountPolicy'

type DraftLine = { key: string; catalogItemId: string; quantity: string; price: string }
type DraftPayment = { key: string; method: SalePaymentMethod; amount: string; financialAccountId: string }
const newLine = (): DraftLine => ({ key: crypto.randomUUID(), catalogItemId: '', quantity: '1', price: '' })
const newPayment = (): DraftPayment => ({ key: crypto.randomUUID(), method: 'EFECTIVO', amount: '', financialAccountId: '' })

export function SalesPage({ business, items, locations, movements, sales, sessions, accounts }: {
  business: DemoBusiness
  items: DemoCatalogItem[]
  locations: DemoLocation[]
  movements: InventoryMovement[]
  sales: DemoSale[]
  sessions: DemoCashSession[]
  accounts: DemoFinancialAccount[]
}) {
  const [creating, setCreating] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [formVersion, setFormVersion] = useState(0)
  const selected = sales.find((sale) => sale.id === detailId)
  const searchable = query.trim().toLocaleLowerCase('es-AR')
  const shown = sales.filter((sale) => !searchable || [
    sale.id, sale.notes, ...sale.lines.flatMap((line) => [line.name, line.sku]),
  ].some((field) => field.toLocaleLowerCase('es-AR').includes(searchable)))
  const sold = sales.reduce((sum, sale) => sum + sale.totalCents, 0)

  function saved(id: string) {
    setCreating(false)
    setDetailId(id)
    setFormVersion((version) => version + 1)
    setNotice('Venta DEMO registrada. Se actualizaron las existencias de productos físicos; los pagos son declaraciones internas, no acreditaciones externas.')
  }

  return <>
    <div className="page-heading">
      <div>
        <p className="eyebrow">OPERACIONES · EMPRESA DEMO</p>
        <h1>Ventas</h1>
        <p>Venta rápida, descuentos, pagos divididos e historial de {business.name}.</p>
      </div>
      <button type="button" className="button button-primary" onClick={() => { setCreating(!creating); setDetailId(null); setNotice('') }}>
        <Icon name={creating ? 'close' : 'plus'} size={17}/>{creating ? 'Cerrar formulario' : 'Nueva venta'}
      </button>
    </div>

    <section className="sales-kpis">
      <div><span className="feature-icon blue"><Icon name="receipt"/></span><small>Ventas DEMO</small><strong>{sales.length}</strong></div>
      <div><span className="feature-icon mint"><Icon name="chart"/></span><small>Total de ventas declaradas</small><strong>{moneyDisplay(sold)}</strong></div>
      <div><span className="feature-icon violet"><Icon name="shopping"/></span><small>Productos y servicios disponibles</small><strong>{items.filter((item) => item.status === 'ACTIVO' && item.sellable).length}</strong></div>
    </section>
    <div className="informational-note">
      <Icon name="shield" size={19}/>
      <span>Una venta descuenta stock. <strong>Abrí caja antes de vender</strong> para incluir el efectivo en su arqueo. Los pagos son declarados, sin verificación bancaria.</span>
    </div>
    {notice && <p className="form-message success" role="status">{notice}</p>}

    {creating && <SaleForm key={business.id + ':' + formVersion}
      business={business} items={items} locations={locations} movements={movements} sessions={sessions}
      accounts={accounts} onSaved={saved} onCancel={() => setCreating(false)}/>}

    <section className="form-panel sales-history">
      <div className="business-section-heading">
        <div><Icon name="receipt" size={21}/><h2>Historial de ventas</h2></div>
        <span>{shown.length} visibles de {sales.length}</span>
      </div>
      <label className="form-field sales-search"><span>Buscar artículo, SKU o referencia</span>
        <input type="search" placeholder="Buscar en ventas…" value={query} onChange={(event) => setQuery(event.target.value)}/>
      </label>
      {shown.length === 0 ? <div className="sales-empty">
        <Icon name="receipt" size={34}/>
        <h3>{sales.length ? 'No hay resultados para esa búsqueda' : 'Todavía no hay ventas registradas'}</h3>
        <p>{sales.length ? 'Probá con otra búsqueda.' : 'Registrá una venta de prueba de bienes o servicios desde el botón «Nueva venta».'}</p>
      </div> : <div className="sales-list">
        {shown.slice(0, 100).map((sale) => <article className="sales-list-row" key={sale.id}>
          <span className="feature-icon blue"><Icon name="receipt" size={20}/></span>
          <div>
            <strong>Venta DEMO · {sale.lines.length} {sale.lines.length === 1 ? 'renglón' : 'renglones'}</strong>
            <small>{new Date(sale.createdAt).toLocaleString('es-AR')} · {sale.lines.map((line) => line.name).join(', ')}</small>
          </div>
          <strong>{moneyDisplay(sale.totalCents)}</strong>
          <button type="button" className="button button-secondary" onClick={() => setDetailId(sale.id)}>Ver comprobante</button>
        </article>)}
      </div>}
      {shown.length > 100 && <p className="inventory-limit">Mostrando las primeras 100 ventas. Usá el buscador para refinar.</p>}
    </section>

    {selected && <section className="form-panel sales-detail" aria-label="Detalle de venta de demostración">
      <div className="business-section-heading">
        <div><Icon name="receipt" size={22}/><h2>Comprobante de venta DEMO</h2></div>
        <button type="button" className="button button-secondary" onClick={() => setDetailId(null)}><Icon name="close" size={17}/> Cerrar</button>
      </div>
      <p><strong>{business.name}</strong> · {new Date(selected.createdAt).toLocaleString('es-AR')} · <code>{selected.id}</code></p>
      <p>Ubicación: {locations.find((location) => location.id === selected.locationId)?.name ?? 'Sin ubicación física (servicios)'}</p>
      <p>Jornada de caja: {selected.cashSessionId ? 'Vinculada a una jornada DEMO (sólo suma los pagos en efectivo).' : 'Sin jornada vinculada; no ingresa en arqueos de caja.'}</p>
      <div className="sales-receipt-list">
        {selected.lines.map((line) => <div key={line.id}>
          <strong>{line.name}</strong><span>{quantityText(line.quantityMilli, line.unit)} × {moneyDisplay(line.unitPriceCents)}</span>
          <strong>{moneyDisplay(line.lineTotalCents)}</strong>
        </div>)}
      </div>
      <div className="sales-receipt-totals">
        <span>Subtotal</span><strong>{moneyDisplay(selected.subtotalCents)}</strong>
        <span>Descuento</span><strong>− {moneyDisplay(selected.discountCents)}</strong>
        <span>Total registrado</span><strong>{moneyDisplay(selected.totalCents)}</strong>
      </div>
      <h3>Pagos declarados</h3>
      {selected.payments.map((payment, index) => <p key={index}>{salePaymentLabels[payment.method]}: <strong>{moneyDisplay(payment.amountCents)}</strong>
        {payment.financialAccountLabelSnapshot && <small> · Cuenta declarada: {payment.financialAccountLabelSnapshot}</small>}</p>)}
      {selected.notes && <p>Observaciones: {selected.notes}</p>}
      <div className="informational-note"><Icon name="shield" size={17}/><span>Comprobante interno DEMO. No acredita cobro real ni representa comprobante fiscal.</span></div>
    </section>}
  </>
}

function SaleForm({ business, items, locations, movements, sessions, accounts, onSaved, onCancel }: {
  business: DemoBusiness; items: DemoCatalogItem[]; locations: DemoLocation[]
  movements: InventoryMovement[]
  sessions: DemoCashSession[]
  accounts: DemoFinancialAccount[]
  onSaved: (id: string) => void; onCancel: () => void
}) {
  const [requestId] = useState(() => 'demo-sale-request-' + crypto.randomUUID())
  const [locationId, setLocationId] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([newLine()])
  const [payments, setPayments] = useState<DraftPayment[]>([newPayment()])
  const [discount, setDiscount] = useState('0')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sellable = items.filter((item) => item.status === 'ACTIVO' && item.sellable)
  const sellLocations = locations.filter((location) => location.status === 'ACTIVA' && location.canSell)
  const byId = new Map(items.map((item) => [item.id, item]))
  const physicalSelected = lines.some((line) => line.catalogItemId && byId.get(line.catalogItemId)?.kind !== 'SERVICIO')
  const eligibleLocations = sellLocations.filter((location) => !physicalSelected || location.canStore)
  const linkedCashSession = sessions.find((session) => session.status === 'ABIERTA' && session.locationId === (locationId || null))
  const hasCash = payments.some((payment) => payment.method === 'EFECTIVO')

  const selectedMilli = new Map<string, number>()
  const selectedIds = new Set<string>()
  for (const line of lines) {
    const item = byId.get(line.catalogItemId)
    if (!item) continue
    selectedIds.add(item.id)
    try {
      selectedMilli.set(item.id, (selectedMilli.get(item.id) ?? 0) +
        parseQuantityMilli(line.quantity, item.unit))
    } catch {
      // Las cantidades incompletas se validarán en el formulario y al confirmar.
    }
  }

  function quickAddItem(itemId: string) {
    const item = byId.get(itemId)
    if (!item || item.status !== 'ACTIVO' || !item.sellable) return
    try {
      const existing = lines.find((line) => line.catalogItemId === item.id)
      const nextMilli = existing ? parseQuantityMilli(existing.quantity, item.unit) + 1000 : 1000
      if (item.kind !== 'SERVICIO') {
        const location = locations.find((loc) => loc.id === locationId)
        if (!location || location.status !== 'ACTIVA' || !location.canSell || !location.canStore) {
          throw new Error('Elegí una ubicación activa habilitada para vender y almacenar.')
        }
        const available = stockBalances(movements).get(stockKey(location.id, item.id)) ?? 0
        if (nextMilli > available) throw new Error('Stock insuficiente en esta ubicación. Revisá Inventario.')
      }
      if (existing) {
        patchLine(existing.key, { quantity: String(nextMilli / 1000) })
      } else {
        const empty = lines.find((line) => !line.catalogItemId)
        const fields = {
          catalogItemId: item.id, quantity: '1', price: moneyInput(item.priceCents),
        }
        if (empty) patchLine(empty.key, fields)
        else if (lines.length >= 30) throw new Error('La venta admite hasta 30 artículos diferentes.')
        else setLines((current) => [...current, { key: crypto.randomUUID(), ...fields }])
      }
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo agregar el artículo.')
    }
  }

  function patchLine(key: string, fields: Partial<DraftLine>) {
    setLines((old) => old.map((line) => line.key === key ? { ...line, ...fields } : line))
    setError('')
  }
  function chooseItem(key: string, itemId: string) {
    const item = byId.get(itemId)
    patchLine(key, { catalogItemId: item?.id ?? '', quantity: '1', price: item ? moneyInput(item.priceCents) : '' })
  }
  function patchPayment(key: string, fields: Partial<DraftPayment>) {
    setPayments((old) => old.map((p) => p.key === key ? { ...p, ...fields } : p))
    setError('')
  }
  function makeInput(): SaleInput {
    const validatedLines = lines.map((line, i) => {
      const item = byId.get(line.catalogItemId)
      if (!item) throw new Error('Seleccioná un artículo en el renglón ' + (i + 1) + '.')
      const unitPriceCents = parseMoneyCents(line.price)
      if (unitPriceCents === null) throw new Error('Ingresá el precio de ' + item.name + '.')
      return {
        catalogItemId: item.id, unitPriceCents,
        quantityMilli: parseQuantityMilli(line.quantity, item.unit),
      }
    })
    const discountCents = parseMoneyCents(discount) ?? 0
    const parsedPayments = payments.map((payment) => {
      const amountCents = parseMoneyCents(payment.amount)
      if (amountCents === null) throw new Error('Completá cada importe de pago declarado.')
      return { method: payment.method, amountCents, financialAccountId: payment.financialAccountId || null }
    })
    return { locationId: locationId || null, lines: validatedLines, discountCents,
      payments: parsedPayments, notes }
  }

  let totals: ReturnType<typeof saleAmounts> | null = null
  try {
    const candidateLines = lines.map((line) => {
      const item = byId.get(line.catalogItemId)
      if (!item) throw new Error('Renglón sin artículo.')
      const unitPriceCents = parseMoneyCents(line.price)
      if (unitPriceCents === null) throw new Error('Precio pendiente.')
      return { quantityMilli: parseQuantityMilli(line.quantity, item.unit), unitPriceCents }
    })
    totals = saleAmounts(candidateLines, parseMoneyCents(discount) ?? 0)
  } catch { /* Mientras se completa el formulario no hay total final válido. */ }

  function fillPayment() {
    if (!totals || payments.length === 0) return
    try {
      const others = payments.slice(1).reduce((sum, payment) => {
        const cents = parseMoneyCents(payment.amount)
        return sum + (cents ?? 0)
      }, 0)
      const difference = totals.totalCents - others
      if (difference <= 0) throw new Error('Los otros medios ya cubren o superan el total.')
      patchPayment(payments[0].key, { amount: moneyInput(difference) })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo completar el importe.')
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const sale = await demoGateway.registerSale(business.id, makeInput(), requestId)
      onSaved(sale.id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo registrar la venta.')
    } finally { setBusy(false) }
  }

  return <section className="form-panel sales-form">
    <div className="business-section-heading"><div><Icon name="shopping" size={22}/><h2>Venta rápida DEMO</h2></div><span>Sin cobros bancarios reales</span></div>
    <form className="demo-form" onSubmit={(event) => void submit(event)}>
      <div className="sales-form-top">
        <label className="form-field"><span>Ubicación de venta {physicalSelected ? '*' : '(opcional para servicios)'}</span>
          <select value={locationId} required={Boolean(physicalSelected)} onChange={(event) => setLocationId(event.target.value)}>
            <option value="">Sin ubicación</option>
            {eligibleLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>
        <p>Para vender productos físicos, elegí una ubicación activa habilitada para vender y almacenar. Los servicios no requieren stock ni depósito.</p>
      </div>

      <SaleCatalogPicker
        business={business} items={sellable} locationId={locationId}
        movements={movements} selectedMilli={selectedMilli}
        selectedIds={selectedIds} onAdd={quickAddItem}
      />

      <div className="sales-subheading"><h3>Carrito y detalles de la venta</h3><button type="button" className="button button-secondary" disabled={lines.length >= 30}
        onClick={() => setLines((old) => [...old, newLine()])}><Icon name="plus" size={16}/> Agregar renglón</button></div>
      {lines.map((line, index) => {
        const item = byId.get(line.catalogItemId)
        return <div className="sales-line" key={line.key}>
          <label className="form-field"><span>Artículo o servicio {index + 1}</span>
            <select required value={line.catalogItemId} onChange={(event) => chooseItem(line.key, event.target.value)}>
              <option value="">Seleccionar…</option>
              {sellable.map((available) => <option key={available.id} value={available.id}>
                {available.name} · {available.kind === 'SERVICIO' ? 'Servicio' : available.unit}
              </option>)}
            </select>
          </label>
          <label className="form-field"><span>Cantidad {item ? '(' + item.unit + ')' : ''}</span>
            <input required type="text" inputMode="decimal" value={line.quantity}
              onChange={(event) => patchLine(line.key, { quantity: event.target.value })}/>
          </label>
          <label className="form-field"><span>Precio unitario ARS</span>
            <input required type="text" inputMode="decimal" placeholder="Ej.: 2500,00" value={line.price}
              onChange={(event) => patchLine(line.key, { price: event.target.value })}/>
          </label>
          <button type="button" className="button button-secondary sales-delete" disabled={lines.length === 1}
            aria-label={'Quitar renglón ' + (index + 1)}
            onClick={() => setLines((old) => old.filter((candidate) => candidate.key !== line.key))}>
            <Icon name="close" size={17}/>
          </button>
          {item && <div className="sales-line-preview">
            <DemoPhoto imageKey={demoImageKey('catalog', business.id, item.id)} alt={'Imagen de ' + item.name}
              fallback={<Icon name={item.kind === 'SERVICIO' ? 'briefcase' : 'package'} size={18}/>} className="feature-icon blue demo-photo-list"/>
            <span>{item.kind === 'SERVICIO' ? 'Sin inventario físico' : 'La venta descontará stock en la ubicación seleccionada'} · {item.sku || 'Sin SKU'}</span>
            <strong>{(() => { try {
              const cents = parseMoneyCents(line.price)
              return cents === null ? 'A cotizar' : moneyDisplay(lineTotalCents(parseQuantityMilli(line.quantity, item.unit), cents))
            } catch { return 'Revisar cantidad o precio' } })()}</strong>
          </div>}
        </div>
      })}

      <div className="sales-summary-panel">
        <div className="sales-subheading"><h3>Descuento y total</h3></div>
        <label className="form-field sales-discount"><span>Descuento total (ARS, opcional)</span>
          <input type="text" inputMode="decimal" value={discount}
            onChange={(event) => setDiscount(event.target.value)} placeholder="0,00"/>
        </label>
        <div className="sales-totals">
          <span>Subtotal</span><strong>{totals ? moneyDisplay(totals.subtotalCents) : '—'}</strong>
          <span>Descuento</span><strong>{totals ? moneyDisplay(totals.discountCents) : '—'}</strong>
          <span>Total a registrar</span><strong>{totals ? moneyDisplay(totals.totalCents) : '—'}</strong>
        </div>
      </div>

      <div className="sales-subheading"><h3>Pagos declarados</h3>
        <button type="button" className="button button-secondary" disabled={payments.length >= 6}
          onClick={() => setPayments((old) => [...old, newPayment()])}><Icon name="plus" size={16}/> Agregar medio</button>
      </div>
      <div className="informational-note"><Icon name="shield" size={17}/><span>Los pagos deben sumar el total. Sólo el efectivo vinculado a una caja abierta integra el arqueo; los medios digitales son declaraciones internas.</span></div>
      {hasCash && <p className={'cash-form-hint ' + (linkedCashSession ? 'linked' : 'unlinked')}>
        <Icon name={linkedCashSession ? 'shield' : 'clock'} size={17}/>
        {linkedCashSession
          ? 'La parte en efectivo de esta venta quedará vinculada a la jornada abierta de la ubicación elegida.'
          : 'No hay una jornada abierta para esta ubicación. Podés registrar la venta, pero el efectivo no ingresará en ningún arqueo de caja.'}
      </p>}
      {payments.map((payment, index) => <div className="sales-payment-row" key={payment.key}>
        <label className="form-field"><span>Medio de pago {index + 1}</span>
          <select value={payment.method} onChange={(event) => patchPayment(payment.key, { method: event.target.value as SalePaymentMethod, financialAccountId: '' })}>
            {Object.entries(salePaymentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="form-field"><span>Importe aplicado ARS</span>
          <input required type="text" inputMode="decimal" placeholder="0,00" value={payment.amount}
            onChange={(event) => patchPayment(payment.key, { amount: event.target.value })}/>
        </label>
        {payment.method !== 'EFECTIVO' && payment.method !== 'TARJETA' && <label className="form-field sales-account-field">
          <span>Cuenta receptora declarada (opcional)</span>
          <select value={payment.financialAccountId}
            onChange={event => patchPayment(payment.key, { financialAccountId: event.target.value })}>
            <option value="">Sin asociar a cuenta</option>
            {accounts.filter(a => accountSupportsDeclaredPayment(a, payment.method)).map(a =>
              <option key={a.id} value={a.id}>{a.label} · {a.kind === 'BANCARIA' ? 'Banco' : 'Billetera'}{a.isPrimary ? ' · Principal' : ''}</option>)}
          </select>
          {payment.method === 'TRANSFERENCIA' && <small>Podés elegir una cuenta bancaria o una billetera virtual con alias/CVU declarado.</small>}
        </label>}
        <button type="button" className="button button-secondary sales-delete" disabled={payments.length === 1}
          aria-label={'Quitar medio de pago ' + (index + 1)}
          onClick={() => setPayments((old) => old.filter((candidate) => candidate.key !== payment.key))}>
          <Icon name="close" size={17}/>
        </button>
      </div>)}
      <button type="button" className="button button-secondary sales-fill" onClick={fillPayment} disabled={!totals}>
        Completar primer pago con el saldo pendiente
      </button>
      <details className="optional-fields"><summary>Agregar observaciones (opcional)</summary>
      <label className="form-field"><span>Observaciones (opcional)</span>
        <textarea rows={2} value={notes} maxLength={500} onChange={(event) => setNotes(event.target.value)} placeholder="Información interna de la venta…"/>
      </label>
      </details>
      {error && <p className="form-message error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="button button-secondary" disabled={busy} onClick={onCancel}>Cancelar</button>
        <button type="submit" className="button button-primary" disabled={busy || !totals || (physicalSelected && !locationId)}>
          <Icon name="receipt" size={17}/>{busy ? 'Registrando…' : 'Confirmar venta DEMO'}
        </button>
      </div>
    </form>
  </section>
}
