import { createApiClient } from '../../api/httpClient.ts'
import { UUID_PATTERN } from '../businesses/businessGateway.ts'

export type DemoPaymentConnection = {
  business_id: string
  provider: 'MERCADO_PAGO'
  mode: 'DEMO'
  status: 'NO_VINCULADA' | 'ACTIVA' | 'INACTIVA'
  mock_merchant_name: string | null
  mock_merchant_ref: string | null
  updated_at: string | null
}

function parse(value: unknown, businessId: string): DemoPaymentConnection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Respuesta incompatible')
  const r = value as Record<string, unknown>
  if (r.business_id !== businessId || r.provider !== 'MERCADO_PAGO' || r.mode !== 'DEMO'
    || !['NO_VINCULADA', 'ACTIVA', 'INACTIVA'].includes(String(r.status))
    || !(r.mock_merchant_name === null || typeof r.mock_merchant_name === 'string')
    || !(r.mock_merchant_ref === null || typeof r.mock_merchant_ref === 'string')
    || !(r.updated_at === null || typeof r.updated_at === 'string')) {
    throw new Error('Respuesta incompatible')
  }
  return r as DemoPaymentConnection
}

export function createPaymentConnectionGateway(token: string, businessId: string) {
  if (!token || !UUID_PATTERN.test(businessId)) throw new TypeError('Sesión o empresa inválida')
  const api = createApiClient({ getAccessToken: () => token })
  const path = '/businesses/' + businessId + '/payment-connections/mercadopago'
  return {
    async get(signal?: AbortSignal) { return parse(await api.request<unknown>(path, { signal }), businessId) },
    async connect() { return parse(await api.request<unknown>(path + '/demo', { method: 'POST' }), businessId) },
    async disconnect() { return parse(await api.request<unknown>(path + '/demo', { method: 'DELETE' }), businessId) },
  }
}
