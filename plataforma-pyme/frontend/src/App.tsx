import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Sidebar } from './app/shell/SideMenu'
import { Topbar } from './app/shell/TopBar'
import { loadSidebarMode, saveSidebarMode } from './app/shell/sidebarPreference'
import type { SidebarMode } from './app/shell/sidebarPreference'
import { businessHref, navigationItems } from './app/navigation'
import { findBusiness, listBusinesses, listCatalog, listSuppliers, listPurchases, listInventoryMovements, listInventoryOperations, listSales, listExpenses, listCashSessions, listFinancialAccounts, listQrIntents, listInvitations, listLocations, listTeamMembers } from './data/selectors'
import { useAppData } from './data/dataContext'
import { emptySnapshot } from './data/models'
import { SessionPanel } from './app/auth/SessionPanel'
import { OperationRecovery } from './app/auth/OperationRecovery'
import { LegacyRecords } from './features/common/LegacyRecords'
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
import { ExpensesPage } from './features/cash/ExpensesPage'
import { CashSessionsPage } from './features/cash/CashSessionsPage'
import { FinancialAccountsPage } from './features/accounts/FinancialAccountsPage'
import { inventoryHistoryEntries, stockBalances } from './data/demo/inventoryPolicy'
import { physicalPurchaseLines } from './data/demo/purchasePolicy'
import type { Navigate } from './app/types'
import { installHistoryNavigation } from './app/historyNavigation'
import { NavigationGuardContext, useNavigationGuard } from './app/unsavedChanges'
import { JourneyNavigation } from './app/JourneyNavigation'
import { Welcome, BusinessDashboard } from './features/dashboard/Dashboards'
import { ComingSoon, NotFound } from './features/common/Feedback'
import './App.css'
import './jornada.css'

