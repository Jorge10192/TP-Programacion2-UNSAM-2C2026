import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Icon } from '../../app/Icon.tsx'
import { createPhotoGateway, MAX_CATALOG_PHOTOS, photoCollectionPath, photoErrorMessage } from './photoGateway.ts'
import type { PhotoOwner, PhotoRecord } from './photoGateway.ts'
import './realPhotos.css'

type Shared = { token: string; owner: PhotoOwner }

/** Descarga autenticada con URL temporal. Se revoca al desmontar o cambiar foto. */
function AuthenticatedPhoto({ token, photo, alt, owner }: Shared & { photo: PhotoRecord; alt: string }) {
  const root = photoCollectionPath(owner)
  const gateway = useMemo(() => createPhotoGateway(token, owner), [token, root])
  const [source,setSource] = useState<string | null>(null)
  useEffect(() => {
    const abort = new AbortController()
    let objectUrl: string | null = null
    setSource(null)
    void gateway.content(photo.id, abort.signal).then(blob => {
      if (abort.signal.aborted) return
      objectUrl=URL.createObjectURL(blob)
      setSource(objectUrl)
    }).catch(() => { if (!abort.signal.aborted) setSource(null) })
    return () => { abort.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [gateway, photo.id])
  return source
    ? <img className="e3-photo-img" src={source} alt={alt} loading="lazy"/>
    : <span className="e3-photo-fallback" role="img" aria-label={'Sin vista previa de '+alt}>
        <Icon name={owner.kind==='PROFILE'?'user':owner.kind==='SUPPLIER'?'briefcase':owner.kind==='BUSINESS'?'building':'package'} size={25}/>
      </span>
}

type ManagerProps = Shared & { title: string; canManage: boolean; onUnauthorized?: () => void; onChanged?: () => void }

/** Galería privada: edición explícita, errores recuperables y controles por rol. */
export function RealPhotoManager({ token, owner, title, canManage, onUnauthorized, onChanged }: ManagerProps) {
  const path = photoCollectionPath(owner)
  const gateway = useMemo(() => createPhotoGateway(token, owner), [token, path])
  const [photos,setPhotos] = useState<PhotoRecord[]>([])
  const [loading,setLoading] = useState(true)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const isCatalog = owner.kind==='CATALOG'
  const maximum = isCatalog?MAX_CATALOG_PHOTOS:1

  useEffect(() => {
    const abort=new AbortController()
    setLoading(true);setPhotos([]);setError('')
    void gateway.list(abort.signal).then(records => {
      if (!abort.signal.aborted) setPhotos(records)
    }).catch(cause=>{
      if (abort.signal.aborted)return
      setError(photoErrorMessage(cause))
      if (cause && typeof cause==='object' && 'status' in cause && cause.status===401) onUnauthorized?.()
    }).finally(()=>{ if (!abort.signal.aborted)setLoading(false) })
    return ()=>abort.abort()
  },[gateway,onUnauthorized])

  async function refresh() {
    const current=await gateway.list()
    setPhotos(current)
    return current
  }

  async function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected=Array.from(event.target.files??[])
    event.target.value=''
    if (!selected.length || busy || !canManage) return
    if (isCatalog && selected.length+photos.length>maximum) {
      setError('El artículo o servicio admite hasta 8 fotos; quitá alguna antes de agregar más.')
      return
    }
    setBusy(true);setError('');setNotice('')
    try {
      for(const file of selected) await gateway.upload(file)
      await refresh()
      onChanged?.()
      setNotice(isCatalog?'Fotografías guardadas en PostgreSQL.':'Foto guardada en PostgreSQL.')
    } catch (cause) {
      setError(photoErrorMessage(cause))
      // Una respuesta perdida puede representar una carga confirmada; consultar antes de reintentar.
      try { await refresh(); onChanged?.() } catch { /* mensaje de consulta incierta permanece visible */ }
      if (cause && typeof cause==='object' && 'status' in cause && cause.status===401) onUnauthorized?.()
    } finally {setBusy(false)}
  }

  async function removePhoto(id: string) {
    if (!canManage || busy || !window.confirm('¿Quitar esta fotografía? Esta acción no elimina la ficha ni sus operaciones.')) return
    setBusy(true);setError('');setNotice('')
    try {
      await gateway.remove(id)
      await refresh()
      onChanged?.()
      setNotice('Foto quitada correctamente.')
    } catch(cause) {
      setError(photoErrorMessage(cause))
      try { await refresh() } catch { /* conservar advertencia */ }
      if (cause && typeof cause==='object' && 'status' in cause && cause.status===401) onUnauthorized?.()
    } finally {setBusy(false)}
  }

  return <section className="e3-photo-manager" aria-label={'Imágenes de '+title}>
    <div className="e3-photo-heading">
      <div><h3>{title}</h3><p>{isCatalog?'Hasta 8 fotos. La primera es la portada del artículo o servicio.'
          :'Una foto. Podés reemplazarla o quitarla cuando quieras.'}</p></div>
      <span className="e3-photo-count">{photos.length}/{maximum}</span>
    </div>
    {loading&&<p role="status">Consultando fotografías…</p>}
    {!loading&&<>
      {photos.length===0&&<p className="e3-photo-empty">Todavía no cargaste ninguna foto.</p>}
      <div className="e3-photo-grid">
        {photos.map((photo,i)=><figure className="e3-photo-card" key={photo.id}>
          <AuthenticatedPhoto token={token} owner={owner} photo={photo}
            alt={title+(isCatalog?' — fotografía '+(i+1):'')}/>
          <figcaption>{isCatalog&&i===0?'Portada':isCatalog?'Foto '+(i+1):'Foto actual'}
            {canManage&&<button type="button" className="real-auth-secondary" disabled={busy}
              onClick={()=>void removePhoto(photo.id)}>Quitar foto</button>}</figcaption>
        </figure>)}
      </div>
      {canManage&&<div className="e3-photo-actions">
        <label>{isCatalog?'Agregar fotos':'Seleccionar o reemplazar foto'}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
            multiple={isCatalog} disabled={busy || (isCatalog&&photos.length>=maximum)}
            onChange={event=>void selectFiles(event)}/>
        </label>
        <small>JPG, PNG o WebP. Hasta 5 MB por foto; se optimiza automáticamente.</small>
      </div>}
      {canManage&&!isCatalog&&photos.length>0&&<p className="real-auth-note">Si seleccionás otra foto, reemplazará la anterior.</p>}
    </>}
    {notice&&<p className="real-auth-message" role="status">{notice}</p>}
    {error&&<div className="real-auth-message real-auth-error" role="alert">{error}
      <button type="button" className="real-auth-link" disabled={busy} onClick={()=>{setError('');setLoading(true);void refresh().catch(e=>setError(photoErrorMessage(e))).finally(()=>setLoading(false))}}>Actualizar fotos</button>
    </div>}
  </section>
}

type PreviewProps = Shared & { alt:string; className?:string; revision?:number; fallbackText?:string; fallbackIcon?:'user'|'building'|'briefcase'|'package'|'boxes' }
/** Vista previa perezosa: evita una descarga por cada fila paginada no visible. */
export function RealPhotoPreview({token,owner,alt,className='',revision=0,fallbackText,fallbackIcon}: PreviewProps) {
  const path=photoCollectionPath(owner)
  const gateway=useMemo(()=>createPhotoGateway(token,owner),[token,path])
  const element=useRef<HTMLSpanElement>(null)
  const [visible,setVisible]=useState(false)
  const [cover,setCover]=useState<PhotoRecord|null>(null)
  useEffect(()=>{
    const target=element.current
    if(!target || !('IntersectionObserver' in window)){setVisible(true);return}
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect()}
    },{rootMargin:'130px'})
    observer.observe(target)
    return ()=>observer.disconnect()
  },[])
  useEffect(()=>{
    if(!visible)return
    const abort=new AbortController()
    void gateway.list(abort.signal).then(records=>{if(!abort.signal.aborted)setCover(records[0]??null)})
      .catch(()=>{if(!abort.signal.aborted)setCover(null)})
    return()=>abort.abort()
  },[gateway,visible,revision])
  return <span ref={element} className={'e3-photo-preview '+className}>
    {cover
      ?<AuthenticatedPhoto token={token} owner={owner} photo={cover} alt={alt}/>
      :<span className="e3-photo-fallback" aria-hidden="true">
        {fallbackText ? <span>{fallbackText}</span> : <Icon name={fallbackIcon ?? (owner.kind==='PROFILE'?'user':owner.kind==='BUSINESS'?'building':owner.kind==='SUPPLIER'?'briefcase':'package')} size={26}/>}
      </span>}
  </span>
}
