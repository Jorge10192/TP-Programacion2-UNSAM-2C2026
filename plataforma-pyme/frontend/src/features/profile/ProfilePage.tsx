import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon'
import { DemoPhoto, DemoImagePicker } from '../common/DemoPhoto'
import { profileInitials } from '../../data/models'
import { useAppData } from '../../data/dataContext'
import type { Business, Membership, Profile } from '../../data/models'

export function ProfilePage({
  profile,
  businesses,
  memberships,
}: {
  profile: Profile
  businesses: Business[]
  memberships: Record<string, Membership>
}) {
  const { gateway } = useAppData()
  const [name, setName] = useState(profile.displayName)
  const [email, setEmail] = useState(profile.email)
  const [avatarInitials, setAvatarInitials] = useState(profile.avatarInitials)
  const [contactPhone, setContactPhone] = useState(profile.contactPhone)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [selectedBusinessId, setSelectedBusinessId] = useState(businesses[0]?.id ?? '')
  const [jobDraft, setJobDraft] = useState(memberships[businesses[0]?.id ?? '']?.jobTitle ?? '')
  const [jobBusy, setJobBusy] = useState(false)
  const [jobError, setJobError] = useState('')
  const [jobNotice, setJobNotice] = useState('')

  function selectBusiness(id: string) {
    setSelectedBusinessId(id)
    setJobDraft(memberships[id]?.jobTitle ?? '')
    setJobError('')
    setJobNotice('')
  }

  async function savePersonalData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setError('')
    setNotice('')
    setBusy(true)
    try {
      await gateway.saveProfile({ displayName: name, email, avatarInitials, contactPhone })
      setNotice('Perfil DEMO actualizado en este navegador.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el perfil.')
    } finally {
      setBusy(false)
    }
  }

  async function saveJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (jobBusy || !selectedBusinessId) return
    setJobBusy(true)
    setJobError('')
    setJobNotice('')
    try {
      await gateway.saveMemberJobTitle(selectedBusinessId, jobDraft)
      setJobNotice('Función DEMO guardada únicamente para la empresa seleccionada.')
    } catch (err) {
      setJobError(err instanceof Error ? err.message : 'No se pudo guardar la función.')
    } finally {
      setJobBusy(false)
    }
  }

  const previewInitials = profileInitials({ displayName: name, avatarInitials: avatarInitials.trim().toUpperCase() })
  const currentBusiness = businesses.find((item) => item.id === selectedBusinessId)

  return <>
    <div className="page-heading"><div><p className="eyebrow">ESPACIO PERSONAL</p><h1>Mi perfil</h1><p>Una identidad personal compartida entre todas tus empresas.</p></div></div>
    <div className="form-layout">
      <div className="profile-edit-column">
        <section className="form-panel">
          <div className="form-panel-header"><span className="feature-icon blue"><Icon name="user" /></span><div><h2>Datos personales DEMO</h2><p>Podés modificar tu nombre, avatar y medios de contacto de prueba.</p></div></div>
          <form onSubmit={savePersonalData} className="demo-form">
            <div className="profile-avatar-editor">
              <DemoPhoto target={{ scope: 'profile' }} alt="Imagen de tu perfil DEMO" fallback={previewInitials}
                className="profile-avatar profile-avatar-preview"/>
              <div className="profile-avatar-editor-fields">
                <label className="form-field">
                  <span>Avatar / Iniciales (opcional)</span>
                  <input maxLength={4} value={avatarInitials} autoComplete="off" onChange={(event) => { setAvatarInitials(event.target.value); setNotice('') }} placeholder="Ej.: AB" />
                </label>
                <p className="form-hint">Hasta 4 letras. Si no elegís foto, usaremos las iniciales del nombre visible.</p>
              </div>
            </div>
            <DemoImagePicker target={{ scope: 'profile' }} label="Foto del perfil personal DEMO"/>
            <label className="form-field">
              <span>Nombre visible <strong>*</strong></span>
              <input required minLength={2} maxLength={70} autoComplete="off" value={name} onChange={(event) => { setName(event.target.value); setNotice('') }} placeholder="Ej.: Usuario DEMO" />
            </label>
            <label className="form-field">
              <span>Correo de demostración (opcional)</span>
              <input type="email" maxLength={120} autoComplete="off" value={email} onChange={(event) => { setEmail(event.target.value); setNotice('') }} placeholder="usuario@demo.invalid" />
            </label>
            <label className="form-field">
              <span>Teléfono / contacto (opcional)</span>
              <input type="tel" maxLength={30} autoComplete="off" value={contactPhone} onChange={(event) => { setContactPhone(event.target.value); setNotice('') }} placeholder="Número ficticio para probar la interfaz" />
            </label>
            <p className="form-hint">Este perfil es único para todas las empresas. No ingreses datos personales reales: el prototipo usa almacenamiento local sin autenticación.</p>
            {error && <p className="form-message error" role="alert">{error}</p>}
            {notice && <p className="form-message success" role="status">{notice}</p>}
            <div className="form-actions"><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar mi perfil DEMO'}</button></div>
          </form>
        </section>

        <section className="form-panel">
          <div className="form-panel-header"><span className="feature-icon mint"><Icon name="briefcase" /></span><div><h2>Función laboral por empresa</h2><p>Tu puesto puede ser diferente en cada negocio; no modifica tu rol administrativo.</p></div></div>
          <form className="demo-form" onSubmit={saveJob}>
            <label className="form-field">
              <span>Empresa de demostración</span>
              <select value={currentBusiness?.id ?? ''} onChange={(event) => selectBusiness(event.target.value)} disabled={jobBusy}>
                {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Puesto / Función laboral (opcional)</span>
              <input maxLength={80} value={jobDraft} onChange={(event) => { setJobDraft(event.target.value); setJobNotice('') }} placeholder="Ej.: Coordinación comercial" disabled={!currentBusiness || jobBusy} />
            </label>
            <p className="form-hint">Sólo una descripción laboral DEMO para esta membresía. No concede permisos, acceso a caja ni autorización de operaciones.</p>
            {jobError && <p className="form-message error" role="alert">{jobError}</p>}
            {jobNotice && <p className="form-message success" role="status">{jobNotice}</p>}
            <div className="form-actions"><button type="submit" className="button button-primary" disabled={!currentBusiness || jobBusy}>{jobBusy ? 'Guardando…' : 'Guardar función DEMO'}</button></div>
          </form>
        </section>
      </div>

      <aside className="form-aside">
        <DemoPhoto target={{ scope: 'profile' }} alt="Foto de tu perfil DEMO"
          fallback={profileInitials(profile)} className="profile-avatar"/>
        <h2>{profile.displayName}</h2>
        <p>Perfil único · Usuario DEMO</p>
        <div className="form-aside-stat"><Icon name="building" size={19}/><span>Empresas disponibles</span><strong>{businesses.length}</strong></div>
        {currentBusiness && <div className="profile-membership-summary">
          <small>EN {currentBusiness.name.toUpperCase()}</small>
          <strong>{memberships[currentBusiness.id]?.jobTitle || 'Función no indicada'}</strong>
          <span>Titular administrativo (simulación)</span>
        </div>}
        <div className="form-aside-note"><Icon name="shield" size={18}/><span>No existen roles ni permisos efectivos en esta demostración. La autorización se implementará con el backend.</span></div>
      </aside>
    </div>
  </>
}
