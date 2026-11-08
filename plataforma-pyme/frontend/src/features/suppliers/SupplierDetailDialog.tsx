import { useAppData, useBusinessPermissions } from '../../data/dataContext'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../app/Icon'
import { DemoPhoto } from '../common/DemoPhoto'
import type { Business, Supplier } from '../../data/models'
import {
  supplierPaymentLabels, weekdays,
  emailUrl, phoneUrl, whatsappUrl, instagramUrl, supplierShareText,
} from '../../data/demo/supplierPolicy'
import { getLocationMapsLink } from '../../data/demo/mapsLinks'

export function SupplierDetailDialog({
  supplier, business, onClose, onEdit,
}: {
  supplier: Supplier
  business: Business
  onClose: () => void
  onEdit: (supplier: Supplier) => void
}) {
  const { canManageResources } = useBusinessPermissions(business.id)
  const { mode } = useAppData()
  const ref = useRef<HTMLDialogElement>(null)
  const [shareFallback, setShareFallback] = useState('')
  const [copyNotice, setCopyNotice] = useState('')
  useEffect(() => {
    const modal = ref.current
    if (!modal) return
    if (!modal.open) modal.showModal()
    return () => { if (modal.open) modal.close() }
  }, [])

  const phone = phoneUrl(supplier.phone)
  const whatsapp = whatsappUrl(supplier.whatsapp)
  const email = emailUrl(supplier.email)
  const instagram = instagramUrl(supplier.instagram)
  const maps = getLocationMapsLink({ address: supplier.address, mapUrl: supplier.mapsUrl })

  async function copyContact() {
    const value = supplierShareText(business.name, supplier)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('El navegador no admite portapapeles automático.')
      await navigator.clipboard.writeText(value)
      setShareFallback('')
      setCopyNotice('Datos de contacto copiados. Revisá el contenido antes de compartirlo.')
    } catch {
      setShareFallback(value)
      setCopyNotice('No se pudo copiar automáticamente. Seleccioná el texto y copialo manualmente.')
    }
  }

  return <dialog
    ref={ref}
    className="catalog-detail-modal supplier-detail-modal"
    aria-labelledby="supplier-detail-title"
    onCancel={(event) => { event.preventDefault(); onClose() }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
  >
    <div className="catalog-detail-body">
      <div className="catalog-detail-topline">
        <p className="eyebrow">FICHA DE PROVEEDOR ·</p>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar proveedor"><Icon name="close" size={20}/></button>
      </div>
      <header className="supplier-detail-header">
        <DemoPhoto target={{ scope: 'supplier', businessId: business.id, entityId: supplier.id }} alt={'Foto de ' + supplier.name}
          fallback={supplier.name.slice(0, 1).toUpperCase()} className="supplier-monogram"/>
        <div>
          <div className="supplier-title-row">
            <h2 id="supplier-detail-title">{supplier.name}</h2>
            <span className={'catalog-state '+(supplier.status === 'ACTIVO' ? 'is-active' : 'is-inactive')}>{supplier.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span>
          </div>
          {<p>{supplier.offerings || 'Sin productos o servicios especificados'}</p>}
        </div>
        <button type="button" className="button button-primary" disabled={!canManageResources} onClick={() => onEdit(supplier)}>Editar ficha</button>
      </header>

      {<div className="supplier-detail-sections">
        <section className="supplier-detail-box">
          <h3><Icon name="user" size={19}/> Datos comerciales y contacto</h3>
          <dl className="supplier-detail-fields">
            <div><dt>Persona de contacto</dt><dd>{supplier.contactPerson || 'No informada'}</dd></div>
            <div><dt>Teléfono</dt><dd>{supplier.phone || 'No informado'}</dd></div>
            <div><dt>WhatsApp</dt><dd>{supplier.whatsapp || 'No informado'}</dd></div>
            <div><dt>Correo electrónico</dt><dd>{supplier.email || 'No informado'}</dd></div>
            <div><dt>Dirección/referencia</dt><dd>{supplier.address || 'No informada'}</dd></div>
            <div><dt>Sitio web</dt><dd>{supplier.website || 'No informado'}</dd></div>
            <div><dt>Instagram</dt><dd>{supplier.instagram || 'No informado'}</dd></div>
          </dl>
          <div className="supplier-direct-links">
            {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp <Icon name="arrow" size={15}/></a>}
            {phone && <a href={phone}>Llamar <Icon name="arrow" size={15}/></a>}
            {email && <a href={email}>Correo <Icon name="arrow" size={15}/></a>}
            {maps && <a href={maps.url} target="_blank" rel="noopener noreferrer">{maps.source === 'shared' ? 'Ver ubicación en Maps' : 'Buscar dirección en Maps'} <Icon name="arrow" size={15}/></a>}
            {supplier.website && <a href={supplier.website} target="_blank" rel="noopener noreferrer">Sitio web <Icon name="arrow" size={15}/></a>}
            {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer">Instagram <Icon name="arrow" size={15}/></a>}
          </div>
          {supplier.whatsapp && !whatsapp && <p className="supplier-help-note">El contacto de WhatsApp no tiene formato internacional válido para abrir un chat.</p>}
          {maps?.source === 'search' && <p className="supplier-help-note">Maps realizará una búsqueda, no se trata de una ubicación confirmada.</p>}
          <button type="button" className="button button-secondary supplier-copy-button" onClick={copyContact}><Icon name="receipt" size={16}/> Copiar datos de contacto</button>
          {copyNotice && <p role="status" className="supplier-help-note">{copyNotice}</p>}
          {shareFallback && <label className="form-field supplier-copy-fallback">
            <span>Texto para seleccionar y copiar</span>
            <textarea readOnly rows={6} value={shareFallback} onFocus={(e) => e.target.select()}/>
          </label>}
        </section>

        <section className="supplier-detail-box">
          <h3><Icon name="credit" size={19}/> Medios y condiciones comerciales</h3>
          <h4>Medios de pago que informa el proveedor</h4>
          <div className="supplier-payment-tags">
            {supplier.paymentMethods.length ? supplier.paymentMethods.map((method) => <span key={method}>{supplierPaymentLabels[method]}</span>) : <small>No informados</small>}
          </div>
          <h4>Promociones informadas</h4>
          {supplier.promotions.length === 0 && <p className="supplier-muted">No hay promociones registradas.</p>}
          {supplier.promotions.map((promotion) => <div key={promotion.id} className="supplier-detail-promo">
            <strong>{promotion.benefit}</strong>
            <span>{promotion.days.length ? promotion.days.map((day) => weekdays[day]).join(', ') : 'Sin días específicos'} · {promotion.paymentMethod ? supplierPaymentLabels[promotion.paymentMethod] : 'Cualquier medio / sin especificar'}</span>
          </div>)}
          <p className="supplier-help-note">Las promociones son declaradas por el proveedor, no están verificadas ni se aplican automáticamente en Compras.</p>
        </section>
      </div>}

      <section className="supplier-detail-box supplier-detail-notes">
        <h3><Icon name="book" size={19}/> Observaciones comerciales</h3>
        <p>{supplier.notes || 'Sin observaciones.'}</p>
        <small>{mode === 'api' ? 'Información interna guardada en el servidor de esta instalación.' : 'Información interna guardada sólo en este navegador de demostración.'}</small>
      </section>
      <section className="supplier-detail-box supplier-detail-related">
        <h3><Icon name="shopping" size={19}/> Compras y productos vinculados</h3>
        <p>{mode === 'api' ? 'El historial se consulta en Compras.' : 'Todavía no hay compras ni relaciones con artículos implementadas. No se muestran montos ni transacciones ficticias.'}</p>
      </section>
      <footer className="catalog-detail-footer">
        <div className="catalog-detail-dates"><span>Creado: {new Date(supplier.createdAt).toLocaleDateString('es-AR')}</span>{supplier.updatedAt && <span>Última edición: {new Date(supplier.updatedAt).toLocaleDateString('es-AR')}</span>}</div>
        <button type="button" className="button button-secondary" onClick={onClose}>Cerrar ficha</button>
      </footer>
    </div>
  </dialog>
}
