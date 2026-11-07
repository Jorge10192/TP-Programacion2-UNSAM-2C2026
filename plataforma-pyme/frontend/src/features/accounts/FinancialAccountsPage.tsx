import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon'
import { demoGateway } from '../../data/demo/demoStore'
import type { DemoBusiness } from '../../data/demo/demoStore'
import { blankFinancialAccount, financialAccountShareText, financialChannelLabels, financialKindLabels, maskedAccountIdentifier } from '../../data/demo/financialAccountPolicy'
import type { DemoFinancialAccount, FinancialAccountChannel, FinancialAccountInput, FinancialAccountKind } from '../../data/demo/financialAccountPolicy'

type StatusFilter = 'TODAS' | DemoFinancialAccount['status']
type KindFilter = 'TODAS' | FinancialAccountKind

export function FinancialAccountsPage({ business, accounts }: {
  business: DemoBusiness; accounts: DemoFinancialAccount[]
}) {
  const [editingId, setEditingId] = useState<string | 'nueva' | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVA')
  const [kindFilter, setKindFilter] = useState<KindFilter>('TODAS')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const active = accounts.filter(a => a.status === 'ACTIVA').length
  const walletCount = accounts.filter(a => a.kind === 'BILLETERA').length
  const mainAccount = accounts.find(a => a.isPrimary && a.status === 'ACTIVA')
  const term = query.trim().toLocaleLowerCase('es-AR')
  const filtered = accounts.filter((account) =>
    (statusFilter === 'TODAS' || account.status === statusFilter) &&
    (kindFilter === 'TODAS' || account.kind === kindFilter) &&
    (!term || [account.label, account.institution, account.alias, account.holder, account.notes]
      .some((value) => value.toLocaleLowerCase('es-AR').includes(term))))
  const editing = editingId && editingId !== 'nueva' ? accounts.find(a => a.id === editingId) : undefined

  function showForm(id: string | 'nueva') {
    setEditingId(id)
    setConfirmId(null)
    setNotice('')
    setError('')
  }
  async function save(input: FinancialAccountInput) {
    if (!editingId) return
    if (editingId === 'nueva') {
      const created = await demoGateway.createFinancialAccount(business.id, input)
      setNotice('Cuenta DEMO «' + created.label + '» registrada para ' + business.name + '. No se vinculó a ningún banco real.')
    } else {
      await demoGateway.updateFinancialAccount(business.id, editingId, input)
      setNotice('Datos de referencia actualizados. No se alteraron ventas, gastos ni arqueos anteriores.')
    }
    setEditingId(null)
    setStatusFilter('TODAS')
  }
  async function changeStatus(account: DemoFinancialAccount) {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      const next = account.status === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA'
      await demoGateway.setFinancialAccountStatus(business.id, account.id, next)
      setNotice(next === 'INACTIVA'
        ? 'Cuenta desactivada sólo en la plataforma: ya no aparece para nuevos pagos o cobros. Los registros previos permanecen, y el banco externo no se modifica.'
        : 'Cuenta reactivada. Sus datos siguen siendo únicamente de referencia DEMO.')
      setConfirmId(null)
      setStatusFilter('TODAS')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cambiar el estado.')
    } finally { setBusy(false) }
  }
  async function setMain(account: DemoFinancialAccount) {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      await demoGateway.setPrimaryFinancialAccount(business.id, account.id)
      setNotice('«' + account.label + '» marcada como cuenta principal de referencia. No redirige cobros ni transferencias.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cambiar la cuenta principal.')
    } finally { setBusy(false) }
  }
  async function copy(account: DemoFinancialAccount) {
    setError(''); setNotice('')
    try {
      await navigator.clipboard.writeText(financialAccountShareText(account))
      setNotice('Datos DEMO copiados al portapapeles. Revisalos antes de compartirlos.')
    } catch {
      setError('No se pudo copiar automáticamente. Intentá desde localhost en un navegador con permisos de portapapeles.')
    }
  }

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">ADMINISTRACIÓN · EMPRESA DEMO</p>
        <h1>Cuentas y medios de pago</h1>
        <p>Organizá cuentas bancarias y billeteras de referencia de «{business.name}».</p>
      </div>
      <button className="button button-primary" type="button" disabled={busy}
        onClick={() => editingId ? setEditingId(null) : showForm('nueva')}>
        <Icon name={editingId ? 'close' : 'plus'} size={18}/>
        {editingId ? 'Cerrar formulario' : 'Agregar cuenta'}
      </button>
    </div>
    <section className="sales-kpis" aria-label="Resumen de cuentas">
      <div><span className="feature-icon blue"><Icon name="credit"/></span><small>Cuentas registradas</small><strong>{accounts.length}</strong></div>
      <div><span className="feature-icon mint"><Icon name="shield"/></span><small>Activas</small><strong>{active}</strong></div>
      <div><span className="feature-icon violet"><Icon name="wallet"/></span><small>Billeteras</small><strong>{walletCount}</strong></div>
    </section>
    <div className="informational-note"><Icon name="shield" size={19}/><span>
      <strong>Directorio local, no conexión financiera.</strong> Usá únicamente datos ficticios.
      Los alias y CBU/CVU no se verifican ni se envían a bancos o billeteras. No almacenes contraseñas, tokens, tarjetas o información financiera real.
      <strong> Caja</strong> es un registro de efectivo físico distinto; esta pantalla no calcula saldos ni acredita cobros.
    </span></div>
    <div className="financial-principal-note">
      <span className="feature-icon blue"><Icon name="credit" size={20}/></span>
      <div><strong>Cuenta principal de referencia</strong>
        <p>{mainAccount ? mainAccount.label + ' · ' + mainAccount.institution :
          'Sin cuenta principal activa. Podés seleccionarla desde el directorio.'}</p>
      </div>
      <span className="financial-chip">Sin conexión bancaria</span>
    </div>
    {notice && <p className="form-message success" role="status">{notice}</p>}
    {error && <p className="form-message error" role="alert">{error}</p>}

    {editingId && <FinancialAccountForm key={editingId} account={editing} onSave={save}
      onCancel={() => setEditingId(null)} />}

    <section className="form-panel financial-list">
      <div className="business-section-heading"><div><Icon name="credit" size={21}/><h2>Directorio de cuentas</h2></div>
        <span>{filtered.length} visibles de {accounts.length}</span></div>
      <div className="financial-filters">
        <label className="form-field"><span>Buscar por nombre, institución, titular o alias</span>
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar cuenta…"/></label>
        <label className="form-field"><span>Tipo</span><select value={kindFilter}
          onChange={e => setKindFilter(e.target.value as KindFilter)}>
          <option value="TODAS">Todos los tipos</option><option value="BANCARIA">Bancarias</option>
          <option value="BILLETERA">Billeteras</option></select></label>
        <label className="form-field"><span>Estado</span><select value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
          <option value="ACTIVA">Activas</option><option value="INACTIVA">Inactivas</option>
          <option value="TODAS">Todas</option></select></label>
      </div>

      {filtered.length ? <div className="financial-card-grid">{filtered.map(account =>
        <article className={'financial-card' + (account.isPrimary ? ' is-primary' : '')} key={account.id}>
          <div className="financial-card-heading">
            <span className={'feature-icon ' + (account.kind === 'BANCARIA' ? 'blue' : 'violet')}>
              <Icon name={account.kind === 'BANCARIA' ? 'building' : 'wallet'} size={24}/>
            </span>
            <div><h3>{account.label}</h3><p>{account.institution}</p></div>
            <span className={'financial-chip ' + (account.status === 'ACTIVA' ? 'active' : 'inactive')}>
              {account.status === 'ACTIVA' ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <div className="financial-card-badges">
            <span className="financial-chip">{financialKindLabels[account.kind]}</span>
            {account.isPrimary && <span className="financial-chip primary">Principal</span>}
          </div>
          <div className="financial-details">
            <div><small>Titular de referencia</small><strong>{account.holder || 'No informado'}</strong></div>
            <div><small>Alias</small><strong>{account.alias || 'No informado'}</strong></div>
            <div><small>{account.kind === 'BANCARIA' ? 'CBU' : 'CVU'} (oculto)</small>
              <strong>{maskedAccountIdentifier(account.identifier)}</strong></div>
            <div><small>Medio de cobro</small><strong>{financialChannelLabels[account.channel]}</strong></div>
          </div>
          {account.notes && <p className="financial-notes">{account.notes}</p>}
          {account.status === 'INACTIVA' && <p className="financial-warning">Referencia inactiva: no usar para nuevos cobros.</p>}
          <div className="financial-card-actions">
            <button type="button" className="button button-secondary" onClick={() => void copy(account)}>
              <Icon name="receipt" size={16}/> Copiar datos DEMO
            </button>
            {account.status === 'ACTIVA' && <>
              <button type="button" className="button button-secondary" onClick={() => showForm(account.id)}>
                Editar</button>
              {!account.isPrimary && <button type="button" className="button button-secondary"
                disabled={busy} onClick={() => void setMain(account)}>Marcar principal</button>}
            </>}
            <button type="button" disabled={busy} className="button button-secondary"
              onClick={() => setConfirmId(confirmId === account.id ? null : account.id)}>
              {account.status === 'ACTIVA' ? 'Desactivar' : 'Reactivar'}
            </button>
          </div>
          {confirmId === account.id && <div className="financial-confirm" role="group" aria-label="Confirmar cambio de estado">
            <p>{account.status === 'ACTIVA'
              ? '¿Desactivar esta cuenta? No se borrará su ficha ni se alterarán registros históricos.'
              : '¿Reactivar esta cuenta de referencia DEMO?'}</p>
            <button type="button" className="button button-secondary" disabled={busy}
              onClick={() => setConfirmId(null)}>Cancelar</button>
            <button type="button" className="button button-primary" disabled={busy}
              onClick={() => void changeStatus(account)}>Confirmar</button>
          </div>}
        </article>)}</div> :
        <div className="sales-empty"><Icon name="credit" size={31}/>
          <h3>{accounts.length ? 'No hay cuentas con estos filtros' : 'Todavía no hay cuentas asociadas'}</h3>
          <p>Agregá una cuenta o billetera DEMO para organizar tus referencias comerciales.</p>
          {!accounts.length && <button type="button" className="button button-primary"
            onClick={() => showForm('nueva')}><Icon name="plus" size={17}/> Agregar primera cuenta</button>}
        </div>}
    </section>
    <div className="financial-future-note"><Icon name="shield" size={18}/><span>
      <strong>Integraciones posteriores:</strong> asociar cuentas a cobros y pagos declarados, autorización por rol y conciliación.
      Mercado Pago real requerirá que cada empresa conecte su propia cuenta mediante un backend seguro.
      Un QR de artículo no es un QR de cobro.
    </span></div>
  </>
}

