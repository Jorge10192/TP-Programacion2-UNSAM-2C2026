import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon'
import { DemoImagePicker } from '../common/DemoPhoto'
import { demoImageKey } from '../../data/demo/imagePolicy'
import type { DemoSupplier } from '../../data/demo/demoStore'
import { mapsSearchUrl } from '../../data/demo/mapsLinks'
import {
  blankSupplier, supplierPaymentLabels, supplierPayments, weekdays,
} from '../../data/demo/supplierPolicy'
import type { SupplierInput, SupplierPayment, SupplierPromotion } from '../../data/demo/supplierPolicy'

function initial(supplier?: DemoSupplier): SupplierInput {
  if (!supplier) return { ...blankSupplier, paymentMethods: [], promotions: [] }
  return {
    name: supplier.name, offerings: supplier.offerings, contactPerson: supplier.contactPerson,
    phone: supplier.phone, whatsapp: supplier.whatsapp, email: supplier.email,
    address: supplier.address, mapsUrl: supplier.mapsUrl, website: supplier.website,
    instagram: supplier.instagram, notes: supplier.notes,
    paymentMethods: [...supplier.paymentMethods],
    promotions: supplier.promotions.map((promo) => ({ ...promo, days: [...promo.days] })),
  }
}

export function SupplierForm({
  supplier, businessName, onSave, onCancel,
}: {
  supplier?: DemoSupplier
  businessName: string
  onSave: (input: SupplierInput) => Promise<void>
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<SupplierInput>(() => initial(supplier))
  const [usePhoneForWhatsapp, setUsePhoneForWhatsapp] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = <K extends keyof SupplierInput>(key: K, value: SupplierInput[K]) => setDraft((current) => ({ ...current, [key]: value }))

  function togglePayment(method: SupplierPayment, checked: boolean) {
    setDraft((current) => ({
      ...current,
      paymentMethods: checked ? [...current.paymentMethods, method] : current.paymentMethods.filter((m) => m !== method),
    }))
  }

  function addPromotion() {
    setDraft((current) => ({
      ...current,
      promotions: [...current.promotions, {
        id: 'demo-promo-' + crypto.randomUUID(),
        days: [], paymentMethod: '', benefit: '',
      }],
    }))
  }

  function changePromotion(id: string, fields: Partial<SupplierPromotion>) {
    setDraft((current) => ({
      ...current,
      promotions: current.promotions.map((promo) => promo.id === id ? { ...promo, ...fields } : promo),
    }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      await onSave(draft)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el proveedor.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="form-panel supplier-editor" aria-label="Formulario de proveedor">
    <div className="form-panel-header">
      <span className="feature-icon blue"><Icon name="truck" size={22}/></span>
      <div><h2>{supplier ? 'Editar proveedor: ' + supplier.name : 'Agregar proveedor'}</h2><p>Contacto y condiciones comerciales de «{businessName}». Sólo el nombre es obligatorio.</p></div>
    </div>
    <form className="demo-form" onSubmit={submit}>
      {supplier ? <DemoImagePicker imageKey={demoImageKey('supplier', supplier.businessId, supplier.id)} label="Imagen comercial del proveedor"/> :
        <p className="form-hint">Guardá el proveedor y luego abrí «Editar» para elegir su imagen.</p>}
      <div className="supplier-form-section">
        <h3>1. Identificación comercial</h3>
        <div className="supplier-form-grid">
          <label className="form-field"><span>Nombre comercial *</span>
            <input required minLength={2} maxLength={90} autoFocus value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej.: Distribuidora Ejemplo"/>
          </label>
          <label className="form-field"><span>Persona de contacto (opcional)</span>
            <input maxLength={100} value={draft.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} placeholder="Ej.: Área comercial"/>
          </label>
        </div>
        <label className="form-field"><span>Productos o servicios que ofrece (opcional)</span>
          <input maxLength={240} value={draft.offerings} onChange={(e) => set('offerings', e.target.value)} placeholder="Ej.: Insumos, servicios de mantenimiento, logística…"/>
        </label>
      </div>

      <div className="supplier-form-section">
        <h3>2. Contacto y ubicación</h3>
        <div className="supplier-form-grid">
          <label className="form-field"><span>Teléfono comercial (opcional)</span>
            <input inputMode="tel" maxLength={35} value={draft.phone} onChange={(e) => { setDraft((current) => ({
              ...current, phone: e.target.value,
              ...(usePhoneForWhatsapp ? { whatsapp: e.target.value } : {}),
            })) }} placeholder="+5491112345678"/>
          </label>
          <div className="form-field"><label htmlFor="supplier-whatsapp">WhatsApp (formato +país…)</label>
            <input id="supplier-whatsapp" inputMode="tel" maxLength={35} value={draft.whatsapp} disabled={usePhoneForWhatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="+5491112345678"/>
            <label className="supplier-inline-check"><input type="checkbox" checked={usePhoneForWhatsapp} onChange={(e) => { setUsePhoneForWhatsapp(e.target.checked); if (e.target.checked) set('whatsapp', draft.phone) }}/> Usar el teléfono comercial</label>
          </div>
          <label className="form-field"><span>Correo electrónico (opcional)</span>
            <input type="email" maxLength={120} value={draft.email} onChange={(e) => set('email', e.target.value)} placeholder="ventas@ejemplo.invalid"/>
          </label>
          <label className="form-field"><span>Dirección o referencia (opcional)</span>
            <input maxLength={160} value={draft.address} onChange={(e) => set('address', e.target.value)} placeholder="Referencia ficticia del proveedor"/>
          </label>
          <label className="form-field"><span>Enlace de Google Maps (opcional)</span>
            <input type="url" maxLength={2048} value={draft.mapsUrl} onChange={(e) => set('mapsUrl', e.target.value)} placeholder="https://maps.app.goo.gl/..."/>
            {draft.address && <small><a href={mapsSearchUrl(draft.address) ?? '#'} target="_blank" rel="noopener noreferrer">Buscar esta dirección en Google Maps</a> (sin confirmar el punto exacto)</small>}
          </label>
          <label className="form-field"><span>Sitio web / catálogo digital (HTTPS, opcional)</span>
            <input type="url" maxLength={2048} value={draft.website} onChange={(e) => set('website', e.target.value)} placeholder="https://ejemplo.com"/>
          </label>
          <label className="form-field"><span>Instagram (usuario, opcional)</span>
            <input maxLength={31} value={draft.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@proveedor_ejemplo"/>
          </label>
        </div>
      </div>

      <div className="supplier-form-section">
        <h3>3. Medios de pago aceptados (informativos)</h3>
        <fieldset className="supplier-payment-choices"><legend className="sr-only">Medios de pago</legend>
          {supplierPayments.map((payment) => <label key={payment}>
            <input type="checkbox" checked={draft.paymentMethods.includes(payment)} onChange={(e) => togglePayment(payment, e.target.checked)}/>
            <span>{supplierPaymentLabels[payment]}</span>
          </label>)}
        </fieldset>
      </div>

      <div className="supplier-form-section">
        <div className="supplier-form-section-title">
          <h3>4. Días y condiciones de promoción (opcionales)</h3>
          <button className="button button-secondary" type="button" onClick={addPromotion} disabled={draft.promotions.length >= 8}><Icon name="plus" size={16}/> Agregar regla</button>
        </div>
        <p className="form-hint">Estos beneficios los informa el proveedor y no se aplicarán automáticamente al registrar Compras.</p>
        {draft.promotions.length === 0 && <p className="supplier-muted">Sin promociones informadas.</p>}
        {draft.promotions.map((promotion, index) => <div key={promotion.id} className="supplier-promotion-editor">
          <div className="supplier-promotion-header"><strong>Regla {index + 1}</strong><button type="button" className="supplier-remove-link" onClick={() => set('promotions', draft.promotions.filter((x) => x.id !== promotion.id))}>Quitar regla</button></div>
          <fieldset className="supplier-days"><legend>Días aplicables (vacío = sin días específicos)</legend>
            {weekdays.map((day, i) => <label key={day}><input type="checkbox" checked={promotion.days.includes(i)} onChange={(e) => changePromotion(promotion.id, { days: e.target.checked ? [...promotion.days, i] : promotion.days.filter((d) => d !== i) })}/>{day.slice(0, 2)}</label>)}
          </fieldset>
          <div className="supplier-form-grid">
            <label className="form-field"><span>Medio requerido (opcional)</span>
              <select value={promotion.paymentMethod} onChange={(e) => changePromotion(promotion.id, { paymentMethod: e.target.value as SupplierPayment | '' })}>
                <option value="">Sin requisito específico</option>
                {supplierPayments.map((method) => <option key={method} value={method}>{supplierPaymentLabels[method]}</option>)}
              </select>
            </label>
            <label className="form-field"><span>Beneficio informado *</span>
              <input required minLength={3} maxLength={160} value={promotion.benefit} onChange={(e) => changePromotion(promotion.id, { benefit: e.target.value })} placeholder="Ej.: 10% de descuento con transferencia"/>
            </label>
          </div>
        </div>)}
      </div>

      <div className="supplier-form-section">
        <h3>5. Observaciones comerciales (opcionales)</h3>
        <label className="form-field"><span>Indicaciones internas</span>
          <textarea rows={3} maxLength={650} value={draft.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Ej.: Horarios de entrega, retiro, condiciones de pedido…"/>
        </label>
      </div>

      <p className="form-hint supplier-form-warning">El registro es DEMO local. No ingreses contactos personales reales ni información comercial confidencial. No se envían mensajes ni se validan promociones.</p>
      {error && <p className="form-message error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Guardando…' : supplier ? 'Guardar proveedor' : 'Agregar proveedor DEMO'}</button>
      </div>
    </form>
  </section>
}
