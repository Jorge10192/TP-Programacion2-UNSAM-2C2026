/**
 * Google Maps URLs sin API key ni geocodificación.
 * No se incrusta contenido externo: se abre un enlace sólo tras la acción del usuario.
 */

const MAX_URL_LENGTH = 2048

export function validateGoogleMapsLink(value: string): string {
  const text = value.trim()
  if (!text) return ''
  if (text.length > MAX_URL_LENGTH) {
    throw new Error('El enlace de Google Maps no puede superar los 2048 caracteres.')
  }

  let url: URL
  try {
    url = new URL(text)
  } catch {
    throw new Error('Pegá un enlace completo de Google Maps que comience con https://')
  }

  const host = url.hostname.toLowerCase()
  const allowed =
    ((host === 'google.com' || host === 'www.google.com') && (url.pathname === '/maps' || url.pathname.startsWith('/maps/'))) ||
    host === 'maps.app.goo.gl' ||
    (host === 'maps.google.com' && (url.pathname !== '/' || url.searchParams.has('q'))) ||
    (host === 'goo.gl' && url.pathname.startsWith('/maps/'))

  if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed) {
    throw new Error('Se admiten solamente enlaces HTTPS propios de Google Maps.')
  }

  return url.href
}

export function mapsSearchUrl(address: string): string | null {
  const query = address.trim()
  if (!query) return null
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query)
}

export function getLocationMapsLink(location: { address: string; mapUrl: string }): {
  url: string
  source: 'shared' | 'search'
} | null {
  if (location.mapUrl) {
    try {
      const validated = validateGoogleMapsLink(location.mapUrl)
      if (validated) return { url: validated, source: 'shared' }
    } catch {
      // No abrir URLs que hayan sido modificadas externamente en localStorage.
    }
  }

  const search = mapsSearchUrl(location.address)
  return search ? { url: search, source: 'search' } : null
}

/** Texto generado sólo al pulsar "Copiar", nunca compartido automáticamente. */
export function locationShareText(
  businessName: string,
  location: { name: string; address: string; mapUrl: string },
): string | null {
  const maps = getLocationMapsLink(location)
  if (!maps) return null

  const lines = [businessName + ' · ' + location.name]
  if (location.address.trim()) lines.push('Dirección/referencia: ' + location.address.trim())
  lines.push(maps.source === 'shared' ? 'Ubicación en Google Maps: ' + maps.url : 'Búsqueda de dirección en Google Maps (sin verificar): ' + maps.url)
  return lines.join('\n')
}