function FinancialAccountForm({ account, onSave, onCancel }: {
  account?: DemoFinancialAccount
  onSave: (input: FinancialAccountInput) => Promise<void>
  onCancel: () => void
}) {
  const initial = account ?? blankFinancialAccount
  const [label, setLabel] = useState(initial.label)
  const [kind, setKind] = useState<FinancialAccountKind>(initial.kind)
  const [channel, setChannel] = useState<FinancialAccountChannel>(initial.channel)
  const [institution, setInstitution] = useState(initial.institution)
  const [holder, setHolder] = useState(initial.holder)
  const [alias, setAlias] = useState(initial.alias)
  const [identifier, setIdentifier] = useState(initial.identifier)
  const [notes, setNotes] = useState(initial.notes)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      await onSave({ label, kind, channel, institution, holder, alias, identifier, notes })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar la cuenta.')
    } finally { setBusy(false) }
  }

  return <section className="form-panel financial-form" aria-label={account ? 'Editar cuenta DEMO' : 'Agregar cuenta DEMO'}>
    <div className="business-section-heading"><div><Icon name="credit" size={21}/>
      <h2>{account ? 'Editar cuenta de referencia' : 'Agregar cuenta o billetera'}</h2></div>
      <span>Sin conexión bancaria</span>
    </div>
    <form className="demo-form" onSubmit={(event) => void submit(event)}>
      <div className="financial-form-grid">
        <label className="form-field"><span>Nombre de la cuenta *</span>
          <input required maxLength={80} value={label} onChange={e => setLabel(e.target.value)}
            placeholder="Ej.: Cuenta principal · Banco Ejemplo"/></label>
        <label className="form-field"><span>Tipo de cuenta *</span><select value={kind}
          onChange={e => {
            const next = e.target.value as FinancialAccountKind
            setKind(next)
            if (next === 'BANCARIA') setChannel('TRANSFERENCIA')
          }}>
          <option value="BANCARIA">Cuenta bancaria</option>
          <option value="BILLETERA">Billetera virtual</option>
        </select></label>
        <label className="form-field"><span>Banco o billetera *</span>
          <input maxLength={80} required value={institution} onChange={e => setInstitution(e.target.value)}
            placeholder={kind === 'BANCARIA' ? 'Ej.: Banco Ejemplo' : 'Ej.: Billetera Ejemplo'}/></label>
        <label className="form-field"><span>Medio de cobro de referencia *</span><select value={channel}
          onChange={e => setChannel(e.target.value as FinancialAccountChannel)}>
          {Object.entries(financialChannelLabels).filter(([value]) =>
            kind !== 'BANCARIA' || value === 'TRANSFERENCIA').map(([value, text]) =>
            <option key={value} value={value}>{text}</option>)}
        </select></label>
        <label className="form-field"><span>Titular de referencia (opcional)</span>
          <input maxLength={90} value={holder} onChange={e => setHolder(e.target.value)}
            placeholder="Sólo nombre ficticio para la DEMO"/></label>
        <label className="form-field"><span>Alias ficticio (opcional)</span>
          <input maxLength={20} value={alias} onChange={e => setAlias(e.target.value)}
            placeholder="Ej.: tienda.cobros.demo" autoComplete="off"/></label>
        <label className="form-field"><span>{kind === 'BANCARIA' ? 'CBU' : 'CVU'} ficticio (opcional)</span>
          <input inputMode="numeric" maxLength={22} value={identifier} autoComplete="off"
            onChange={e => setIdentifier(e.target.value)} placeholder="22 dígitos inventados"/></label>
        <label className="form-field"><span>Moneda</span>
          <input value="Pesos argentinos (ARS) · DEMO" disabled readOnly/></label>
      </div>
      <label className="form-field"><span>Observaciones internas (opcional)</span>
        <textarea rows={2} maxLength={350} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Referencia administrativa sin contraseñas ni datos privados"/></label>
      <p className="cash-form-hint"><Icon name="shield" size={17}/>
        Ingresá un alias de ejemplo (6 a 20 caracteres) o un {kind === 'BANCARIA' ? 'CBU' : 'CVU'} inventado de 22 dígitos.
        Esta DEMO valida sólo el formato: no confirma que exista una cuenta ni que pertenezca a la empresa.
      </p>
      {error && <p className="form-message error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="button button-secondary"
        onClick={onCancel} disabled={busy}>Cancelar</button>
        <button type="submit" className="button button-primary" disabled={busy}>
          <Icon name="shield" size={17}/>{busy ? 'Guardando…' : (account ? 'Guardar cambios DEMO' : 'Registrar cuenta DEMO')}
        </button>
      </div>
    </form>
  </section>
}
