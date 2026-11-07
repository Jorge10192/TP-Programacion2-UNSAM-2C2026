export type IconName = 'home' | 'building' | 'pin' | 'users' | 'package' | 'boxes' | 'truck' | 'shopping' | 'wallet' | 'book' | 'chart' | 'clock' | 'credit' | 'user' | 'plus' | 'menu' | 'chevron' | 'arrow' | 'shield' | 'close' | 'search' | 'receipt' | 'briefcase' | 'panel' | 'panel-hide' | 'arrow-left'

export type NavigationItem = {
  id: string
  label: string
  segment: string
  icon: IconName
  group: 'Tu jornada' | 'Preparación' | 'Administración' | 'Más herramientas'
  description: string
  phase: 'E1-A' | 'E1-B' | 'E1-C' | 'Posterior'
}

export const navigationItems: NavigationItem[] = [
  { id: 'inicio', label: 'Inicio', segment: 'inicio', icon: 'home', group: 'Tu jornada', description: 'Guía de la jornada y estado del negocio.', phase: 'E1-A' },
  { id: 'compras', label: 'Compras', segment: 'compras', icon: 'shopping', group: 'Tu jornada', description: 'Registrá compras y confirmá la recepción.', phase: 'E1-B' },
  { id: 'inventario', label: 'Stock', segment: 'inventario', icon: 'boxes', group: 'Tu jornada', description: 'Revisá existencias por artículo y ubicación.', phase: 'E1-B' },
  { id: 'jornadas', label: 'Caja', segment: 'jornadas', icon: 'wallet', group: 'Tu jornada', description: 'Abrí la caja y volvé aquí para cerrarla.', phase: 'E1-C' },
  { id: 'ventas', label: 'Ventas', segment: 'ventas', icon: 'receipt', group: 'Tu jornada', description: 'Registrá productos vendidos y pagos declarados.', phase: 'E1-C' },
  { id: 'gastos', label: 'Gastos', segment: 'gastos', icon: 'credit', group: 'Tu jornada', description: 'Registrá los egresos de la operación.', phase: 'E1-C' },
  { id: 'catalogo', label: 'Catálogo', segment: 'catalogo', icon: 'package', group: 'Preparación', description: 'Artículos, servicios, unidades y precios.', phase: 'E1-B' },
  { id: 'proveedores', label: 'Proveedores', segment: 'proveedores', icon: 'briefcase', group: 'Preparación', description: 'Directorio opcional para tus compras.', phase: 'E1-B' },
  { id: 'ubicaciones', label: 'Ubicaciones', segment: 'ubicaciones', icon: 'pin', group: 'Preparación', description: 'Dónde almacenás, vendés y operás la caja.', phase: 'E1-B' },
  { id: 'empresa', label: 'Datos de la empresa', segment: 'empresa', icon: 'building', group: 'Administración', description: 'Información y configuración del negocio.', phase: 'E1-B' },
  { id: 'equipo', label: 'Equipo de trabajo', segment: 'equipo', icon: 'users', group: 'Administración', description: 'Colaboradores, roles e invitaciones.', phase: 'E1-B' },
  { id: 'cuentas', label: 'Cuentas y medios', segment: 'cuentas', icon: 'credit', group: 'Administración', description: 'Cuentas bancarias y billeteras de referencia por empresa (DEMO).', phase: 'E1-C' },
  { id: 'movimientos', label: 'Movimientos', segment: 'movimientos', icon: 'truck', group: 'Más herramientas', description: 'Historial de entradas, salidas y ajustes de stock.', phase: 'E1-B' },
  { id: 'historial', label: 'Historial', segment: 'historial', icon: 'clock', group: 'Más herramientas', description: 'Actividad y operaciones anteriores.', phase: 'E1-C' },
  { id: 'guias', label: 'Guías de apoyo', segment: 'guias', icon: 'book', group: 'Más herramientas', description: 'Procedimientos y pasos del equipo.', phase: 'Posterior' },
  { id: 'pedidos', label: 'Pedidos y reservas', segment: 'pedidos', icon: 'shopping', group: 'Más herramientas', description: 'Pedidos y reservas con seguimiento.', phase: 'Posterior' },
  { id: 'analisis', label: 'Análisis', segment: 'analisis', icon: 'chart', group: 'Más herramientas', description: 'Indicadores y reportes del negocio.', phase: 'Posterior' },
]

export const navigationGroups: NavigationItem['group'][] = ['Tu jornada', 'Preparación', 'Administración', 'Más herramientas']
export const journeyNavigationItems = navigationItems.filter((item) => item.group === 'Tu jornada')

export function businessHref(businessId: string, segment: string) {
  return '/b/' + encodeURIComponent(businessId) + '/' + segment
}

export type { Business } from '../data/models'
