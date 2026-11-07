/**
 * E1-C3: directorio de cuentas de cobro DEMO por empresa.
 * No se autentican titulares, no se verifica CBU/CVU/alias, no se guardan
 * claves, tokens, CVV ni saldos. Caja física vive en CashSession, no aquí.
 */
export type FinancialAccountKind = 'BANCARIA' | 'BILLETERA'
export type FinancialAccountChannel = 'TRANSFERENCIA' | 'MERCADO_PAGO_DECLARADO' | 'CUENTA_DNI' | 'OTRO_DECLARADO'

export const financialKindLabels: Record<FinancialAccountKind, string> = {
  BANCARIA: 'Cuenta bancaria',
  BILLETERA: 'Billetera virtual',
}
export const financialChannelLabels: Record<FinancialAccountChannel, string> = {
  TRANSFERENCIA: 'Transferencia (declarada)',
  MERCADO_PAGO_DECLARADO: 'Mercado Pago (no conectado)',
  CUENTA_DNI: 'Cuenta DNI (declarada)',
  OTRO_DECLARADO: 'Otra billetera (declarada)',
}

export type FinancialAccountInput = {
  label: string
  kind: FinancialAccountKind
  channel: FinancialAccountChannel
  institution: string
  holder: string
  alias: string
  identifier: string
  notes: string
}
export type FinancialAccount = FinancialAccountInput & {
  id: string
  businessId: string
  status: 'ACTIVA' | 'INACTIVA'
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}
export const blankFinancialAccount: FinancialAccountInput = {
  label: '', kind: 'BANCARIA', channel: 'TRANSFERENCIA',
  institution: '', holder: '', alias: '', identifier: '', notes: '',
}

function safeText(value: unknown, label: string, max: number, min = 0): string {
  if (typeof value !== 'string') throw new Error(label + ': ingresá un texto válido.')
  const text = value.trim().replace(/[\t ]+/g, ' ')
  if (text.length < min || text.length > max || [...text].some((char) => {
    const cp = char.charCodeAt(0)
    return cp < 32 || cp === 127
  })) throw new Error(label + ': debe tener entre ' + min + ' y ' + max + ' caracteres sin caracteres de control.')
  return text
}

/**
 * Sólo valida formato visual; no demuestra existencia de cuenta o titularidad.
 * Los CBU bancarios y CVU de billeteras se tratan como 22 dígitos de ejemplo.
 */
export function normalizeFinancialAccountInput(input: FinancialAccountInput): FinancialAccountInput {
  if (!input || !Object.hasOwn(financialKindLabels, input.kind)) {
    throw new Error('Elegí un tipo de cuenta válido.')
  }
  if (!Object.hasOwn(financialChannelLabels, input.channel)) {
    throw new Error('Seleccioná el medio de cobro declarado.')
  }
  if (input.kind === 'BANCARIA' && input.channel !== 'TRANSFERENCIA') {
    throw new Error('Una cuenta bancaria DEMO usa Transferencia como canal. Para billeteras, elegí Billetera virtual.')
  }
  const label = safeText(input.label, 'Nombre identificador de la cuenta', 80, 2)
  const institution = safeText(input.institution, 'Banco o billetera', 80, 2)
  const holder = safeText(input.holder, 'Titular de referencia', 90)
  const notes = safeText(input.notes, 'Observaciones', 350)
  const alias = safeText(input.alias, 'Alias', 20).toLowerCase()
  const identifier = safeText(input.identifier, 'CBU/CVU de prueba', 22).replace(/\s/g, '')
  if (alias && !/^[a-z0-9][a-z0-9.-]{4,18}[a-z0-9]$/.test(alias)) {
    throw new Error('El alias de ejemplo debe tener entre 6 y 20 caracteres: letras, números, puntos o guiones.')
  }
  if (identifier && !/^\d{22}$/.test(identifier)) {
    throw new Error('El CBU/CVU de ejemplo debe contener 22 dígitos sin espacios.')
  }
  if (!alias && !identifier) {
    throw new Error('Indicá al menos un alias o un CBU/CVU ficticio para identificar la cuenta.')
  }
  return { label, kind: input.kind, channel: input.channel, institution, holder, alias, identifier, notes }
}

export function financialAccountKey(value: string): string {
  return value.trim().toLocaleLowerCase('es-AR')
}

export function maskedAccountIdentifier(identifier: string): string {
  return identifier ? '•••• •••• •••• •••• ••' + identifier.slice(-4) : 'No informado'
}

/** Copia explícita: el destinatario puede ver los datos DEMO; el usuario decide si compartir. */
export function financialAccountShareText(account: Pick<FinancialAccount,
  'label' | 'kind' | 'institution' | 'holder' | 'alias' | 'identifier'>): string {
  const lines = [
    account.label,
    financialKindLabels[account.kind] + ' · ' + account.institution,
    account.holder ? 'Titular: ' + account.holder : '',
    account.alias ? 'Alias: ' + account.alias : '',
    account.identifier ? (account.kind === 'BANCARIA' ? 'CBU: ' : 'CVU: ') + account.identifier : '',
    'Datos de cuenta DEMO: verificá los datos antes de compartir.',
  ]
  return lines.filter(Boolean).join('\n')
}

/**
 * E1-C3.1: el MEDIO de pago no es la CUENTA de origen/destino.
 * Una transferencia puede entrar o salir tanto de un banco como de una
 * billetera con alias/CVU declarado. Todas las cuentas guardadas fueron
 * normalizadas (tienen alias o CBU/CVU de referencia).
 * Los canales específicos sólo se asocian a su propia billetera declarada.
 * Esto NO verifica transferencias, saldos ni acreditaciones externas.
 */
export function accountSupportsDeclaredPayment(account: Pick<FinancialAccount, 'status' | 'channel'>, method: string): boolean {
  if (account.status !== 'ACTIVA') return false
  if (method === 'TRANSFERENCIA') {
    return Object.hasOwn(financialChannelLabels, account.channel)
  }
  if (method === 'CUENTA_DNI') return account.channel === 'CUENTA_DNI'
  if (method === 'MERCADO_PAGO_DECLARADO') return account.channel === 'MERCADO_PAGO_DECLARADO'
  if (method === 'OTRO_DECLARADO') return account.channel === 'OTRO_DECLARADO'
  return false // Efectivo y tarjeta no usan cuentas bancarias de referencia.
}
