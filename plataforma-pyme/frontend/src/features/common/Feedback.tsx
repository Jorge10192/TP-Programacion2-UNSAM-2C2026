import { Icon } from '../../app/Icon'
import { businessHref } from '../../app/navigation'
import type { DemoBusiness } from '../../app/navigation'
import type { Navigate } from '../../app/types'

export function ComingSoon({ title, description, navigate, business }: { title: string; description: string; navigate: Navigate; business?: DemoBusiness }) {
  return <>
    <div className="page-heading"><div><p className="eyebrow">PLATAFORMA PYME · DEMO</p><h1>{title}</h1><p>{description}</p></div></div>
    <section className="empty-state">
      <div className="empty-icon"><Icon name="clock" size={36}/></div>
      <span className="soon-pill">Próximamente</span>
      <h2>Estamos preparando esta sección</h2>
      <p>El diseño se integrará a partir de los HTML originales seleccionados en E0-A. Por ahora esta pantalla no registra ni modifica información.</p>
      <button type="button" className="button button-primary" onClick={() => navigate(business ? businessHref(business.id, 'inicio') : '/inicio')}><Icon name="home" size={17}/> Volver al inicio</button>
    </section>
  </>
}

export function NotFound({ navigate, accessDenied = false }: { navigate: Navigate; accessDenied?: boolean }) {
  return <section className="empty-state not-found">
    <div className="empty-icon"><Icon name="shield" size={34}/></div>
    <h1>{accessDenied ? 'Empresa no disponible' : 'No encontramos esta página'}</h1>
    <p>{accessDenied ? 'La empresa solicitada no forma parte de las empresas de ejemplo de esta sesión. No se muestran sus datos.' : 'La dirección solicitada no corresponde a una sección disponible.'}</p>
    <button type="button" className="button button-primary" onClick={() => navigate('/inicio')}>Volver a mi espacio</button>
  </section>
}
