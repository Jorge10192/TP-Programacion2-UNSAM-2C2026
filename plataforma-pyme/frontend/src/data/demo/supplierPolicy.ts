/**
 * Reglas puras de proveedores DEMO. Sin compras, usuarios ni pagos reales.
 * Nunca convertir condiciones comerciales informativas en descuentos aplicados.
 */
import { validateGoogleMapsLink } from './mapsLinks'

export const supplierPaymentLabels = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  MERCADO_PAGO: 'Mercado Pago',
  CUENTA_DNI: 'Cuenta DNI',
  TARJETA: 'Tarjeta',
  CHEQUE: 'Cheque',
  CUENTA_CORRIENTE: 'Cuenta corriente',
} as const
export type SupplierPayment = keyof typeof supplierPaymentLabels
export const supplierPayments = Object.keys(supplierPaymentLabels) as SupplierPayment[]
export const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const

export type SupplierPromotion = {
  id: string
  days: number[] // 0 = lunes, 6 = domingo; [] = todos/no especificado
  paymentMethod: SupplierPayment | ''
  benefit: string
}
export type SupplierInput = {
  name: string
  offerings: string
  contactPerson: string
  phone: string
  whatsapp: string
  email: string
  address: string
  mapsUrl: string
  website: string
  instagram: string
  paymentMethods: SupplierPayment[]
  promotions: SupplierPromotion[]
  notes: string
}

export const blankSupplier: SupplierInput = {
  name: '', offerings: '', contactPerson: '', phone: '', whatsapp: '', email: '',
  address: '', mapsUrl: '', website: '', instagram: '', paymentMethods: [],
  promotions: [], notes: '',
}

function textValue(value: unknown, field: string, max: number, min = 0): string {
  if (typeof value !== 'string') throw new Error(field + ': formato inválido.')
  const text = value.trim().replace(/[\t ]+/g, ' ')
  if (text.length < min || text.length > max) throw new Error(field + ': debe tener entre ' + min + ' y ' + max + ' caracteres.')
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw new Error(field + ': contiene caracteres inválidos.')
  return text
}

export function supplierNameKey(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-AR')
}

export function validateSupplierWebsite(value: string): string {
  const text = textValue(value, 'Sitio web', 2048)
  if (!text) return ''
  let url: URL
  try { url = new URL(text) } catch { throw new Error('Ingresá una URL de sitio web completa con https://') }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.')) {
    throw new Error('Se admiten solamente enlaces HTTPS sin usuario, contraseña ni puerto.')
  }
  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      host === '127.0.0.1' || host === '0.0.0.0' || host === '[::1]') {
    throw new Error('No se permiten direcciones locales como sitio web.')
  }
  return url.href
}

/** El número puede quedar vacío. Para WhatsApp se requiere E.164 (+país...). */
export function whatsappUrl(phone: string): string | null {
  const text = phone.trim()
  if (!text) return null
  if (!/^\+[1-9](?:[\d\s().-]){6,22}$/.test(text)) return null
  const digits = text.replace(/[^\d]/g, '')
  if (digits.length < 8 || digits.length > 15) return null
  return 'https://wa.me/' + digits
}

export function phoneUrl(phone: string): string | null {
  if (!phone || !/^\+?[\d\s().-]{6,35}$/.test(phone.trim())) return null
  const cleaned = phone.replace(/[^\d+]/g, '')
  return /^\+?\d{6,15}$/.test(cleaned) ? 'tel:' + cleaned : null
}

export function emailUrl(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'mailto:' + encodeURIComponent(email).replace('%40', '@') : null
}

export function instagramUrl(handle: string): string | null {
  const value = handle.trim().replace(/^@/, '')
  return /^[A-Za-z0-9._]{1,30}$/.test(value) ? 'https://www.instagram.com/' + value + '/' : null
}

