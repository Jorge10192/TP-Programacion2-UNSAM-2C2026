import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon'
import { businessHref } from '../../app/navigation'
import type { Navigate } from '../../app/types'
import { kindLabels } from '../../data/models'
import { useAppData } from '../../data/dataContext'
import type { BusinessKind, Profile } from '../../data/models'
import { useOnlineDraft } from '../common/useOnlineDraft'

export function CreateBusinessPage({ navigate, profile }: { navigate: Navigate; profile: Profile }) {
  const { gateway, mode } = useAppData()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [kind, setKind] = useState<BusinessKind>('PRODUCTOS')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const {markSaved} = useOnlineDraft(Boolean(name || category || description), busy)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const business = await gateway.createBusiness({ name, category, kind, description })
      markSaved()
      navigate(businessHref(business.id, 'inicio'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la empresa.')
    } finally {
      setBusy(false)
    }
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">ESPACIO PERSONAL</p><h1>Crear empresa</h1><p>Configurá un negocio de cualquier rubro, sin necesidad de contar con local o stock.</p></div></div>
    <div className="form-layout">
      <section className="form-panel">
        <div className="form-panel-header"><span className="feature-icon blue"><Icon name="building" /></span><div><h2>Información inicial del negocio</h2><p>La empresa quedará disponible en el selector superior y en tu Inicio.</p></div></div>
        <form onSubmit={submit} className="demo-form">
          <label className="form-field">
            <span>Nombre de la empresa <strong>*</strong></span>
            <input required minLength={2} maxLength={120} autoComplete="off" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej.: Mi emprendimiento" />
          </label>
          <label className="form-field">
            <span>Tipo de actividad <strong>*</strong></span>
            <select value={kind} onChange={(event) => setKind(event.target.value as BusinessKind)}>
              <option value="PRODUCTOS">{kindLabels.PRODUCTOS}</option>
              <option value="SERVICIOS">{kindLabels.SERVICIOS}</option>
              <option value="MIXTO">{kindLabels.MIXTO}</option>
            </select>
          </label>
          <label className="form-field">
            <span>Rubro o actividad específica *</span>
            <input required minLength={2} maxLength={120} autoComplete="off" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Ej.: Indumentaria, servicios digitales, alimentos…" />
          </label>
          <label className="form-field">
            <span>Descripción (opcional)</span>
            <textarea rows={3} maxLength={350} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Contá brevemente a qué se dedica este negocio" />
          </label>
          {error && <p className="form-message error" role="alert">{error}</p>}
          <p className="form-hint">{mode === 'api' ? 'La empresa y tu membresía se guardan juntas en el servidor. Podés crear más de una y cambiar entre ellas.' : 'Se crea una empresa de demostración en este navegador.'}</p>
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={() => navigate('/inicio')} disabled={busy}>Cancelar</button>
            <button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Creando…' : mode === 'api' ? 'Crear empresa' : 'Crear empresa DEMO'}</button>
          </div>
        </form>
      </section>
      <aside className="form-aside">
        <span className="feature-icon mint"><Icon name="shield" size={25}/></span>
        <h2>Responsabilidad inicial</h2>
        <p>«{profile.displayName}» será el fundador histórico y titular administrativo inicial de esta empresa.</p>
        <div className="form-aside-note"><Icon name="users" size={19}/><span>Se genera una membresía activa. Las invitaciones y la transferencia de titularidad corresponden a una próxima etapa.</span></div>
      </aside>
    </div>
  </>
}

