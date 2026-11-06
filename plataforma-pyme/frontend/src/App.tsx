import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Sidebar } from './app/shell/SideMenu'
import { Topbar } from './app/shell/TopBar'
import { loadSidebarMode, saveSidebarMode } from './app/shell/sidebarPreference'
import type { SidebarMode } from './app/shell/sidebarPreference'
import { businessHref, navigationItems } from './app/navigation'
import { findDemoBusiness, listDemoBusinesses, listDemoCatalog, listDemoSuppliers, listDemoPurchases, listDemoInventoryMovements, listDemoInventoryOperations, listDemoSales, listDemoInvitations, listDemoLocations, listDemoTeamMembers, useDemoSnapshot } from './data/demo/demoStore'
import { ProfilePage } from './features/profile/ProfilePage'
import { CreateBusinessPage } from './features/businesses/BusinessPages'
import { BusinessDetailsPage } from './features/businesses/BusinessDetailsPage'
import { LocationsPage } from './features/locations/LocationsPage'
import { TeamPage } from './features/team/TeamPage'
import { CatalogPage } from './features/catalog/CatalogPage'
import { SuppliersPage } from './features/suppliers/SuppliersPage'
import { PurchasesPage } from './features/purchases/PurchasesPage'
import { InventoryPage } from './features/inventory/InventoryPage'
import { SalesPage } from './features/sales/SalesPage'
import { inventoryHistoryEntries } from './data/demo/inventoryPolicy'
import type { Navigate } from './app/types'
import { Welcome, BusinessDashboard } from './features/dashboard/Dashboards'
import { ComingSoon, NotFound } from './features/common/Feedback'
import './App.css'

