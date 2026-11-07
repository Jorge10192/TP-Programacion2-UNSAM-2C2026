import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon'
import { businessHref } from '../../app/navigation'
import type { Navigate } from '../../app/types'
import { kindLabels } from '../../data/models'
import { useAppData } from '../../data/dataContext'
import type { BusinessKind, Profile } from '../../data/models'

export function CreateBusinessPage({ navigate, profile }: { navigate: Navigate; profile: Profile }) {
  const { gateway } = useAppData()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [kind, setKind] = useState<BusinessKind>('PRODUCTOS')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const business = await gateway.createBusiness({ name, category, kind, description })
      navigate(businessHref(business.id, 'inicio'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la empresa DEMO.')
    } finally {
      setBusy(false)
    }
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">ESPACIO PERSONAL · E1-A2</p><h1>Crear empresa</h1><p>Configurá un negocio de ejemplo de cualquier rubro, sin necesidad de contar con local o stock.</p></div></div>
    <div className="form-layout">
      <section className="form-panel">
        <div className="form-panel-header"><span className="feature-icon blue"><Icon name="building" /></span><div><h2>Información inicial del negocio</h2><p>La empresa quedará disponible en el selector superior y en tu Inicio.</p></div></div>
        <form onSubmit={submit} className="demo-form">
          <label className="form-field">
            <span>Nombre de la empresa <strong>*</strong></span>
            <input required minLength={2} maxLength={80} autoComplete="off" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej.: Mi emprendimiento" />
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
            <span>Rubro o actividad específica (opcional)</span>
            <input maxLength={120} autoComplete="off" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Ej.: Indumentaria, servicios digitales, alimentos…" />
          </label>
          <label className="form-field">
            <span>Descripción (opcional)</span>
            <textarea rows={3} maxLength={350} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Contá brevemente a qué se dedica este negocio" />
          </label>
          {error && <p className="form-message error" role="alert">{error}</p>}
          <p className="form-hint">Sólo se crea una empresa de demostración en este navegador. No solicita CUIT, cuenta bancaria, sucursales ni información real.</p>
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={() => navigate('/inicio')} disabled={busy}>Cancelar</button>
            <button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Creando…' : 'Crear empresa DEMO'}</button>
          </div>
        </form>
      </section>
      <aside className="form-aside">
        <span className="feature-icon mint"><Icon name="shield" size={25}/></span>
        <h2>Responsabilidad inicial</h2>
        <p>En el prototipo, el perfil «{profile.displayName}» será el fundador histórico y titular administrativo inicial de esta empresa.</p>
        <div className="form-aside-note"><Icon name="users" size={19}/><span>Se genera una única membresía DEMO activa. La invitación a colaboradores y transferencia de titularidad quedan pendientes.</span></div>
      </aside>
    </div>
  </>
}

