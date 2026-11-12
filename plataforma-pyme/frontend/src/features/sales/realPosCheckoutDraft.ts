/**
 * T10-D — composición pura de pagos DECLARADOS, sin conexión ni POST.
 * No acredita bancos, tarjetas ni Mercado Pago. No usa floats para pesos.
 */
import { centsToPesos, pesosToCents } from '../catalog/realCatalogGateway.ts'
import {
  SALE_PAYMENT_METHODS, validateSaleCommand,
} from './realSaleCommand.ts'
import type {
  SaleCommand, SaleCommandLine, SalePaymentMethod, SaleTotals,
} from './realSaleCommand.ts'

export type PosPaymentDraft = {
  method: SalePaymentMethod
  amountText: string
  reference: string
}

export const POS_PAYMENT_LABELS: Record<SalePaymentMethod, string> = {
  EFECTIVO: 'Efectivo (declarado)',
  TRANSFERENCIA: 'Transferencia (declarada)',
  CUENTA_DNI: 'Cuenta DNI (declarado)',
  TARJETA: 'Tarjeta (declarada)',
  MERCADO_PAGO_DECLARADO: 'Mercado Pago (solo declarado)',
}

const methods = new Set<string>(SALE_PAYMENT_METHODS)

/** Fuerza validación idéntica a T10-A y suma exacta de medios de pago. */
export function composePosCheckout(
  locationId: string | null,
  lines: readonly SaleCommandLine[],
  discountCents: number,
  notes: string,
  paymentRows: readonly PosPaymentDraft[],
): { body: SaleCommand; totals: SaleTotals } {
  if (!Array.isArray(paymentRows) || paymentRows.length < 1 || paymentRows.length > 6)
    throw new RangeError('Se requieren entre 1 y 6 medios de pago declarados.')
  const payments = paymentRows.map(row => {
    if (!row || !methods.has(row.method))
      throw new RangeError('Medio de pago no admitido.')
    const amount = pesosToCents(row.amountText)
    if (amount === null || amount < 1)
      throw new RangeError('Cada pago declarado debe tener un importe positivo.')
    return { method: row.method, amount_cents: amount, reference: row.reference }
  })
  return validateSaleCommand({
    location_id: locationId, lines: lines.map(row => ({ ...row })),
    discount_cents: discountCents, notes, payments,
  })
}

/** Distribuye únicamente el saldo pendiente en el ÚLTIMO medio declarado.
 * Nunca modifica los anteriores ni crea una escritura. Calcula en centavos exactos.
 * No se admite un último pago cero: en ese caso se debe quitar ese medio.
 */
export function completeLastPosPayment(
  totalCents: number,
  payments: readonly PosPaymentDraft[],
): PosPaymentDraft[] {
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0)
    throw new RangeError('Primero ingresá un carrito con total positivo.')
  if (!Array.isArray(payments) || payments.length < 1 || payments.length > 6)
    throw new RangeError('Se requieren de 1 a 6 medios de pago.')
  let previousCents=0n
  for (const payment of payments.slice(0,-1)) {
    const cents=pesosToCents(payment.amountText)
    if (cents===null || cents<=0)
      throw new RangeError('Completá los importes anteriores antes de calcular el último.')
    previousCents+=BigInt(cents)
  }
  const remaining=BigInt(totalCents)-previousCents
  if (remaining<=0n)
    throw new RangeError('Los medios anteriores ya cubren o exceden el total. Ajustalos o quitá el último medio.')
  // La conversión reutiliza los límites de centavos existentes.
  const text=centsToPesos(Number(remaining))
  return payments.map((payment,i)=>i===payments.length-1
    ? {...payment,amountText:text}
    : {...payment})
}
