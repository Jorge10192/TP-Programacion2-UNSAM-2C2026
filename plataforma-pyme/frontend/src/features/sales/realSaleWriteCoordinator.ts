/**
 * E2-7 T10-B2 — explicit, journal-backed sale attempts.
 *
 * NOT wired to a React submit button. P01 role/price policy is still undecided.
 * The only POST path requires explicit caller approval, persisted/re-read
 * original UUID4 and body; never recreates a key when the result is uncertain.
 */
import { ApiHttpError, ApiTransportError, createApiClient } from '../../api/httpClient.ts'
import { UUID_PATTERN, UUID_V4_PATTERN } from '../businesses/businessGateway.ts'
import { createSalesReadGateway, parseSaleReceipt } from './realSalesReadGateway.ts'
import type { SaleReceipt } from './realSalesReadGateway.ts'
import {
  newSalePending, receiptMatchesPending, salePendingJournal, salePendingScope,
  SalePendingConflict,
} from './salePendingJournal.ts'
import type { SalePending } from './salePendingJournal.ts'

export type SaleJournal = Pick<typeof salePendingJournal, 'load' | 'reserve' | 'closeConfirmed'>
export type ConfirmedSale = { state: 'confirmed'; receipt: SaleReceipt; journalCleared: boolean }
export type SaleRecovery =
  | { state: 'none' }
  | { state: 'not-found'; pending: SalePending }
  | ConfirmedSale

export function createSaleWriteCoordinator(
  token: string,
  actorId: string,
  businessId: string,
  journal: SaleJournal = salePendingJournal,
  fetchImpl?: typeof fetch,
) {
  if (!token || !UUID_PATTERN.test(actorId) || !UUID_PATTERN.test(businessId))
    throw new TypeError('Se necesitan sesión, actor y empresa REAL válidos.')
  const scope = salePendingScope(actorId, businessId)
  const api = createApiClient({ getAccessToken: () => token, fetchImpl })
  const reader = createSalesReadGateway(token, businessId, fetchImpl)

  async function complete(pending: SalePending, receipt: SaleReceipt): Promise<ConfirmedSale> {
    if (!receiptMatchesPending(pending, receipt)) throw new SalePendingConflict()
    try {
      await journal.closeConfirmed(scope, pending.key, receipt)
      return { state: 'confirmed', receipt, journalCleared: true }
    } catch {
      // Sale IS confirmed in PostgreSQL. Do not turn it into "not confirmed"
      // merely because local IndexedDB cleanup failed; keep original for GET.
      return { state: 'confirmed', receipt, journalCleared: false }
    }
  }

  return {
    async pending(): Promise<SalePending | null> {
      return journal.load(scope)
    },

    async prepare(body: unknown, key?: string): Promise<SalePending> {
      const pending = newSalePending(actorId, businessId, body, key)
      return journal.reserve(pending)
    },

    /** GET-only; HTTP 404 is ambiguous and NEVER deletes the original command. */
    async recover(signal?: AbortSignal): Promise<SaleRecovery> {
      const pending = await journal.load(scope)
      if (!pending) return { state: 'none' }
      try {
        const receipt = await reader.byRequest(pending.key, signal)
        return complete(pending, receipt)
      } catch (error) {
        if (error instanceof ApiHttpError && error.status === 404)
          return { state: 'not-found', pending }
        throw error
      }
    },

    /**
     * UI must display its own explicit final review before calling.
     * Same key/body is safe for an explicit user-requested replay, not an
     * automatic retry. Do not call this method from useEffect or after F5.
     */
    async sendApproved(key: string, explicitlyConfirmed: true,
                       signal?: AbortSignal): Promise<ConfirmedSale> {
      if (explicitlyConfirmed !== true) throw new SalePendingConflict()
      if (!UUID_V4_PATTERN.test(key)) throw new TypeError('Solicitud UUID4 inválida.')
      // Read back and re-reserve. If IndexedDB is unavailable, DO NOT POST.
      const pending = await journal.load(scope)
      if (!pending || pending.key !== key) throw new SalePendingConflict()
      const saved = await journal.reserve(pending)
      if (saved.key !== key || saved.actorId !== actorId ||
        saved.businessId !== businessId) throw new SalePendingConflict()
      let raw: unknown
      try {
        raw = await api.request<unknown>(
          '/businesses/' + businessId + '/sales',
          { method: 'POST', body: saved.body, idempotencyKey: saved.key, signal },
        )
      } catch (error) {
        // If HTTP status is known (401/403/404/409/422), preserve it verbatim.
        // On network/timeout/abort, outcomeUnknown=true from shared API client.
        // In either case NEVER erase the pending command or generate a new key.
        throw error
      }
      let receipt: SaleReceipt
      try {
        receipt = parseSaleReceipt(raw, businessId)
      } catch {
        // A successful POST with malformed JSON may have committed in DB.
        throw new ApiTransportError('invalid-response', true)
      }
      return complete(saved, receipt)
    },
  }
}