export function normalizeSupplierInput(input: SupplierInput): SupplierInput {
  const name = textValue(input.name, 'Nombre del proveedor', 90, 2)
  const offerings = textValue(input.offerings, 'Productos o servicios ofrecidos', 240)
  const contactPerson = textValue(input.contactPerson, 'Persona de contacto', 100)
  const phone = textValue(input.phone, 'Teléfono', 35)
  const whatsapp = textValue(input.whatsapp, 'WhatsApp', 35)
  if (phone && !/^\+?[\d\s().-]{6,35}$/.test(phone)) throw new Error('El teléfono sólo admite números y signos telefónicos.')
  if (whatsapp && !whatsappUrl(whatsapp)) throw new Error('WhatsApp requiere formato internacional, por ejemplo +5491112345678.')
  const email = textValue(input.email, 'Correo electrónico', 120).toLowerCase()
  if (email && !emailUrl(email)) throw new Error('Ingresá un correo electrónico válido.')
  const address = textValue(input.address, 'Dirección o referencia', 160)
  const mapsUrl = validateGoogleMapsLink(input.mapsUrl)
  const website = validateSupplierWebsite(input.website)
  const instagram = textValue(input.instagram, 'Instagram', 31)
  if (instagram && !instagramUrl(instagram)) throw new Error('Instagram debe ser un usuario válido, por ejemplo @empresa.')
  const notes = textValue(input.notes, 'Observaciones comerciales', 650)
  if (!Array.isArray(input.paymentMethods) || input.paymentMethods.length > supplierPayments.length ||
      input.paymentMethods.some((m) => !Object.hasOwn(supplierPaymentLabels, m)) ||
      new Set(input.paymentMethods).size !== input.paymentMethods.length) {
    throw new Error('Medios de pago inválidos o duplicados.')
  }
  if (!Array.isArray(input.promotions) || input.promotions.length > 8) {
    throw new Error('Se admiten hasta ocho condiciones comerciales informativas.')
  }
  const usedIds = new Set<string>()
  const promotions = input.promotions.map((raw) => {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' ||
        !/^demo-promo-[a-f0-9-]{36}$/.test(raw.id) || usedIds.has(raw.id)) {
      throw new Error('Identificador de promoción inválido o duplicado.')
    }
    usedIds.add(raw.id)
    if (!Array.isArray(raw.days) || raw.days.length > 7 ||
        raw.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
        new Set(raw.days).size !== raw.days.length) throw new Error('Días de promoción inválidos.')
    if (raw.paymentMethod !== '' && !Object.hasOwn(supplierPaymentLabels, raw.paymentMethod)) {
      throw new Error('Medio de pago de la promoción inválido.')
    }
    return {
      id: raw.id,
      days: [...raw.days].sort((a, b) => a - b),
      paymentMethod: raw.paymentMethod,
      benefit: textValue(raw.benefit, 'Condición o beneficio', 160, 3),
    }
  })
  return { name, offerings, contactPerson, phone, whatsapp, email, address,
    mapsUrl, website, instagram, notes, paymentMethods: [...input.paymentMethods], promotions }
}

export function supplierShareText(
  businessName: string,
  item: Pick<SupplierInput, 'name' | 'offerings' | 'phone' | 'whatsapp' | 'email' | 'website' | 'address' | 'mapsUrl'>,
): string {
  const lines = [businessName + ' · Proveedor: ' + item.name]
  if (item.offerings) lines.push('Ofrece: ' + item.offerings)
  if (item.phone) lines.push('Teléfono: ' + item.phone)
  if (item.whatsapp) lines.push('WhatsApp: ' + item.whatsapp)
  if (item.email) lines.push('Correo: ' + item.email)
  if (item.address) lines.push('Dirección: ' + item.address)
  if (item.website) lines.push('Sitio: ' + item.website)
  if (item.mapsUrl) lines.push('Google Maps: ' + item.mapsUrl)
  return lines.join('\n')
}
