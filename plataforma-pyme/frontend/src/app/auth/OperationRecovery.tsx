import { useEffect, useRef } from 'react'
import type { RecoveryOperation } from '../../data/api/apiGateway'

export function OperationRecovery({ operation }: { operation: RecoveryOperation }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close() }, [])
  return <dialog ref={dialog} className="session-dialog" onCancel={event => event.preventDefault()} aria-labelledby="recovery-title">
    <section className="form-panel session-panel"><h2 id="recovery-title">Comprobar operación</h2>
      <p role="status">{operation.message}</p>
      <p>El formulario conserva sus valores. Al recargar esta página se pierde el envío pendiente; comprobá el historial antes de registrar otra operación.</p>
      <button type="button" className="button button-primary" disabled={operation.busy} onClick={operation.retry}>{operation.busy ? 'Comprobando…' : 'Comprobar y continuar'}</button>
    </section>
  </dialog>
}
