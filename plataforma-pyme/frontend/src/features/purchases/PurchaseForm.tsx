import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon'
import { demoGateway } from '../../data/demo/demoStore'
import type { DemoBusiness, DemoCatalogItem, DemoSupplier } from '../../data/demo/demoStore'
import { moneyDisplay, moneyInput, parseMoneyCents } from '../../data/demo/catalogPolicy'
import {
  lineTotalCents, parseQuantityMilli, quantityText, sumLineTotals,
} from '../../data/demo/purchasePolicy'
import type { PurchaseInput, PurchaseLineInput, PurchaseUnit } from '../../data/demo/purchasePolicy'

type LineDraft = {
  id: string
  catalogId: string
  description: string
  quantityText: string
  costText: string
}
type Draft = {
  purchasedOn: string
  supplierId: string
  reference: string
  notes: string
  lines: LineDraft[]
}
const newLine = (): LineDraft => ({
  id: crypto.randomUUID(), catalogId: '', description: '',
  quantityText: '1', costText: '',
})
function todayLocal(): string {
  const date = new Date()
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')].join('-')
}

export function PurchaseForm({
  business, catalog, suppliers, onSaved, onCancel,
}: {
  business: DemoBusiness
  catalog: DemoCatalogItem[]
  suppliers: DemoSupplier[]
  onSaved: (purchaseId: string) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Draft>(() => ({
    purchasedOn: todayLocal(), supplierId: '', reference: '', notes: '', lines: [newLine()],
  }))
  // Se conserva un ID de solicitud mientras el formulario está montado:
  // doble clic o reintento de envío no pueden crear una segunda compra DEMO.
  const [requestId] = useState(() => 'demo-request-' + crypto.randomUUID())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const activeCatalog = catalog.filter((item) => item.status === 'ACTIVO')
  const activeSuppliers = suppliers.filter((supplier) => supplier.status === 'ACTIVO')

  function updateLine(id: string, fields: Partial<LineDraft>) {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) => line.id === id ? { ...line, ...fields } : line),
    }))
  }

  function selectCatalog(id: string, catalogId: string) {
    const item = catalog.find((entry) => entry.id === catalogId && entry.status === 'ACTIVO')
    updateLine(id, {
      catalogId: item?.id ?? '',
      description: item?.name ?? '',
      costText: item?.referenceCostCents === null || !item ? '' : moneyInput(item.referenceCostCents),
      quantityText: '1',
    })
  }

  function makeInput(): PurchaseInput {
    const lines: PurchaseLineInput[] = draft.lines.map((line, i) => {
      const article = line.catalogId ? catalog.find((item) => item.id === line.catalogId) : undefined
      if (line.catalogId && !article) throw new Error('Artículo no disponible en renglón ' + (i + 1) + '.')
      const unit: PurchaseUnit = article?.unit ?? 'CONCEPTO'
      const cents = parseMoneyCents(line.costText)
      if (cents === null) throw new Error('Completá el costo unitario del renglón ' + (i + 1) + ' (cero si no tuvo costo).')
      return {
        catalogItemId: article?.id ?? null,
        description: article?.name ?? line.description,
        unit, quantityMilli: parseQuantityMilli(line.quantityText, unit),
        unitCostCents: cents,
      }
    })
    return {
      purchasedOn: draft.purchasedOn,
      supplierId: draft.supplierId || null,
      reference: draft.reference,
      notes: draft.notes,
      lines,
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const purchase = await demoGateway.registerPurchase(business.id, makeInput(), requestId)
      onSaved(purchase.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la compra.')
    } finally {
      setSaving(false)
    }
  }

  let previewTotal: number | null = null
  try {
    const values = draft.lines.map((line) => {
      const item = line.catalogId ? catalog.find((entry) => entry.id === line.catalogId) : undefined
      const cents = parseMoneyCents(line.costText)
      if (cents === null) throw new Error('Costo no informado.')
      return { totalCents: lineTotalCents(parseQuantityMilli(line.quantityText, item?.unit ?? 'CONCEPTO'), cents) }
    })
    previewTotal = sumLineTotals(values)
  } catch {
    // Preview incompleto: no modifica datos ni genera importes aproximados.
  }

  return <section className="form-panel purchase-editor">
    <div className="form-panel-header">
      <span className="feature-icon blue"><Icon name="shopping" size={24}/></span>
      <div><h2>Registrar compra</h2><p>Comprobante y conceptos de «{business.name}». No equivale a pagar ni a recibir mercadería.</p></div>
    </div>
    <form className="demo-form" onSubmit={submit}>
      <section className="purchase-form-section">
        <h3>1. Datos de la compra</h3>
        <div className="purchase-form-grid">
          <label className="form-field"><span>Fecha de compra *</span>
            <input required type="date" min="2000-01-01" max="2100-12-31"
              value={draft.purchasedOn} onChange={(e) => setDraft((d) => ({ ...d, purchasedOn: e.target.value }))}/>
          </label>
          <label className="form-field"><span>Proveedor (opcional)</span>
            <select value={draft.supplierId} onChange={(e) => setDraft((d) => ({ ...d, supplierId: e.target.value }))}>
              <option value="">Sin proveedor asignado</option>
              {activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </label>
          <label className="form-field"><span>Número de comprobante o referencia (opcional)</span>
            <input maxLength={70} value={draft.reference} onChange={(e) => setDraft((d) => ({ ...d, reference: e.target.value }))} placeholder="Ej.: FACT-A-001 / ticket"/>
          </label>
          <label className="form-field"><span>Moneda</span><input readOnly value="ARS · Pesos argentinos (DEMO)"/></label>
        </div>
      </section>

      <section className="purchase-form-section">
        <div className="purchase-section-title">
          <div><h3>2. Productos, servicios y conceptos</h3><small>Hasta 30 renglones. Cada concepto libre es informativo y no generará existencias.</small></div>
          <button type="button" className="button button-secondary" disabled={draft.lines.length >= 30 || saving}
            onClick={() => setDraft((d) => ({ ...d, lines: [...d.lines, newLine()] }))}>
            <Icon name="plus" size={16}/> Agregar renglón
          </button>
        </div>
        {draft.lines.map((line, index) => {
          const item = line.catalogId ? catalog.find((entry) => entry.id === line.catalogId) : undefined
          const unit: PurchaseUnit = item?.unit ?? 'CONCEPTO'
          let lineValue: number | null = null
          try {
            const unitCost = parseMoneyCents(line.costText)
            if (unitCost !== null) lineValue = lineTotalCents(parseQuantityMilli(line.quantityText, unit), unitCost)
          } catch { /* No mostrar un subtotal erróneo. */ }
          return <div key={line.id} className="purchase-line">
            <div className="purchase-line-heading">
              <strong>Renglón {index + 1}</strong>
              <button type="button" className="button button-secondary" disabled={saving || draft.lines.length === 1}
                onClick={() => setDraft((d) => ({ ...d, lines: d.lines.filter((entry) => entry.id !== line.id) }))}>Quitar</button>
            </div>
            <div className="purchase-line-grid">
              <label className="form-field purchase-line-selector"><span>Origen del concepto *</span>
                <select value={line.catalogId} onChange={(e) => selectCatalog(line.id, e.target.value)}>
                  <option value="">Concepto libre (sin stock)</option>
                  {activeCatalog.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.kind === 'SERVICIO' ? 'Servicio' : 'Artículo físico'}</option>)}
                </select>
              </label>
              <label className="form-field purchase-line-description"><span>Descripción *</span>
                <input value={item?.name ?? line.description} readOnly={!!item} required minLength={2} maxLength={140}
                  onChange={(e) => updateLine(line.id, { description: e.target.value })}
                  placeholder="Ej.: Material de embalaje, reparación de equipo…"/>
              </label>
              <label className="form-field"><span>Cantidad *</span>
                <input required inputMode="decimal" maxLength={13} value={line.quantityText}
                  onChange={(e) => updateLine(line.id, { quantityText: e.target.value })} placeholder="1 o 0,500"/>
              </label>
              <label className="form-field"><span>Unidad</span>
                <input readOnly value={unit === 'CONCEPTO' ? 'Concepto' : unit}/>
              </label>
              <label className="form-field"><span>Costo unitario (ARS) *</span>
                <input required inputMode="decimal" value={line.costText} maxLength={14}
                  onChange={(e) => updateLine(line.id, { costText: e.target.value })} placeholder="Ej.: 1250,50"/>
              </label>
              <div className="purchase-line-subtotal"><span>Subtotal</span><strong>{lineValue === null ? 'Pendiente' : moneyDisplay(lineValue)}</strong></div>
            </div>
            <p className="purchase-line-footnote">
              {item?.kind === 'SERVICIO' ? 'Servicio: no genera stock físico.' :
                item ? 'Bien del Catálogo: podrá recibirse en una ubicación con almacenamiento. Se mantiene su unidad original, sin convertir paquetes ni cajas.' :
                'Concepto libre: sirve para documentar un gasto o compra sin ingresar existencias.'}
              {item && <> · {quantityText(1000, unit)} = 1 unidad de control.</>}
            </p>
          </div>
        })}
      </section>

      <section className="purchase-form-section">
        <h3>3. Observaciones</h3>
        <label className="form-field"><span>Notas internas (opcional)</span>
          <textarea maxLength={500} rows={3} value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            placeholder="Ej.: Entrega acordada para la próxima semana…"/>
        </label>
      </section>

      <div className="purchase-total-box">
        <div><small>Total de la compra (ARS)</small><strong>{previewTotal === null ? 'Completar costos y cantidades' : moneyDisplay(previewTotal)}</strong></div>
        <p>Al guardar se registra la compra, pero no el pago ni el ingreso al inventario. Para mercadería física habrá una acción separada de recepción.</p>
      </div>
      {error && <p className="form-message error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="button button-secondary" disabled={saving} onClick={onCancel}>Cancelar</button>
        <button type="submit" className="button button-primary" disabled={saving}>
          <Icon name="receipt" size={17}/> {saving ? 'Guardando…' : 'Registrar compra DEMO'}
        </button>
      </div>
    </form>
  </section>
}
