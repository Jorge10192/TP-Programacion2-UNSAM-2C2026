import type { QrIntent } from './qrIntentGateway.ts'

export type QrStatus = QrIntent['status']
export type QrStatusPresentation = {
  title: string
  description: string
  tone: 'pending' | 'success' | 'warning' | 'neutral'
  nextStep: string
}
const LABELS: Record<QrStatus, QrStatusPresentation> = {
  ESPERANDO_PAGO: {
    title: 'Pendiente de simulación', tone: 'pending',
    description: 'El código de prueba está generado, pero todavía no se registró ninguna aprobación.',
    nextStep: 'Simulá el resultado en el laboratorio autorizado o cancelá este intento.',
  },
  APROBADA_DEMO: {
    title: 'Aprobado en laboratorio', tone: 'pending',
    description: 'El laboratorio indicó una aprobación ficticia. Todavía no hay venta ni débito de inventario.',
    nextStep: 'Si trabajás en una base QA descartable, registrá la venta de prueba.',
  },
  FINALIZADA: {
    title: 'Venta QA confirmada', tone: 'success',
    description: 'La venta interna fue confirmada junto con su comprobante y los movimientos de stock que correspondan.',
    nextStep: 'Consultá el comprobante. Esta operación no acredita dinero de Mercado Pago.',
  },
  REQUIERE_REVISION: {
    title: 'Requiere revisión', tone: 'warning',
    description: 'La aprobación ficticia no pudo convertirse en una venta interna. No se descontó stock parcialmente.',
    nextStep: 'Revisá catálogo, sede y disponibilidad; no vuelvas a generar una venta desde este mismo QR.',
  },
  INDETERMINADA: {
    title: 'Resultado incierto', tone: 'warning',
    description: 'El laboratorio no dispone todavía de un resultado definitivo.',
    nextStep: 'Consultá estado y eventos antes de volver a simular.',
  },
  RECHAZADA: {
    title: 'Rechazado en laboratorio', tone: 'neutral',
    description: 'La simulación terminó rechazada. No se creó una venta.',
    nextStep: 'Para otra operación creá un nuevo QR desde el POS.',
  },
  CANCELADA: {
    title: 'QR cancelado', tone: 'neutral',
    description: 'El intento fue cancelado. No se creó una venta.',
    nextStep: 'Para otra operación creá un nuevo QR desde el POS.',
  },
  EXPIRADA: {
    title: 'QR vencido', tone: 'neutral',
    description: 'El plazo para este QR DEMO terminó sin una aprobación válida.',
    nextStep: 'Para otra operación creá un nuevo QR desde el POS.',
  },
}
export function qrStatusPresentation(status: QrStatus): QrStatusPresentation {
  return LABELS[status]
}
export function qrEffectiveStatus(status: QrStatus, expiresAt: string, now: number): QrStatus {
  return status === 'ESPERANDO_PAGO' && new Date(expiresAt).getTime() <= now ? 'EXPIRADA' : status
}
export function qrNeedsRecovery(status: QrStatus): boolean {
  return status === 'INDETERMINADA' || status === 'REQUIERE_REVISION'
}
