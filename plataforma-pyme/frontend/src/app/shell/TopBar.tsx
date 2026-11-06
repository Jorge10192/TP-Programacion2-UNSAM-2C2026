import { AppLink } from '../AppLink'
import { Icon } from '../Icon'
import { businessHref, demoBusinesses } from '../navigation'
import type { DemoBusiness } from '../navigation'
import type { Navigate } from '../types'

export function Topbar({
  business,
  title,
  navigate,
  onOpenMenu,
}: {
  business: DemoBusiness | undefined
  title: string
  navigate: Navigate
  onOpenMenu: () => void
}) {
  return <header className="topbar">
    <div className="topbar-left">
      <button type="button" className="icon-button menu-trigger" aria-label="Abrir menú" onClick={onOpenMenu}><Icon name="menu" /></button>
      <div className="breadcrumbs">
        <span>{business ? 'Mi negocio' : 'Mi espacio'}</span>
        <Icon name="chevron" size={14} />
        <strong>{title}</strong>
      </div>
    </div>
    <div className="topbar-right">
      <label className="company-picker">
        <span className="sr-only">Empresa activa</span>
        <Icon name="building" size={16} />
        <select aria-label="Cambiar de empresa" value={business?.id ?? ''} onChange={(event) => navigate(event.target.value ? businessHref(event.target.value, 'inicio') : '/inicio')}>
          <option value="">Mi espacio personal</option>
          {demoBusinesses.map((item) => <option key={item.id} value={item.id}>{item.name} · DEMO</option>)}
        </select>
      </label>
      <span className="demo-chip">DEMO</span>
      <AppLink navigate={navigate} to="/perfil" className="user-avatar" ariaLabel="Ir a mi perfil">UD</AppLink>
    </div>
  </header>
}
