import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon'
import { demoGateway } from '../../data/demo/demoStore'
import type { DemoProfile } from '../../data/demo/demoStore'

export function ProfilePage({ profile, companyCount }: { profile: DemoProfile; companyCount: number }) {
  const [name, setName] = useState(profile.displayName)
  const [email, setEmail] = useState(profile.email)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setName(profile.displayName)
    setEmail(profile.email)
  }, [profile])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setError('')
    setNotice('')
    setBusy(true)
    try {
      await demoGateway.saveProfile({ displayName: name, email })
      setNotice('Perfil DEMO guardado en este navegador.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el perfil.')
    } finally {
      setBusy(false)
    }
  }

  const initials = profile.displayName.split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join('').toUpperCase()

  return <>
    <div className="page-heading"><div><p className="eyebrow">ESPACIO PERSONAL</p><h1>Mi perfil</h1><p>Un único perfil personal para todas tus empresas.</p></div></div>
    <div className="form-layout">
      <section className="form-panel">
        <div className="form-panel-header"><span className="feature-icon blue"><Icon name="user" /></span><div><h2>Datos de demostración</h2><p>Esta ficha no constituye una cuenta real ni inicia sesión.</p></div></div>
        <form onSubmit={submit} className="demo-form">
          <label className="form-field">
            <span>Nombre visible <strong>*</strong></span>
            <input required minLength={2} maxLength={70} autoComplete="off" value={name} onChange={(event) => { setName(event.target.value); setNotice('') }} placeholder="Ej.: Usuario DEMO" />
          </label>
          <label className="form-field">
            <span>Correo de demostración (opcional)</span>
            <input type="email" maxLength={120} autoComplete="off" value={email} onChange={(event) => { setEmail(event.target.value); setNotice('') }} placeholder="ejemplo@demo.invalid" />
          </label>
          <p className="form-hint">No ingreses datos personales reales. Estos valores se guardan localmente en tu navegador, sin contraseña ni servidor.</p>
          {error && <p className="form-message error" role="alert">{error}</p>}
          {notice && <p className="form-message success" role="status">{notice}</p>}
          <div className="form-actions"><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar perfil DEMO'}</button></div>
        </form>
      </section>
      <aside className="form-aside">
        <span className="profile-avatar">{initials || 'UD'}</span>
        <h2>{profile.displayName}</h2>
        <p>Perfil único · Usuario DEMO</p>
        <div className="form-aside-stat"><Icon name="building" size={19}/><span>Empresas disponibles</span><strong>{companyCount}</strong></div>
        <div className="form-aside-note"><Icon name="shield" size={18}/><span>No existen roles ni permisos efectivos en esta demostración. La autenticación se agregará con el backend.</span></div>
      </aside>
    </div>
  </>
}
