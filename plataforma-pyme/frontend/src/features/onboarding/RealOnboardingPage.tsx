import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../app/Icon.tsx'
import { ApiHttpError } from '../../api/httpClient.ts'
import { createOperationsGateway, operationsError } from '../businesses/realOperationsGateway.ts'
import { createCatalogGateway, catalogErrorMessage } from '../catalog/realCatalogGateway.ts'
import { createInventoryGateway, inventoryErrorMessage } from '../inventory/realInventoryGateway.ts'
import type { ReadProbe, ObservedPage, SetupSources, SetupStep } from './realOnboardingModel.ts'
import { assessBusinessSetup } from './realOnboardingModel.ts'
import './realOnboarding.css'

type Props={
  token:string; userId:string; businessId:string
  onNavigate:(next:string)=>void; onUnauthorized:()=>void
}
const PAGE_SIZE=100
const MAX_PAGES=5

/**
 * Un tablero no debe afirmar que algo falta sólo porque la primera página
 * vino vacía/incompleta. Cada lectura es GET, sin mutaciones o datos DEMO.
 */
async function consultPages<T>(
  read:(offset:number,limit:number,signal:AbortSignal)=>Promise<T[]>,
  signal:AbortSignal,
):Promise<ObservedPage<T>> {
  const items:T[]=[]
  for(let page=0;page<MAX_PAGES;page++){
    const rows=await read(page*PAGE_SIZE,PAGE_SIZE,signal)
    items.push(...rows)
    if(rows.length<PAGE_SIZE)return {items,complete:true}
  }
  return {items,complete:false}
}
function asProbe<T>(
  result:PromiseSettledResult<T>,explain:(reason:unknown)=>string,
):ReadProbe<T> {
  return result.status==='fulfilled'
    ?{state:'ready',data:result.value}
    :{state:'unavailable',message:explain(result.reason)}
}
const statusNames={
  done:'Preparado',todo:'Pendiente',unknown:'No verificado','not-required':'No requiere stock',
} as const
const nextActions=[
  {section:'proveedores',name:'Proveedores',description:'Registrá contactos y condiciones comerciales.',icon:'briefcase'},
  {section:'compras',name:'Compras y recepciones',description:'Registrá compras y confirmá la recepción en la sede correcta.',icon:'shopping'},
  {section:'pos',name:'Punto de venta',description:'Prepará un carrito y revisá los medios declarados antes de confirmar.',icon:'receipt'},
  {section:'ventas',name:'Historial de ventas',description:'Consultá comprobantes registrados por tu empresa.',icon:'clock'},
] as const