function App() {
  const data = useAppData()
  const snapshot = data.snapshot ?? emptySnapshot
  const businesses = listBusinesses(snapshot)
  const [pathname, setPathname] = useState(() => window.location.pathname || '/')
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(loadSidebarMode)
  const guard = useNavigationGuard()
  useEffect(() => {
    if (!data.recovery) return
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', prevent)
    return () => window.removeEventListener('beforeunload', prevent)
  }, [data.recovery])
  const historyNavigation = useRef<ReturnType<typeof installHistoryNavigation> | null>(null)

  useEffect(() => {
    const navigation = installHistoryNavigation(window, guard.requestLeave, (nextPathname) => {
      setPathname(nextPathname)
      setMenuOpen(false)
    })
    historyNavigation.current = navigation
    return () => { navigation.dispose(); historyNavigation.current = null }
  }, [guard])

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

  const changeSidebarMode = (mode: SidebarMode) => {
    setSidebarMode(mode)
    saveSidebarMode(mode)
  }

  const toggleDesktopSidebar = () => {
    changeSidebarMode(sidebarMode === 'expanded' ? 'compact' : 'expanded')
  }

  const navigate: Navigate = (to) => {
    if (historyNavigation.current?.navigate(to)) window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const match = /^\/b\/([^/]+)\/([^/]+)$/.exec(pathname)
  const hasBusinessPath = pathname.startsWith('/b/')
  const business = match ? findBusiness(snapshot, match[1]) : undefined
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

    if (sameContext) window.history.back()
    else navigate(business ? businessHref(business.id, 'inicio') : '/inicio')
  }
  const pageTitle = business ? (selectedPage?.label ?? 'Sección desconocida') : pathname === '/perfil' ? 'Mi perfil' : pathname === '/empresas/nueva' ? 'Crear empresa' : 'Inicio'

  useEffect(() => { document.title = pageTitle + ' · Asistente PyME' + (data.mode === 'demo' ? ' DEMO' : '') }, [pageTitle, data.mode])

  const logout = () => { if (guard.requestLeave()) void data.runtime.logout() }
  const sessionLocked = data.mode === 'api' && data.session?.status !== 'authenticated'
  if (!data.snapshot) return data.mode === 'api' ? <SessionPanel onLogout={logout}/>
    : <main className="session-page"><section className="form-panel"><h1>Asistente PyME</h1><p role="status">{data.error ?? 'Cargando demo…'}</p></section></main>

  let content: ReactNode
  if (data.mode === 'api' && (pathname === '/perfil' || pathname === '/empresas/nueva'
    || ['empresa', 'equipo', 'cuentas', 'historial', 'guias', 'pedidos', 'analisis'].includes(section ?? ''))) {
    content = <section className="form-panel"><h1>{pageTitle}</h1><p>Esta herramienta no está habilitada en el piloto conectado. No se guardan cambios en este navegador.</p></section>
  }
  else if (data.mode === 'api' && business && section === 'ubicaciones') {
    const location = listLocations(snapshot, business.id)[0]
    content = <section className="form-panel"><h1>Ubicación del piloto</h1><p>{location?.name ?? 'Ubicación no informada por el servidor.'}</p><p>Esta instalación usa una sola ubicación, definida por el servidor.</p></section>
  }
  else if (personal) content = <Welcome navigate={navigate} businesses={businesses} />
  else if (pathname === '/perfil') content = <ProfilePage profile={snapshot.profile} businesses={businesses} memberships={snapshot.membershipsByBusinessId} />
  else if (pathname === '/empresas/nueva') content = <CreateBusinessPage navigate={navigate} profile={snapshot.profile} />
  else if (hasBusinessPath && !business) content = <NotFound navigate={navigate} accessDenied />
  else if (business && section === 'inicio') {
    const catalog = listCatalog(snapshot, business.id).filter((item) => item.status === 'ACTIVO')
    const movements = listInventoryMovements(snapshot, business.id)
    content = <BusinessDashboard business={business} navigate={navigate}
      catalogCount={catalog.length}
      physicalItemCount={catalog.filter((item) => item.kind !== 'SERVICIO').length}
      storageLocationCount={listLocations(snapshot, business.id).filter((location) => location.status === 'ACTIVA' && location.canStore).length}
      pendingPurchaseCount={listPurchases(snapshot, business.id).filter((purchase) => purchase.serverStatus !== 'ANULADA' && !purchase.receipt && physicalPurchaseLines(purchase.lines).length > 0).length}
      hasStock={Array.from(data.mode === 'api' ? Object.values(snapshot.apiStockBalances ?? {}) : stockBalances(movements).values()).some((quantity) => quantity > 0)}
      saleCount={listSales(snapshot, business.id).length}
      openCashCount={listCashSessions(snapshot, business.id).filter((session) => session.status === 'ABIERTA').length}
      movementCount={inventoryHistoryEntries(movements, listInventoryOperations(snapshot, business.id)).length}
    />
  }
  else if (business && section === 'empresa') content = <BusinessDetailsPage key={business.id} business={business} profile={snapshot.profile} jobTitle={snapshot.membershipsByBusinessId[business.id]?.jobTitle ?? ''} navigate={navigate} />
  else if (business && section === 'ubicaciones') content = <LocationsPage key={business.id} business={business} locations={listLocations(snapshot, business.id)} />
  else if (business && section === 'equipo') content = <TeamPage key={business.id} business={business} profile={snapshot.profile} owner={snapshot.membershipsByBusinessId[business.id]} members={listTeamMembers(snapshot, business.id)} invitations={listInvitations(snapshot, business.id)} />
  else if (business && section === 'catalogo') content = <CatalogPage key={business.id} business={business} items={listCatalog(snapshot, business.id)} />
  else if (business && section === 'proveedores') content = <SuppliersPage key={business.id} business={business} suppliers={listSuppliers(snapshot, business.id)} />
  else if (business && section === 'ventas') content = <SalesPage
    key={business.id} business={business}
    items={listCatalog(snapshot, business.id)}
    locations={listLocations(snapshot, business.id)}
    sales={listSales(snapshot, business.id)}
    accounts={listFinancialAccounts(snapshot, business.id)}
    qrIntents={listQrIntents(snapshot, business.id)}
    sessions={listCashSessions(snapshot, business.id)}
    movements={listInventoryMovements(snapshot, business.id)}
  />
  else if (business && section === 'cuentas') content = <FinancialAccountsPage
    key={business.id} business={business} accounts={listFinancialAccounts(snapshot, business.id)}
  />
  else if (business && section === 'gastos') content = <ExpensesPage
    key={business.id} business={business} snapshot={snapshot} navigate={navigate}
    locations={listLocations(snapshot, business.id)}
    expenses={listExpenses(snapshot, business.id)}
  />
  else if (business && section === 'jornadas') content = <CashSessionsPage
    key={business.id} business={business}
    locations={listLocations(snapshot, business.id)}
    sessions={listCashSessions(snapshot, business.id)}
    sales={listSales(snapshot, business.id)}
    expenses={listExpenses(snapshot, business.id)}
  />
  else if (business && section === 'compras') content = <PurchasesPage key={business.id} business={business} purchases={listPurchases(snapshot, business.id)} catalog={listCatalog(snapshot, business.id)} suppliers={listSuppliers(snapshot, business.id)} locations={listLocations(snapshot, business.id)} />
  else if (business && (section === 'inventario' || section === 'movimientos')) content = <InventoryPage
    key={business.id + '-' + section}
    business={business} catalog={listCatalog(snapshot, business.id)}
    locations={listLocations(snapshot, business.id)}
    movements={listInventoryMovements(snapshot, business.id)}
    operations={listInventoryOperations(snapshot, business.id)}
    initialTab={section === 'movimientos' ? 'movements' : 'stock'}
  />
  else if (business && selectedPage) content = <ComingSoon title={selectedPage.label} description={selectedPage.description} business={business} navigate={navigate} />
  else content = <NotFound navigate={navigate} />

  return <NavigationGuardContext.Provider value={guard}><div inert={sessionLocked} className={'app-layout menu-' + sidebarMode + (menuOpen ? ' menu-drawer-open' : '')}>
    <Sidebar pathname={pathname} business={business} navigate={navigate} mode={sidebarMode} isOpen={menuOpen} onClose={() => setMenuOpen(false)}/>
    <div className="main-column" inert={menuOpen}>
      <Topbar business={business} businesses={businesses} profile={snapshot.profile} title={pageTitle} navigate={navigate} sidebarMode={sidebarMode} menuOpen={menuOpen} showBack={showBack} onBack={goBack} onToggleSidebar={toggleDesktopSidebar} onHideSidebar={() => changeSidebarMode('hidden')} onToggleMenu={() => setMenuOpen((open) => !open)} onLogout={logout}/>
      {business && <JourneyNavigation businessId={business.id} pathname={pathname} navigate={navigate}/>}
      {data.mode === 'api' && data.error && <div className="form-message error app-data-warning" role="alert">{data.error} <button type="button" className="button button-secondary" onClick={() => void data.runtime.refresh()}>Actualizar datos</button></div>}
      <main id="main-content" className="main-content">{data.mode === 'api' && <div className="online-data-status"><span>Datos del servidor · {snapshot.apiAsOf ? new Date(snapshot.apiAsOf).toLocaleString('es-AR') : 'Fecha no informada'}</span><button type="button" className="button button-secondary" disabled={data.loadState === 'refreshing' || Boolean(data.recovery)} onClick={() => void data.runtime.refresh()}>{data.loadState === 'refreshing' ? 'Actualizando…' : 'Actualizar datos'}</button></div>}{content}<LegacyRecords/></main>
      <footer className="app-footer"><span>Asistente PyME · {data.mode === 'demo' ? 'Demo local' : 'Conectado al servidor'}</span><span>{data.mode === 'demo' ? 'Sin autenticación ni pagos reales · Datos locales DEMO' : 'Sesión autenticada · Pagos declarados, no acreditados por un banco'}</span></footer>
    </div>
  </div>{sessionLocked && <SessionPanel modal onLogout={logout}/>}{!sessionLocked && data.recovery && <OperationRecovery operation={data.recovery}/>}</NavigationGuardContext.Provider>
}

export default App
