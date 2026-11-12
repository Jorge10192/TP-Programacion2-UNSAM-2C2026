/** Team avatar read uses a tenant-scoped, read-only endpoint; no public profile URL. */
import { useEffect, useState } from 'react'
import { UUID_PATTERN } from '../businesses/businessGateway.ts'
import './realPhotos.css'

type Props = { token:string; businessId:string; memberUserId:string; initials:string }
export function RealTeamAvatar({token,businessId,memberUserId,initials}:Props){
  const [src,setSrc]=useState<string|null>(null)
  useEffect(()=>{
    if(!token||!UUID_PATTERN.test(businessId)||!UUID_PATTERN.test(memberUserId))return
    const abort=new AbortController()
    let objectUrl:string|null=null
    setSrc(null)
    const load=async()=>{
      try{
        const response=await fetch('/api/v1/photos/businesses/'+businessId+'/members/'+memberUserId+'/avatar',{
          method:'GET',headers:{Authorization:'Bearer '+token,Accept:'image/webp'},
          signal:abort.signal,redirect:'error',cache:'no-store',credentials:'omit',
        })
        if(!response.ok||!(response.headers.get('content-type')??'').toLowerCase().startsWith('image/webp'))return
        const blob=await response.blob()
        if(abort.signal.aborted||!blob.size||blob.size>2*1024*1024)return
        objectUrl=URL.createObjectURL(blob)
        if(!abort.signal.aborted)setSrc(objectUrl)
      }catch{ /* No photo, revoked access or offline: fall back to initials. */ }
    }
    void load()
    return()=>{abort.abort();if(objectUrl)URL.revokeObjectURL(objectUrl)}
  },[token,businessId,memberUserId])
  return <span className="e3-ops-avatar e3-team-member-avatar" aria-hidden="true">
    {src?<img src={src} alt="" loading="lazy"/>:initials}
  </span>
}
