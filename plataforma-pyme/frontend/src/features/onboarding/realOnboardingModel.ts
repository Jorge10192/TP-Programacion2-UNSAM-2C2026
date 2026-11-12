/**
 * E3-1H1: indicadores de preparación REAL. Son orientación de uso, no reglas de
 * autorización, ni un reporte monetario o un cálculo de stock client-side.
 */
import type { RealBusiness } from '../businesses/businessGateway.ts'
import type { LocationRecord } from '../businesses/realOperationsGateway.ts'
import type { CatalogItem } from '../catalog/realCatalogGateway.ts'
import type { StockBalance } from '../inventory/realInventoryGateway.ts'

export type ReadProbe<T> =
  | { state:'ready'; data:T }
  | { state:'unavailable'; message:string }

export type ObservedPage<T>={items:T[]; complete:boolean}
export type SetupSources={
  business:RealBusiness
  locations:ReadProbe<LocationRecord[]>
  catalog:ReadProbe<ObservedPage<CatalogItem>>
  balances:ReadProbe<ObservedPage<StockBalance>>
}
export type SetupStatus='done'|'todo'|'unknown'|'not-required'
export type SetupStep={
  id:'location'|'catalog'|'stock'
  title:string
  subtitle:string
  status:SetupStatus
  detail:string
  route:'ubicaciones'|'catalogo'|'inventario'
}
export type SetupAssessment={
  steps:SetupStep[]
  completed:number
  required:number
  verified:boolean
  suggested:SetupStep|null
}

export function assessBusinessSetup(s:SetupSources):SetupAssessment {
  const places=s.locations.state==='ready'?s.locations.data:null
  const locationReady=places!==null&&places.some(l=>l.status==='ACTIVA')
  const locations:SetupStep={
    id:'location',title:'Prepará tu primera ubicación',
    subtitle:'Un local, feria, depósito, oficina u otro espacio de tu empresa.',
    route:'ubicaciones',status:places===null?'unknown':locationReady?'done':'todo',
    detail:places===null?'No pudimos verificar las ubicaciones. No significa que no existan.'
      :locationReady?'Tu empresa ya tiene al menos una ubicación activa.'
      :'Todavía no hay ubicaciones activas registradas.',
  }

  const catalog=s.catalog.state==='ready'?s.catalog.data:null
  const activeItems=catalog?.items.filter(i=>i.status==='ACTIVO'&&i.sellable)??[]
  const catalogReady=activeItems.length>0
  const products:SetupStep={
    id:'catalog',title:'Cargá un artículo o servicio',
    subtitle:'Registrá lo que ofrece tu negocio y sus datos de venta.',
    route:'catalogo',
    status:catalog===null?'unknown':catalogReady?'done':catalog.complete?'todo':'unknown',
    detail:catalog===null?'El catálogo no pudo verificarse.'
      :catalogReady?'Ya hay al menos un artículo o servicio activo y vendible.'
      :catalog.complete?'No encontramos artículos vendibles en tu catálogo.'
      :'La consulta es parcial: puede haber artículos en otras páginas.',
  }

  const stockPage=s.balances.state==='ready'?s.balances.data:null
  const physicalIds=new Set(activeItems.filter(i=>i.item_type==='BIEN').map(i=>i.id))
  const storingIds=new Set((places??[]).filter(l=>l.status==='ACTIVA'&&l.can_store).map(l=>l.id))
  const hasStock=Boolean(stockPage?.items.some(b=>b.quantity_milli>0
    &&physicalIds.has(b.catalog_item_id)&&storingIds.has(b.location_id)))
  const onlyServices=Boolean(catalog?.complete&&activeItems.length>0&&physicalIds.size===0)
  let stockStatus:SetupStatus='unknown'
  let stockDetail='No se pudo verificar un saldo positivo en una sede de almacenamiento.'
  if(onlyServices){
    stockStatus='not-required'
    stockDetail='Tu catálogo vendible contiene solo servicios: no necesitan stock físico.'
  }else if(hasStock){
    stockStatus='done'
    stockDetail='Encontramos existencias positivas de un bien vendible en una sede activa con depósito.'
  }else if(catalog?.complete&&!catalogReady){
    stockStatus='todo'
    stockDetail='Primero cargá un artículo. Los servicios no requieren inventario físico.'
  }else if(physicalIds.size===0){
    stockDetail='El catálogo todavía no está verificado por completo para determinar si hay bienes físicos.'
  }else if(places!==null&&storingIds.size===0){
    stockStatus='todo'
    stockDetail='Necesitás una sede activa habilitada para almacenar antes de iniciar stock.'
  }else if(stockPage?.complete&&catalog?.complete&&places!==null){
    stockStatus='todo'
    stockDetail='No encontramos existencias positivas de bienes vendibles en sedes de almacenamiento.'
  }else if(s.balances.state==='unavailable'){
    stockDetail='No fue posible consultar las existencias. No se considera que el stock sea cero.'
  }else{
    stockDetail='Consulta parcial: no se puede confirmar que falte stock.'
  }
  const stocks:SetupStep={
    id:'stock',title:'Verificá el inventario de tus productos',
    subtitle:'Solo para bienes físicos: la cantidad disponible se controla por sede.',
    route:'inventario',status:stockStatus,detail:stockDetail,
  }
  const steps=[locations,products,stocks]
  const required=steps.filter(step=>step.status!=='not-required')
  const completed=required.filter(step=>step.status==='done').length
  const suggested=required.find(step=>step.status==='todo')??null
  return {
    steps,required:required.length,completed,
    verified:required.every(step=>step.status!=='unknown'),
    suggested,
  }
}
