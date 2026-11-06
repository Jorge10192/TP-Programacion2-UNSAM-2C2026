import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon'
import { businessHref } from '../../app/navigation'
import type { IconName } from '../../app/navigation'
import type { Navigate } from '../../app/types'
import { demoGateway, kindLabels } from '../../data/demo/demoStore'
import type { BusinessDetailsPatch, DemoBusiness, DemoProfile, EditableBusinessField } from '../../data/demo/demoStore'

type FieldDefinition = {
  key: EditableBusinessField
  label: string
  icon: IconName
  tone: string
  max: number
  multiline?: boolean
  wide?: boolean
}
const editableFields: FieldDefinition[] = [
  { key: 'name', label: 'Nombre comercial', icon: 'building', tone: 'blue', max: 80 },
  { key: 'category', label: 'Rubro', icon: 'briefcase', tone: 'mint', max: 120 },
  { key: 'taxId', label: 'CUIT (opcional)', icon: 'receipt', tone: 'violet', max: 15 },
  { key: 'slogan', label: 'Eslogan', icon: 'book', tone: 'orange', max: 120 },
  { key: 'description', label: 'Presentación / biografía comercial', icon: 'book', tone: 'blue', max: 350, multiline: true, wide: true },
]

export function BusinessDetailsPage({
  business,
  profile,
  navigate,
}: {
  business: DemoBusiness
  profile: DemoProfile
  navigate: Navigate
}) {
  const [editing, setEditing] = useState<EditableBusinessField | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function startEdit(key: EditableBusinessField) {
    setEditing(key)
    setDraft(business[key])
    setError('')
    setNotice('')
  }

  function cancelEdit() {
    setEditing(null)
    setDraft('')
    setError('')
  }

  async function saveField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editing === null || busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const patch = { [editing]: draft } as BusinessDetailsPatch
      await demoGateway.updateBusinessDetails(business.id, patch)
      setEditing(null)
      setDraft('')
      setNotice('Cambio guardado en la empresa DEMO seleccionada. Se mantiene al recargar si el navegador permite almacenamiento local.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el cambio.')
    } finally {
      setBusy(false)
    }
  }

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">ADMINISTRACIÓN · EMPRESA DEMO</p><h1>Datos de la Empresa</h1><p>Información comercial de «{business.name}», separada del perfil personal.</p></div>
    </div>

    <section className="company-summary">
      <span className={'company-emblem ' + business.accent}>{business.initials}</span>
      <div className="company-summary-copy">
        <div className="company-summary-title"><h2>{business.name}</h2><span className="small-pill">{business.source === 'created' ? 'Creada en DEMO' : 'Empresa de ejemplo'}</span></div>
        <p>{business.slogan || business.description || business.category}</p>
        <span className="company-summary-category"><Icon name="briefcase" size={16}/>{kindLabels[business.kind]}</span>
      </div>
    </section>

    <div className="business-details-layout">
      <section className="form-panel business-data-panel">
        <div className="business-section-heading">
          <div><Icon name="building" size={22}/><h2>Información general</h2></div>
          <span>Edición contextual</span>
        </div>

        <div className="brand-identity-row">
          <span className={'company-emblem company-emblem-small ' + business.accent}>{business.initials}</span>
          <div><strong>Imagen de la empresa</strong><p>Usamos la inicial de su nombre como imagen de ejemplo. La carga de logos se integrará más adelante.</p></div>
          <span className="small-pill amber-pill">Imagen pendiente</span>
        </div>

        {notice && <p className="form-message success" role="status">{notice}</p>}

        <div className="business-fields-grid">
          {editableFields.map((field) => {
            const active = editing === field.key
            const value = business[field.key]
            return <div className={'business-field-card' + (field.wide ? ' business-field-wide' : '') + (active ? ' field-editing' : '')} key={field.key}>
              <div className="business-field-head">
                <span className={'feature-icon ' + field.tone}><Icon name={field.icon} size={19}/></span>
                <div className="business-field-info">
                  <span className="business-field-label">{field.label}</span>
                  {!active && <strong className={value ? '' : 'field-empty'}>{value || 'No informado'}</strong>}
                </div>
                {!active && <button type="button" className="field-edit-button" onClick={() => startEdit(field.key)} aria-label={'Editar ' + field.label}><span>Editar</span><Icon name="arrow" size={15}/></button>}
              </div>

              {active && <form className="business-edit-form" onSubmit={saveField}>
                <label htmlFor={'business-edit-' + field.key} className="sr-only">{field.label}</label>
                {field.multiline
                  ? <textarea id={'business-edit-' + field.key} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={field.max} rows={4} autoFocus />
                  : <input id={'business-edit-' + field.key} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={field.max} required={field.key === 'name'} minLength={field.key === 'name' ? 2 : undefined} autoFocus placeholder={field.key === 'taxId' ? '11 dígitos ficticios (opcional)' : 'Ingresá un valor'} />}
                <span className="business-char-count">{draft.length} / {field.max}</span>
                {field.key === 'taxId' && <p className="form-hint">Sólo DEMO. No cargues un CUIT real; se valida el formato, no la identidad fiscal.</p>}
                {error && <p className="form-message error" role="alert">{error}</p>}
                <div className="business-edit-actions">
                  <button type="button" className="button button-secondary" onClick={cancelEdit} disabled={busy}>Cancelar</button>
                  <button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
                </div>
              </form>}
            </div>
          })}
        </div>
      </section>

      <aside className="business-details-aside">
        <section className="form-panel">
          <div className="business-aside-heading"><span className="feature-icon violet"><Icon name="book" size={21}/></span><div><h2>Documentos</h2><p>Registro de documentación de la empresa.</p></div></div>
          <span className="small-pill amber-pill">Próximamente</span>
          <p className="business-aside-description">Todavía no hay carga de archivos ni almacenamiento documental. No se muestran cifras o documentos ficticios.</p>
        </section>
        <section className="form-panel">
          <div className="business-aside-heading"><span className="feature-icon mint"><Icon name="shield" size={21}/></span><div><h2>Responsabilidad inicial</h2><p>Información de la membresía DEMO.</p></div></div>
          <dl className="business-owner-facts">
            <div><dt>Perfil personal</dt><dd>{profile.displayName}</dd></div>
            <div><dt>Rol de demostración</dt><dd>Titular administrativo inicial</dd></div>
            <div><dt>ID interno</dt><dd>{business.id}</dd></div>
          </dl>
          <p className="business-aside-description">Esta vista no acredita titularidad legal ni establece permisos de servidor.</p>
        </section>
      </aside>
    </div>

    <section className="form-panel business-contacts-preview">
      <div className="business-section-heading"><div><Icon name="users" size={22}/><h2>Medios de contacto y redes</h2></div><span className="small-pill amber-pill">Próximamente</span></div>
      <p>En otro incremento podrás registrar canales de contacto y establecer su visibilidad. No se importan teléfonos, cuentas ni enlaces de los ejemplos HTML.</p>
    </section>

    <div className="business-footer-actions">
      <p>Los cambios de esta pantalla se guardan campo por campo, de manera inmediata, sólo en la DEMO local.</p>
      <button type="button" className="button button-secondary" onClick={() => navigate(businessHref(business.id, 'inicio'))}><Icon name="arrow-left" size={17}/> Volver al Inicio del negocio</button>
    </div>
  </>
}
