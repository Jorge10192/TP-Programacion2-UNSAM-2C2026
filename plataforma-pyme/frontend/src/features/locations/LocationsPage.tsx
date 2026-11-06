import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon'
import { demoGateway, locationKindLabels } from '../../data/demo/demoStore'
import type { DemoBusiness, DemoLocation, LocationInput, LocationKind } from '../../data/demo/demoStore'

const blank: LocationInput = { name: '', kind: 'LOCAL', address: '', canSell: true, canStore: false }

function typeIcon(kind: LocationKind) {
  return kind === 'DEPOSITO' ? 'boxes' : kind === 'FERIA' ? 'shopping' : kind === 'OFICINA' ? 'briefcase' : 'pin'
}

export function LocationsPage({ business, locations }: { business: DemoBusiness; locations: DemoLocation[] }) {
  const [editor, setEditor] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState<LocationInput>(blank)
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const activeCount = locations.filter((item) => item.status === 'ACTIVA').length
  const primary = locations.find((item) => item.isPrimary && item.status === 'ACTIVA')

  function startCreate() {
    setEditor('new')
    setDraft(blank)
    setPendingStatusId(null)
    setError('')
    setNotice('')
  }

  function startEdit(location: DemoLocation) {
    setEditor(location.id)
    setDraft({
      name: location.name, kind: location.kind, address: location.address,
      canSell: location.canSell, canStore: location.canStore,
    })
    setPendingStatusId(null)
    setError('')
    setNotice('')
  }

  function cancel() {
    setEditor(null)
    setError('')
    setNotice('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || editor === null) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (editor === 'new') {
        await demoGateway.createLocation(business.id, draft)
        setNotice('Ubicación DEMO creada para «' + business.name + '».')
      } else {
        await demoGateway.updateLocation(business.id, editor, draft)
        setNotice('Ubicación DEMO actualizada.')
      }
      setEditor(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la ubicación.')
    } finally {
      setBusy(false)
    }
  }

  async function markPrimary(locationId: string) {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      await demoGateway.setPrimaryLocation(business.id, locationId)
      setNotice('Ubicación principal actualizada en «' + business.name + '».')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo asignar la ubicación principal.')
    } finally {
      setBusy(false)
    }
  }

  async function changeStatus(location: DemoLocation) {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      const status = location.status === 'ACTIVA' ? 'PAUSADA' : 'ACTIVA'
      await demoGateway.setLocationStatus(business.id, location.id, status)
      setPendingStatusId(null)
      setNotice(status === 'PAUSADA'
        ? 'Ubicación pausada. Si era principal, el negocio quedó sin ubicación principal.'
        : 'Ubicación reactivada. Podés designarla como principal cuando corresponda.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado.')
    } finally {
      setBusy(false)
    }
  }

  const editingLocation = editor && editor !== 'new' ? locations.find((item) => item.id === editor) : undefined

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">ADMINISTRACIÓN · EMPRESA DEMO</p><h1>Ubicaciones</h1><p>Locales, depósitos, ferias y espacios de trabajo de «{business.name}».</p></div>
      {editor === null && <button type="button" className="button button-primary" onClick={startCreate}><Icon name="plus" size={18}/> Nueva ubicación</button>}
    </div>

    <section className="locations-summary" aria-label="Resumen de ubicaciones">
      <div><span className="feature-icon blue"><Icon name="pin"/></span><small>Ubicaciones totales</small><strong>{locations.length}</strong></div>
      <div><span className="feature-icon mint"><Icon name="building"/></span><small>Activas</small><strong>{activeCount}</strong></div>
      <div><span className="feature-icon violet"><Icon name="shield"/></span><small>Principal</small><strong className="location-primary-name">{primary?.name ?? 'Sin asignar'}</strong></div>
    </section>

    <div className="informational-note location-info-note">
      <Icon name="shield" size={20}/>
      <span>Las ubicaciones son opcionales: una empresa de servicios puede funcionar sin local ni depósito. Las capacidades «Vender» y «Almacenar» son independientes. Los registros de esta pantalla son solamente DEMO.</span>
    </div>

    {error && <p className="form-message error locations-notice" role="alert">{error}</p>}
    {notice && <p className="form-message success locations-notice" role="status">{notice}</p>}

    {editor !== null && <section className="form-panel location-editor">
      <div className="form-panel-header">
        <span className="feature-icon blue"><Icon name={editingLocation ? 'pin' : 'plus'}/></span>
        <div><h2>{editingLocation ? 'Editar ubicación' : 'Nueva ubicación'}</h2><p>Se guardará únicamente dentro de {business.name}.</p></div>
      </div>
      <form className="demo-form" onSubmit={submit}>
        <div className="locations-form-grid">
          <label className="form-field"><span>Nombre de la ubicación *</span>
            <input autoFocus required minLength={2} maxLength={80} value={draft.name} onChange={(event) => setDraft((x) => ({ ...x, name: event.target.value }))} placeholder="Ej.: Local centro / Feria del sábado" />
          </label>
          <label className="form-field"><span>Tipo de espacio *</span>
            <select value={draft.kind} onChange={(event) => setDraft((x) => ({ ...x, kind: event.target.value as LocationKind }))}>
              {Object.entries(locationKindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
        </div>
        <label className="form-field"><span>Dirección o referencia (opcional)</span>
          <input maxLength={160} autoComplete="off" value={draft.address} onChange={(event) => setDraft((x) => ({ ...x, address: event.target.value }))} placeholder="Referencia ficticia, sin GPS ni mapa" />
        </label>
        <fieldset className="location-capabilities">
          <legend>¿Para qué se utiliza este espacio?</legend>
          <label><input type="checkbox" checked={draft.canSell} onChange={(event) => setDraft((x) => ({ ...x, canSell: event.target.checked }))}/><span><strong>Permite vender</strong><small>Punto de atención, venta o prestación de servicios</small></span></label>
          <label><input type="checkbox" checked={draft.canStore} onChange={(event) => setDraft((x) => ({ ...x, canStore: event.target.checked }))}/><span><strong>Permite almacenar</strong><small>Se puede asociar inventario cuando exista ese módulo</small></span></label>
        </fieldset>
        <p className="form-hint">Una ubicación puede tener ambas capacidades o ninguna. No se crea stock ni caja automáticamente.</p>
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={cancel} disabled={busy}>Cancelar</button>
          <button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Guardando…' : editingLocation ? 'Guardar cambios' : 'Crear ubicación DEMO'}</button>
        </div>
      </form>
    </section>}

    <div className="section-header locations-section-heading"><div><h2>Espacios registrados</h2><p>Podés editarlos y administrar sus estados sin eliminarlos.</p></div></div>

    {locations.length === 0 && <section className="empty-state location-empty">
      <div className="empty-icon"><Icon name="pin" size={34}/></div>
      <h2>Todavía no hay ubicaciones</h2>
      <p>Es válido no tener establecimientos. Cuando quieras, agregá un local, depósito, feria, oficina u otro espacio.</p>
      {editor === null && <button type="button" className="button button-primary" onClick={startCreate}><Icon name="plus" size={17}/> Crear primera ubicación</button>}
    </section>}

    <div className="locations-grid">
      {locations.map((location) => <article className={'location-card' + (location.status === 'PAUSADA' ? ' location-paused' : '')} key={location.id}>
        <div className="location-card-heading">
          <span className="feature-icon blue"><Icon name={typeIcon(location.kind)} size={22}/></span>
          <div><h3>{location.name}</h3><p>{locationKindLabels[location.kind]}</p></div>
          <span className={'location-status ' + (location.status === 'ACTIVA' ? 'active' : 'paused')}>{location.status === 'ACTIVA' ? 'Activa' : 'Pausada'}</span>
        </div>
        <div className="location-tags">
          {location.isPrimary && <span className="small-pill">Principal</span>}
          {location.canSell && <span className="location-tag"><Icon name="shopping" size={14}/> Vender</span>}
          {location.canStore && <span className="location-tag"><Icon name="boxes" size={14}/> Almacenar</span>}
          {!location.canSell && !location.canStore && <span className="location-tag">Sin capacidades operativas</span>}
        </div>
        <p className="location-address"><Icon name="pin" size={16}/> {location.address || 'Sin dirección o referencia'}</p>
        <div className="location-actions">
          <button type="button" className="button button-secondary" onClick={() => startEdit(location)} disabled={busy}>Editar</button>
          {!location.isPrimary && location.status === 'ACTIVA' && <button type="button" className="button button-secondary" onClick={() => markPrimary(location.id)} disabled={busy}>Hacer principal</button>}
          <button type="button" className="button button-secondary" onClick={() => { setPendingStatusId(location.id); setNotice(''); setError('') }} disabled={busy}>
            {location.status === 'ACTIVA' ? 'Pausar' : 'Reactivar'}
          </button>
        </div>
        {pendingStatusId === location.id && <div className="location-confirm">
          <p>{location.status === 'ACTIVA'
            ? '¿Pausar esta ubicación? No se eliminará. En esta DEMO todavía no hay operaciones de stock o caja que revisar.'
            : '¿Reactivar esta ubicación para seguir utilizándola?'}</p>
          {location.isPrimary && <p>Atención: dejará de ser la ubicación principal.</p>}
          <div>
            <button type="button" className="button button-secondary" onClick={() => setPendingStatusId(null)} disabled={busy}>Cancelar</button>
            <button type="button" className="button button-primary" onClick={() => changeStatus(location)} disabled={busy}>{busy ? 'Procesando…' : 'Confirmar'}</button>
          </div>
        </div>}
      </article>)}
    </div>
  </>
}
