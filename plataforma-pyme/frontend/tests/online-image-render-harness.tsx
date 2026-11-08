import {renderToStaticMarkup} from 'react-dom/server'
import {DataContext} from '../src/data/dataContext'
import {NavigationGuardContext} from '../src/app/unsavedChanges'
import {createNavigationGuard} from '../src/app/navigationGuard'
import {mapSnapshot} from '../src/data/api/snapshot'
import {unavailableGateway} from '../src/data/gateway'
import {Welcome} from '../src/features/dashboard/Dashboards'
import {CatalogPage} from '../src/features/catalog/CatalogPage'
import {SupplierForm} from '../src/features/suppliers/SupplierForm'
import {CashSessionsPage} from '../src/features/cash/CashSessionsPage'
import {Topbar} from '../src/app/shell/TopBar'
import {InventoryPage} from '../src/features/inventory/InventoryPage'
import type {AppRuntime,AppState} from '../src/data/appRuntime'
import type {ReactNode} from 'react'
import type {Snapshot} from '../src/data/models'

export function renderOnlineFixture(raw:{snapshot:Snapshot}){
  const profile=raw.snapshot.profile
  const user={id:profile.id,name:profile.displayName,email:profile.email}
  const snapshot=mapSnapshot(raw,user)
  const businesses=Object.values(snapshot.businessesById)
  const business=businesses[0]
  const serviceBusiness=businesses.find(b=>b.kind==='SERVICIOS')!
  const state:AppState={mode:'api',snapshot,gateway:unavailableGateway(),session:{status:'authenticated',user,error:null},
    loadState:'ready',error:null,recovery:null,capabilities:{photos:false,multiBusiness:true,team:false,qr:false,
      financialAccounts:true,transfers:true,services:true,supplierRequired:false,cashRequired:true}}
  const runtime={getSnapshot:()=>state,subscribe:()=>()=>{}} as AppRuntime
  const guard=createNavigationGuard(()=>true,()=>{})
  const wrap=(node:ReactNode)=>renderToStaticMarkup(<DataContext.Provider value={runtime}><NavigationGuardContext.Provider value={guard}>{node}</NavigationGuardContext.Provider></DataContext.Provider>)
  const none=()=>{}
  return {
    home:wrap(<Welcome businesses={businesses} navigate={none}/>),
    catalog:wrap(<CatalogPage business={business} items={Object.values(snapshot.catalogItemsById).filter(p=>p.businessId===business.id)}/>),
    supplier:wrap(<SupplierForm businessName={business.name} onSave={async()=>{}} onCancel={none}/>),
    cash:wrap(<CashSessionsPage business={business} locations={[]} sessions={[]} sales={[]} expenses={[]}/>),
    secondInventory:wrap(<InventoryPage business={serviceBusiness} catalog={Object.values(snapshot.catalogItemsById).filter(p=>p.businessId===serviceBusiness.id)} locations={[]} movements={[]} operations={[]} initialTab="stock"/>),
    topbar:wrap(<Topbar business={business} businesses={businesses} profile={profile} title="Inicio" navigate={none} sidebarMode="expanded" menuOpen={false} showBack={false} onBack={none} onToggleSidebar={none} onToggleMenu={none}/>),
  }
}
