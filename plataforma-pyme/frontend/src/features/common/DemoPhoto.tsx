import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { Icon } from '../../app/Icon'
import {
  DEMO_IMAGE_CHANGED, optimizeDemoImage, readDemoImage, removeDemoImage, writeDemoImage,
} from '../../data/demo/imageStorage'

function usePhoto(imageKey: string): string | null {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    let version = 0
    let currentUrl: string | null = null
    function refresh() {
      const thisVersion = ++version
      void readDemoImage(imageKey).then((blob) => {
        if (cancelled || thisVersion !== version) return
        const next = blob ? URL.createObjectURL(blob) : null
        const prior = currentUrl
        currentUrl = next
        setSrc(next)
        if (prior) URL.revokeObjectURL(prior)
      }).catch(() => {
        if (cancelled || thisVersion !== version) return
        if (currentUrl) URL.revokeObjectURL(currentUrl)
        currentUrl = null
        setSrc(null)
      })
    }
    function onChange(event: Event) {
      if ((event as CustomEvent<string>).detail === imageKey) refresh()
    }
    refresh()
    window.addEventListener(DEMO_IMAGE_CHANGED, onChange)
    return () => {
      cancelled = true
      window.removeEventListener(DEMO_IMAGE_CHANGED, onChange)
      if (currentUrl) URL.revokeObjectURL(currentUrl)
    }
  }, [imageKey])
  return src
}

export function DemoPhoto({ imageKey, alt, fallback, className = '' }: {
  imageKey: string; alt: string; fallback: ReactNode; className?: string
}) {
  const src = usePhoto(imageKey)
  return <span className={'demo-photo ' + className}>
    {src ? <img src={src} alt={alt} loading="lazy" /> : fallback}
  </span>
}

export function DemoImagePicker({ imageKey, label }: { imageKey: string; label: string }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const src = usePhoto(imageKey)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || busy) return
    setError('')
    setNotice('')
    setBusy(true)
    try {
      const blob = await optimizeDemoImage(file)
      await writeDemoImage(imageKey, blob)
      setNotice('Imagen guardada en este navegador.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar la imagen.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await removeDemoImage(imageKey)
      setNotice('Imagen quitada de esta ficha.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo quitar la imagen.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="demo-image-picker">
    <DemoPhoto imageKey={imageKey} alt={'Foto de ' + label}
      fallback={<Icon name="user" size={26}/>} className="demo-image-picker-preview"/>
    <div className="demo-image-picker-content">
      <strong>{label}</strong>
      <div className="demo-image-picker-buttons">
        <button type="button" className="button button-secondary demo-image-picker-label" disabled={busy}
          onClick={() => fileRef.current?.click()}>
          <Icon name="plus" size={16}/>{busy ? 'Procesando…' : 'Elegir imagen'}
        </button>
        <input ref={fileRef} disabled={busy} type="file" accept="image/jpeg,image/png,image/webp"
          className="demo-image-picker-file" tabIndex={-1} onChange={(event) => void upload(event)}/>
        {src && <button type="button" className="button button-secondary" disabled={busy} onClick={() => void remove()}>Quitar imagen</button>}
      </div>
      <small>JPG, PNG o WebP hasta 8 MB. Se reduce a 512 px y se guarda inmediatamente en este navegador (no se sube a Internet).</small>
      {error && <p className="form-message error" role="alert">{error}</p>}
      {notice && <p className="form-message success" role="status">{notice}</p>}
    </div>
  </div>
}
