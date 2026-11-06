/**
 * E1-C2: egresos y jornadas en una caja física DEMO.
 * Una cuenta bancaria/virtual NO es una CashSession.
 * Todos los importes se almacenan como centavos enteros ARS.
 */
import { salePaymentLabels } from './salePolicy.ts'
import type { SalePaymentMethod } from './salePolicy.ts'

export const expenseCategories = {
  ALQUILER: 'Alquiler y servicios',
  INSUMOS: 'Insumos / materiales (gasto operativo)',
  TRANSPORTE: 'Transporte y logística',
  PERSONAL: 'Personal',
  IMPUESTOS: 'Impuestos y tasas',
  MANTENIMIENTO: 'Mantenimiento',
  OTROS: 'Otros',
} as const
export type ExpenseCategory = keyof typeof expenseCategories
export type ExpensePaymentMethod = SalePaymentMethod | 'OTRO_DECLARADO'
export const expensePaymentLabels: Record<ExpensePaymentMethod, string> = {
  ...salePaymentLabels,
  OTRO_DECLARADO: 'Otro medio declarado',
}
export type ExpenseInput = {
  paidOn: string
  locationId: string | null
  category: ExpenseCategory
  description: string
  amountCents: number
  paymentMethod: ExpensePaymentMethod
  notes: string
}

export type DemoExpense = ExpenseInput & {
  id: string; requestId: string; businessId: string
  createdAt: string; cashSessionId: string | null
}

export type CashCloseInput = { countedCashCents: number; notes: string }

export type CashCloseSnapshot = {
  expectedCashCents: number
  countedCashCents: number
  differenceCents: number
  openingCashCents: number
  cashSalesCents: number
  cashExpensesCents: number
  saleIds: string[]
  expenseIds: string[]
  closedBy: 'demo-user'
  closedAt: string
  notes: string
}

export type DemoCashSession = {
  id: string
  openRequestId: string
  closeRequestId: string | null
  businessId: string
  locationId: string | null
  openingCashCents: number
  openedAt: string
  openedBy: 'demo-user'
  status: 'ABIERTA' | 'CERRADA'
  closeSnapshot: CashCloseSnapshot | null
}

export const MAX_CASH_CENTS = 99_999_999_999

export function cashCents(value: unknown, label: string, permitZero = false): number {
  if (!Number.isSafeInteger(value) || (value as number) < (permitZero ? 0 : 1) ||
      (value as number) > MAX_CASH_CENTS) {
    throw new Error(label + ': ingresá un importe válido en ARS.')
  }
  return value as number
}

export function cashText(value: unknown, label: string, max: number, required = false): string {
  if (typeof value !== 'string') throw new Error(label + ': formato inválido.')
  const clean = value.trim().replace(/[\t ]+/g, ' ')
  if ((required && clean.length < 2) || clean.length > max ||
      [...clean].some((char) => { const n = char.charCodeAt(0); return n <= 8 || n === 11 || n === 12 || (n >= 14 && n <= 31) || n === 127 })) {
    throw new Error(label + ': longitud o caracteres inválidos.')
  }
  return clean
}
export function validCalendarDate(value: string): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value &&
    Number(value.slice(0, 4)) >= 2000 && Number(value.slice(0, 4)) <= 2100
}
export function normalizeExpense(input: ExpenseInput): ExpenseInput {
  if (!input || !validCalendarDate(input.paidOn)) throw new Error('Elegí una fecha válida.')
  if (input.locationId !== null && (typeof input.locationId !== 'string' ||
      !/^demo-location-[a-f0-9-]{36}$/.test(input.locationId))) {
    throw new Error('Ubicación de gasto inválida.')
  }
  if (!Object.hasOwn(expenseCategories, input.category)) throw new Error('Seleccioná una categoría válida.')
  if (!Object.hasOwn(expensePaymentLabels, input.paymentMethod)) throw new Error('Medio de pago inválido.')
  return {
    paidOn: input.paidOn, locationId: input.locationId,
    category: input.category, paymentMethod: input.paymentMethod,
    description: cashText(input.description, 'Concepto del gasto', 140, true),
    notes: cashText(input.notes, 'Observaciones', 500),
    amountCents: cashCents(input.amountCents, 'Importe del gasto'),
  }
}
export function normalizeClose(input: CashCloseInput): CashCloseInput {
  if (!input) throw new Error('Ingresá el arqueo contado.')
  return {
    countedCashCents: cashCents(input.countedCashCents, 'Efectivo contado', true),
    notes: cashText(input.notes, 'Observaciones del cierre', 500),
  }
}

type CashSale = { id: string; businessId: string; cashSessionId?: string | null;
  payments: { method: SalePaymentMethod; amountCents: number }[] }
type CashExpense = { id: string; businessId: string; cashSessionId: string | null;
  paymentMethod: ExpensePaymentMethod; amountCents: number }

/** Proyección del estado ABIERTO: nunca modifica movimientos ni saldos externos. */
export function cashSessionTotals(session: DemoCashSession, sales: CashSale[], expenses: CashExpense[]) {
  const saleIds: string[] = []
  const expenseIds: string[] = []
  let cashSales = 0n
  let cashExpenses = 0n
  for (const sale of sales) {
    if (sale.businessId !== session.businessId || sale.cashSessionId !== session.id) continue
    const cash = sale.payments.filter(p => p.method === 'EFECTIVO').reduce((sum, p) => sum + BigInt(p.amountCents), 0n)
    if (cash) { cashSales += cash; saleIds.push(sale.id) }
  }
  for (const expense of expenses) {
    if (expense.businessId !== session.businessId || expense.cashSessionId !== session.id ||
        expense.paymentMethod !== 'EFECTIVO') continue
    cashExpenses += BigInt(expense.amountCents)
    expenseIds.push(expense.id)
  }
  const expected = BigInt(session.openingCashCents) + cashSales - cashExpenses
  if (expected > BigInt(MAX_CASH_CENTS) || cashSales > BigInt(MAX_CASH_CENTS) ||
      cashExpenses > BigInt(MAX_CASH_CENTS) || expected < 0n) {
    throw new Error('El saldo esperado de efectivo está fuera de rango o es negativo. Revisá gastos y movimientos.')
  }
  return {
    cashSalesCents: Number(cashSales), cashExpensesCents: Number(cashExpenses),
    expectedCashCents: Number(expected), saleIds, expenseIds,
  }
}

export function makeCloseSnapshot(
  session: DemoCashSession, sales: CashSale[], expenses: CashExpense[],
  input: CashCloseInput, now: string,
): CashCloseSnapshot {
  if (session.status !== 'ABIERTA' || session.closeSnapshot) throw new Error('La jornada ya está cerrada.')
  const { countedCashCents, notes } = normalizeClose(input)
  const totals = cashSessionTotals(session, sales, expenses)
  const difference = countedCashCents - totals.expectedCashCents
  if (difference !== 0 && notes.length < 2) {
    throw new Error('Explicá la diferencia entre el efectivo esperado y el contado.')
  }
  if (!Number.isFinite(Date.parse(now))) throw new Error('Fecha de cierre inválida.')
  return {
    ...totals, openingCashCents: session.openingCashCents,
    countedCashCents, differenceCents: difference,
    closedBy: 'demo-user', closedAt: now, notes,
  }
}