export function RealOnboardingPage({token,userId,businessId,onNavigate,onUnauthorized}:Props){
  const ops=useMemo(()=>createOperationsGateway(token,userId),[token,userId])
  const catalogApi=useMemo(()=>createCatalogGateway(token,businessId),[token,businessId])
  const inventoryApi=useMemo(()=>createInventoryGateway(token,businessId),[token,businessId])
  const [generation,setGeneration]=useState(0)
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading')
  const [snapshot,setSnapshot]=useState<SetupSources|null>(null)
  const [error,setError]=useState('')

  useEffect(()=>{
    const controller=new AbortController()
    async function load(){
      try{
        // La empresa/membresía REAL siempre se comprueba antes de mostrar progreso.
        const business=await ops.business(businessId,controller.signal)
        if(controller.signal.aborted)return
        const [locations,catalog,balances]=await Promise.allSettled([
          ops.locations(businessId,controller.signal),
          consultPages((offset,limit,signal)=>catalogApi.page(offset,limit,signal),controller.signal),
          consultPages((offset,limit,signal)=>inventoryApi.balances(offset,limit,{},signal),controller.signal),
        ])
        if(controller.signal.aborted)return
        if([locations,catalog,balances].some(result=>result.status==='rejected'
          &&result.reason instanceof ApiHttpError&&result.reason.status===401)){
          onUnauthorized();return
        }
        setSnapshot({
          business,
          locations:asProbe(locations,operationsError),
          catalog:asProbe(catalog,catalogErrorMessage),
          balances:asProbe(balances,inventoryErrorMessage),
        })
        setState('ready')
      }catch(cause){
        if(controller.signal.aborted)return
        if(cause instanceof ApiHttpError&&cause.status===401){onUnauthorized();return}
        setSnapshot(null)
        setError(operationsError(cause))
        setState('error')
      }
    }
    void load()
    return ()=>controller.abort()
  },[ops,catalogApi,inventoryApi,businessId,generation,onUnauthorized])

  const assessment=useMemo(()=>snapshot?assessBusinessSetup(snapshot):null,[snapshot])
  const business=snapshot?.business
  const canConfigure=business?.status==='ACTIVA'&&
    ['TITULAR_ADMINISTRATIVO','ADMINISTRADOR'].includes(business.membership.role)
  const pendingStep=assessment?.steps.find(step=>step.status==='todo')??null
  const allPrepared=Boolean(assessment?.verified&&assessment.completed===assessment.required)
  const base='/real/empresas/'+businessId
  function navigate(section:string){onNavigate(section?base+'/'+section:base)}
  function refresh(){
    setSnapshot(null);setError('');setState('loading')
    setGeneration(g=>g+1)
  }
  function actionTitle(step:SetupStep){
    return step.status==='done'?'Consultar':canConfigure?'Configurar':'Ver sección'
  }

  return <section className="real-auth-card real-business-panel e3-onboarding" aria-label="Inicio y primeros pasos REAL">
    <nav className="real-business-nav" aria-label="Navegación de Inicio">
      <button type="button" className="real-auth-link" onClick={()=>onNavigate('/real/empresas')}>
        <Icon name="arrow-left" size={15}/> Mis empresas
      </button>
      <button type="button" className="real-auth-link" onClick={()=>navigate('')}>Datos de la empresa</button>
    </nav>
    <header className="e3-onboard-hero">
      <span className="e3-onboard-hero-icon" aria-hidden="true"><Icon name="home" size={27}/></span>
      <div className="e3-onboard-hero-copy">
        <span className="real-auth-eyebrow">EMPRESA SELECCIONADA · DATOS REALES</span>
        <h1>Inicio</h1>
        <p>{business
          ?'Organizá los primeros pasos de '+business.name+'.'
          :'Consultá la preparación y las herramientas de tu empresa.'}</p>
      </div>
      <button type="button" className="real-auth-secondary" onClick={refresh}
        disabled={state==='loading'}>
        {state==='loading'?'Consultando…':'Actualizar desde API'}
      </button>
    </header>

    {state==='loading'&&<p role="status" className="e3-onboard-loading">
      Consultando la empresa, sus ubicaciones, el catálogo y el inventario en FastAPI…
    </p>}
    {state==='error'&&<div className="e3-onboard-error" role="alert">
      <strong>No se pudo comprobar tu empresa.</strong>
      <p>{error}</p>
      <button type="button" className="real-auth-secondary" onClick={refresh}>Reintentar lectura</button>
    </div>}
    {state==='ready'&&business&&assessment&&<>
      <section className="e3-h2-next-step" aria-label="Siguiente paso recomendado">
        <div className="e3-h2-next-copy">
          <span className="e3-h2-eyebrow">GUÍA DE CONFIGURACIÓN REAL</span>
          <h2>{pendingStep?'Siguiente paso: '+pendingStep.title:
            allPrepared?'Tu configuración inicial está preparada':
            'Revisá los datos de configuración'}</h2>
          <p>{pendingStep?pendingStep.subtitle:
            allPrepared?'Ya podés explorar las herramientas de tu empresa. El sistema validará los permisos y las existencias al operar.':
            'Algunos datos no pudieron comprobarse. Actualizá desde la API antes de continuar.'}</p>
        </div>
        {pendingStep?
          <button type="button" className="real-auth-primary"
            onClick={()=>navigate(pendingStep.route)}>
            {canConfigure?'Configurar siguiente paso':'Consultar sección'} <Icon name="arrow" size={17}/>
          </button>
          :allPrepared?
            <button type="button" className="real-auth-secondary" onClick={()=>navigate('pos')}>
              Ir al punto de venta <Icon name="arrow" size={17}/>
            </button>
          :<button type="button" className="real-auth-secondary" onClick={refresh}>
              Actualizar estado <Icon name="arrow" size={17}/>
            </button>}
      </section>
      <div className="e3-onboard-business-strip">
        <div><strong>{business.name}</strong>
          <span>{business.category} · {business.membership.role.replaceAll('_',' ')}</span>
        </div>
        <span className={'e3-onboard-business-status'+(business.status==='ACTIVA'?' e3-onboard-active':'')}>
          {business.status==='ACTIVA'?'Empresa activa':'Empresa suspendida'}
        </span>
      </div>
      {business.status!=='ACTIVA'&&<p role="note" className="e3-onboard-warning">
        Esta empresa está suspendida. Podés consultar información disponible, pero las operaciones se rigen por los permisos del backend.
      </p>}

      <section className="e3-onboard-progress" aria-label="Progreso de configuración inicial">
        <div className="e3-onboard-progress-head">
          <div><h2>Primeros pasos</h2>
            <p>Se completan según registros existentes en PostgreSQL, no por marcar casillas.</p>
          </div>
          <strong>{assessment.completed} de {assessment.required} preparados</strong>
        </div>
        <div className="e3-onboard-progress-track" role="progressbar"
          aria-label="Configuración inicial observada"
          aria-valuemin={0} aria-valuemax={assessment.required}
          aria-valuenow={assessment.completed}>
          <span style={{width:(assessment.required?100*assessment.completed/assessment.required:0)+'%'}}/>
        </div>
        {!assessment.verified&&<p className="e3-onboard-partial" role="status">
          <Icon name="shield" size={16}/> Algunas lecturas están incompletas o restringidas.
          No mostramos datos faltantes como si fueran cero.
        </p>}
        {assessment.verified&&assessment.completed===assessment.required&&
          <p className="e3-onboard-complete" role="status">
            Primeros pasos comprobados. Esto no reemplaza los permisos ni las verificaciones al operar.
          </p>}
      </section>

      <section className="e3-onboard-checklist" aria-label="Guía de configuración REAL">
        {assessment.steps.map((step,index)=><article key={step.id}
          className={'e3-onboard-step e3-onboard-step-'+step.status}>
          <span className="e3-onboard-step-number">{index+1}</span>
          <div className="e3-onboard-step-copy">
            <div className="e3-onboard-step-top">
              <h3>{step.title}</h3>
              <span className="e3-onboard-step-status">{statusNames[step.status]}</span>
            </div>
            <p>{step.subtitle}</p>
            <small>{step.detail}</small>
          </div>
          <button type="button" className="real-auth-secondary"
            onClick={()=>navigate(step.route)}>
            {actionTitle(step)} <Icon name="arrow" size={15}/>
          </button>
        </article>)}
      </section>

      <section className="e3-onboard-next" aria-label="Herramientas disponibles">
        <div className="e3-onboard-next-heading">
          <h2>Continuá con tu negocio</h2>
          <p>Proveedores, compras y ventas son herramientas opcionales para configurar según tu actividad.</p>
        </div>
        <div className="e3-onboard-next-grid">
          {nextActions.map(action=><button type="button" key={action.section}
            onClick={()=>navigate(action.section)} className="e3-onboard-next-card">
            <span className="e3-onboard-next-icon"><Icon name={action.icon} size={21}/></span>
            <strong>{action.name}</strong>
            <small>{action.description}</small>
            <span className="e3-onboard-next-arrow"><Icon name="arrow" size={17}/></span>
          </button>)}
        </div>
      </section>
      <p className="e3-onboard-footnote">
        Esta guía solo hace consultas GET de esta empresa. No crea registros, no modifica stock
        y no confirma ventas. Al regresar, actualizá para verificar los cambios guardados.
        La consulta de catálogos e inventario se limita a {MAX_PAGES*PAGE_SIZE} registros por tipo:
        si existe más información se muestra como parcial.
      </p>
    </>}
  </section>
}
