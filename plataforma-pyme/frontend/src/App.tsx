import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Sidebar } from './app/shell/SideMenu'
import { Topbar } from './app/shell/TopBar'
import { businessHref, demoBusinesses, navigationItems } from './app/navigation'
import type { Navigate } from './app/types'
import { Welcome, BusinessDashboard } from './features/dashboard/Dashboards'
import { ComingSoon, NotFound } from './features/common/Feedback'
import './App.css'

function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname || '/')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handlePopState = () => { setPathname(window.location.pathname); setMenuOpen(false) }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate: Navigate = (to) => {
    if (to !== window.location.pathname) window.history.pushState(null, '', to)
    setPathname(to)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const match = /^\/b\/([^/]+)\/([^/]+)$/.exec(pathname)
  const hasBusinessPath = pathname.startsWith('/b/')
  const business = match ? demoBusinesses.find((item) => item.id === match[1]) : undefined
  const section = match?.[2]
  const selectedPage = navigationItems.find((item) => item.segment === section)
  const personal = pathname === '/' || pathname === '/inicio'
  const pageTitle = business ? (selectedPage?.label ?? 'Sección desconocida') : pathname === '/perfil' ? 'Mi perfil' : pathname === '/empresas/nueva' ? 'Crear empresa' : 'Inicio'

  useEffect(() => { document.title = pageTitle + ' · Asistente PyME DEMO' }, [pageTitle])

  let content: ReactNode
  if (personal) content = <Welcome navigate={navigate} />
  else if (pathname === '/perfil') content = <ComingSoon title="Mi perfil" description="Tu perfil es personal e independiente de cada negocio." navigate={navigate} />
  else if (pathname === '/empresas/nueva') content = <ComingSoon title="Crear empresa" description="La creación de empresas se implementará en E1-A2." navigate={navigate} />
  else if (hasBusinessPath && !business) content = <NotFound navigate={navigate} accessDenied />
  else if (business && section === 'inicio') content = <BusinessDashboard business={business} navigate={navigate} />
  else if (business && selectedPage) content = <ComingSoon title={selectedPage.label} description={selectedPage.description} business={business} navigate={navigate} />
  else content = <NotFound navigate={navigate} />

  return <div className="app-layout">
    <Sidebar pathname={pathname} business={business} navigate={navigate} isOpen={menuOpen} onClose={() => setMenuOpen(false)}/>
    <div className="main-column">
      <Topbar business={business} title={pageTitle} navigate={navigate} onOpenMenu={() => setMenuOpen(true)} />
      <main id="main-content" className="main-content">{content}</main>
      <footer className="app-footer"><span>Asistente PyME · Prototipo E1-A1</span><span>Sin autenticación, stock ni cobros reales</span></footer>
    </div>
  </div>
}

export default App
