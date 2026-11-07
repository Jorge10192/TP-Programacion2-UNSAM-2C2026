import { AppLink } from './AppLink'
import { Icon } from './Icon'
import { businessHref, journeyNavigationItems } from './navigation'
import type { Navigate } from './types'

export function JourneyNavigation({ businessId, pathname, navigate }: {
  businessId: string
  pathname: string
  navigate: Navigate
}) {
  return <nav className="journey-nav" aria-label="Recorrido de la jornada">
    <span className="journey-nav-caption">Tu jornada</span>
    <ol className="journey-nav-list">
      {journeyNavigationItems.map((item) => {
        const href = businessHref(businessId, item.segment)
        const active = pathname === href
        return <li key={item.id} className="journey-nav-item">
          <AppLink to={href} navigate={navigate} ariaCurrent={active ? 'page' : undefined}
            className={'journey-nav-link' + (active ? ' is-active' : '')}>
            <Icon name={item.icon} size={17}/><span className="journey-nav-label">{item.label}</span>
          </AppLink>
        </li>
      })}
    </ol>
  </nav>
}