function App() {
  const snapshot = useDemoSnapshot()
  const businesses = listDemoBusinesses(snapshot)
  const [pathname, setPathname] = useState(() => window.location.pathname || '/')
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(loadSidebarMode)

  useEffect(() => {
    const handlePopState = () => { setPathname(window.location.pathname); setMenuOpen(false) }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => { saveSidebarMode(sidebarMode) }, [sidebarMode])

  // Drawer modal en escritorio y móvil: bloquea el contenido, permite Escape.
  useEffect(() => {
    if (!menuOpen) return

    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = oldOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const toggleDesktopSidebar = () => {
    setSidebarMode((current) => current === 'expanded' ? 'compact' : 'expanded')
  }

  const navigate: Navigate = (to) => {
    if (to !== window.location.pathname) {
      window.history.pushState({ assistantPymeFrom: window.location.pathname }, '', to)
    }
    setPathname(to)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const match = /^\/b\/([^/]+)\/([^/]+)$/.exec(pathname)
  const hasBusinessPath = pathname.startsWith('/b/')
  const business = match ? findDemoBusiness(snapshot, match[1]) : undefined
  const section = match?.[2]
  const selectedPage = navigationItems.find((item) => item.segment === section)
  const personal = pathname === '/' || pathname === '/inicio'
  const showBack = !personal && !(business && section === 'inicio')
  const goBack = () => {
    // Nunca regresamos accidentalmente a otra empresa ni a una web externa.
    const previous = (window.history.state as { assistantPymeFrom?: unknown } | null)?.assistantPymeFrom
    const contextPrefix = business ? businessHref(business.id, '') : '/'
    const sameContext = typeof previous === 'string'
      && previous !== pathname
      && (business ? previous.startsWith(contextPrefix) : ['/inicio', '/perfil', '/empresas/nueva'].includes(previous))

    setMenuOpen(false)
    if (sameContext) window.history.back()
    else navigate(business ? businessHref(business.id, 'inicio') : '/inicio')
  }
  const pageTitle = business ? (selectedPage?.label ?? 'Sección desconocida') : pathname === '/perfil' ? 'Mi perfil' : pathname === '/empresas/nueva' ? 'Crear empresa' : 'Inicio'

  useEffect(() => { document.title = pageTitle + ' · Asistente PyME DEMO' }, [pageTitle])

  let content: ReactNode
  if (personal) content = <Welcome navigate={navigate} businesses={businesses} />
  else if (pathname === '/perfil') content = <ProfilePage profile={snapshot.profile} businesses={businesses} memberships={snapshot.membershipsByBusinessId} />
  else if (pathname === '/empresas/nueva') content = <CreateBusinessPage navigate={navigate} profile={snapshot.profile} />
  else if (hasBusinessPath && !business) content = <NotFound navigate={navigate} accessDenied />
  else if (business && section === 'inicio') content = <BusinessDashboard business={business} navigate={navigate} catalogCount={listDemoCatalog(snapshot, business.id).filter((item) => item.status === 'ACTIVO').length} movementCount={inventoryHistoryEntries(listDemoInventoryMovements(snapshot, business.id), listDemoInventoryOperations(snapshot, business.id)).length} />
  else if (business && section === 'empresa') content = <BusinessDetailsPage key={business.id} business={business} profile={snapshot.profile} jobTitle={snapshot.membershipsByBusinessId[business.id]?.jobTitle ?? ''} navigate={navigate} />
  else if (business && section === 'ubicaciones') content = <LocationsPage key={business.id} business={business} locations={listDemoLocations(snapshot, business.id)} />
  else if (business && section === 'equipo') content = <TeamPage key={business.id} business={business} profile={snapshot.profile} owner={snapshot.membershipsByBusinessId[business.id]} members={listDemoTeamMembers(snapshot, business.id)} invitations={listDemoInvitations(snapshot, business.id)} />
  else if (business && section === 'catalogo') content = <CatalogPage key={business.id} business={business} items={listDemoCatalog(snapshot, business.id)} />
  else if (business && section === 'proveedores') content = <SuppliersPage key={business.id} business={business} suppliers={listDemoSuppliers(snapshot, business.id)} />
  else if (business && section === 'ventas') content = <SalesPage
    key={business.id} business={business}
    items={listDemoCatalog(snapshot, business.id)}
    locations={listDemoLocations(snapshot, business.id)}
    sales={listDemoSales(snapshot, business.id)}
  />
  else if (business && section === 'compras') content = <PurchasesPage key={business.id} business={business} purchases={listDemoPurchases(snapshot, business.id)} catalog={listDemoCatalog(snapshot, business.id)} suppliers={listDemoSuppliers(snapshot, business.id)} locations={listDemoLocations(snapshot, business.id)} />
  else if (business && (section === 'inventario' || section === 'movimientos')) content = <InventoryPage
    key={business.id + '-' + section}
    business={business} catalog={listDemoCatalog(snapshot, business.id)}
    locations={listDemoLocations(snapshot, business.id)}
    movements={listDemoInventoryMovements(snapshot, business.id)}
    operations={listDemoInventoryOperations(snapshot, business.id)}
    initialTab={section === 'movimientos' ? 'movements' : 'stock'}
  />
  else if (business && selectedPage) content = <ComingSoon title={selectedPage.label} description={selectedPage.description} business={business} navigate={navigate} />
  else content = <NotFound navigate={navigate} />

  return <div className={'app-layout menu-' + sidebarMode + (menuOpen ? ' menu-drawer-open' : '')}>
    <Sidebar pathname={pathname} business={business} navigate={navigate} mode={sidebarMode} isOpen={menuOpen} onClose={() => setMenuOpen(false)}/>
    <div className="main-column" inert={menuOpen}>
      <Topbar business={business} businesses={businesses} profile={snapshot.profile} title={pageTitle} navigate={navigate} sidebarMode={sidebarMode} menuOpen={menuOpen} showBack={showBack} onBack={goBack} onToggleSidebar={toggleDesktopSidebar} onHideSidebar={() => setSidebarMode('hidden')} onToggleMenu={() => setMenuOpen((open) => !open)} />
      <main id="main-content" className="main-content">{content}</main>
      <footer className="app-footer"><span>Asistente PyME · Prototipo E1-A2</span><span>Sin autenticación ni cobros reales · Stock sólo DEMO</span></footer>
    </div>
  </div>
}

export default App
