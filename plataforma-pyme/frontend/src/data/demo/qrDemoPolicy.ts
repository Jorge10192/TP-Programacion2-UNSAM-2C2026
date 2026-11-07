/**
 * E1-D1 — Intención visual QR (no escaneable, sin API financiera).
 * No representa pago verificado. No crea una Sale hasta la simulación explícita.
 */
import { normalizeSaleInput, saleAmounts } from './salePolicy.ts'
import type { SaleInput } from './salePolicy.ts'

export type QrDemoStatus = 'PENDIENTE' | 'SIMULADO_APROBADO' | 'CANCELADO'
export type QrIntent = {
  id: string
  requestId: string
  saleRequestId: string
  businessId: string
  input: SaleInput
  amountCents: number
  status: QrDemoStatus
  saleId: string | null
  createdAt: string
  updatedAt: string
}

export const qrStatusLabels: Record<QrDemoStatus, string> = {
  PENDIENTE: 'Pendiente (sin cobro)',
  SIMULADO_APROBADO: 'Aprobado SIMULADO (sin dinero real)',
  CANCELADO: 'Cancelado',
}

export function normalizeQrSaleInput(input: SaleInput): SaleInput {
  const normalized = normalizeSaleInput(input)
  if (normalized.payments.length !== 1 || normalized.payments[0].method !== 'MERCADO_PAGO_DECLARADO') {
    throw new Error('Para el QR DEMO seleccioná un único medio Mercado Pago declarado por el total.')
  }
  return normalized
}

/** Recuperación defensiva del almacenamiento local; no confundir con una prueba de acreditación. */
export function validQrDemoIntent(value: unknown): value is QrIntent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const raw = value as Record<string, unknown>
  if (typeof raw.id !== 'string' || !/^demo-qr-intent-[a-f0-9-]{36}$/.test(raw.id) ||
      typeof raw.requestId !== 'string' || !/^demo-qr-request-[a-f0-9-]{36}$/.test(raw.requestId) ||
      typeof raw.saleRequestId !== 'string' || !/^demo-sale-request-[a-f0-9-]{36}$/.test(raw.saleRequestId) ||
      typeof raw.businessId !== 'string' || !raw.businessId ||
      (raw.status !== 'PENDIENTE' && raw.status !== 'SIMULADO_APROBADO' && raw.status !== 'CANCELADO') ||
      typeof raw.createdAt !== 'string' || !Number.isFinite(Date.parse(raw.createdAt)) ||
      typeof raw.updatedAt !== 'string' || !Number.isFinite(Date.parse(raw.updatedAt)) ||
      (raw.saleId !== null && (typeof raw.saleId !== 'string' ||
       !/^demo-sale-[a-f0-9-]{36}$/.test(raw.saleId))) ||
      (raw.status === 'SIMULADO_APROBADO' && raw.saleId === null) ||
      (raw.status !== 'SIMULADO_APROBADO' && raw.saleId !== null)) return false
  try {
    const input = normalizeQrSaleInput(raw.input as SaleInput)
    return saleAmounts(input.lines, input.discountCents).totalCents === raw.amountCents
  } catch { return false }
}

/** Patrón gráfico ilustrativo, NO QR utilizable ni enlace de cobro. */
export function demoQrVisualCells(identifier: string): { x: number; y: number }[] {
  let seed = 2166136261
  for (const char of identifier) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0
  const cells: { x: number; y: number }[] = []
  const finders = [[1, 1], [21, 1], [1, 21]]
  for (let y = 0; y < 29; y++) {
    for (let x = 0; x < 29; x++) {
      const finder = finders.find(([fx, fy]) => x >= fx-1 && x <= fx+7 && y >= fy-1 && y <= fy+7)
      let filled = false
      if (finder) {
        const [fx, fy] = finder
        const dx = x - fx, dy = y - fy
        filled = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6 &&
          (dx === 0 || dx === 6 || dy === 0 || dy === 6 ||
           (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4))
      } else {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0
        filled = (seed & 7) < 4
      }
      if (filled) cells.push({ x, y })
    }
  }
  return cells
}
