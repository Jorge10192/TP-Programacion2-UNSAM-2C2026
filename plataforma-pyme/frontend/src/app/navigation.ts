export type IconName = 'home' | 'building' | 'pin' | 'users' | 'package' | 'boxes' | 'truck' | 'shopping' | 'wallet' | 'book' | 'chart' | 'clock' | 'credit' | 'user' | 'plus' | 'menu' | 'chevron' | 'arrow' | 'shield' | 'close' | 'search' | 'receipt' | 'briefcase' | 'panel' | 'panel-hide' | 'arrow-left'

export type NavigationItem = {
  id: string
  label: string
  segment: string
  icon: IconName
  group: 'Principal' | 'Operaciones' | 'Administración' | 'Más herramientas'
  description: string
  phase: 'E1-A' | 'E1-B' | 'E1-C' | 'Posterior'
}

export const navigationItems: NavigationItem[] = [
  { id: 'inicio', label: 'Inicio', segment: 'inicio', icon: 'home', group: 'Principal', description: 'Resumen de la empresa y accesos rápidos.', phase: 'E1-A' },
  { id: 'empresa', label: 'Datos de la empresa', segment: 'empresa', icon: 'building', group: 'Administración', description: 'Información y configuración del negocio.', phase: 'E1-B' },
  { id: 'ubicaciones', label: 'Ubicaciones', segment: 'ubicaciones', icon: 'pin', group: 'Administración', description: 'Sucursales, ferias y espacios de trabajo.', phase: 'E1-B' },
  { id: 'equipo', label: 'Equipo de trabajo', segment: 'equipo', icon: 'users', group: 'Administración', description: 'Colaboradores, roles e invitaciones.', phase: 'E1-B' },
  { id: 'cuentas', label: 'Cuentas y medios', segment: 'cuentas', icon: 'credit', group: 'Administración', description: 'Cuentas y medios de cobro.', phase: 'E1-B' },
  { id: 'catalogo', label: 'Catálogo', segment: 'catalogo', icon: 'package', group: 'Operaciones', description: 'Bienes y servicios del negocio.', phase: 'E1-B' },
  { id: 'inventario', label: 'Inventario', segment: 'inventario', icon: 'boxes', group: 'Operaciones', description: 'Existencias por ubicación y artículo.', phase: 'E1-B' },
  { id: 'movimientos', label: 'Movimientos', segment: 'movimientos', icon: 'truck', group: 'Operaciones', description: 'Traslados y ajustes con trazabilidad.', phase: 'E1-B' },
  { id: 'proveedores', label: 'Proveedores', segment: 'proveedores', icon: 'briefcase', group: 'Operaciones', description: 'Contactos y compras relacionadas.', phase: 'E1-B' },
  { id: 'compras', label: 'Compras', segment: 'compras', icon: 'shopping', group: 'Operaciones', description: 'Compras, recepciones y comprobantes.', phase: 'E1-B' },
  { id: 'ventas', label: 'Ventas', segment: 'ventas', icon: 'receipt', group: 'Operaciones', description: 'Cobros, descuentos y ventas.', phase: 'E1-C' },
  { id: 'gastos', label: 'Gastos', segment: 'gastos', icon: 'wallet', group: 'Operaciones', description: 'Gastos operativos y fondos.', phase: 'E1-C' },
  { id: 'jornadas', label: 'Apertura y cierre', segment: 'jornadas', icon: 'clock', group: 'Operaciones', description: 'Apertura, arqueo y cierre de caja.', phase: 'E1-C' },
  { id: 'historial', label: 'Historial', segment: 'historial', icon: 'clock', group: 'Más herramientas', description: 'Actividad y operaciones anteriores.', phase: 'E1-C' },
  { id: 'guias', label: 'Guías de apoyo', segment: 'guias', icon: 'book', group: 'Más herramientas', description: 'Procedimientos y pasos del equipo.', phase: 'Posterior' },
  { id: 'pedidos', label: 'Pedidos y reservas', segment: 'pedidos', icon: 'shopping', group: 'Más herramientas', description: 'Pedidos y reservas con seguimiento.', phase: 'Posterior' },
  { id: 'analisis', label: 'Análisis', segment: 'analisis', icon: 'chart', group: 'Más herramientas', description: 'Indicadores y reportes del negocio.', phase: 'Posterior' },
]

export const navigationGroups: NavigationItem['group'][] = ['Principal', 'Operaciones', 'Administración', 'Más herramientas']

export function businessHref(businessId: string, segment: string) {
  return '/b/' + encodeURIComponent(businessId) + '/' + segment
}

export const demoBusinesses = [
  { id: 'walos-demo', name: 'WALOS', category: 'Elaboración de productos', initials: 'W', accent: 'mint' },
  { id: 'comercio-demo', name: 'Comercio Ejemplo', category: 'Reventa de productos', initials: 'C', accent: 'blue' },
  { id: 'servicios-demo', name: 'Servicios Ejemplo', category: 'Prestación de servicios', initials: 'S', accent: 'violet' },
] as const

export type DemoBusiness = typeof demoBusinesses[number]
