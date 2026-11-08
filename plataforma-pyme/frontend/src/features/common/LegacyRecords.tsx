import { useAppData } from '../../data/dataContext'

/** Exact historic values that cannot be represented by the current operational forms. */
export function LegacyRecords() {
  const { mode, snapshot } = useAppData()
  const records = snapshot?.apiLegacyRecords ?? []
  if (mode !== 'api') return null
  return <>
    <div className="page-heading"><div><h1>Registros anteriores</h1><p>Datos conservados para consulta. No modifican el stock ni la caja actuales.</p></div></div>
    <section className="form-panel legacy-records" aria-label="Archivo de registros anteriores">
    <p className="cash-quiet">{records.length ? records.length + ' registros · Sólo lectura' : 'No hay registros anteriores.'}</p>
    {records.map(record => <details className="legacy-record" key={record.id}>
      <summary>{record.kind} · {record.label}</summary>
      <dl>{record.fields.map((field, index) => <div key={index}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>
      <details className="legacy-technical"><summary>Detalles técnicos</summary>
        <p>Identificador: <code>{record.id}</code></p><p>{record.reasons.join(' ')}</p>
      </details>
    </details>)}
    </section>
  </>
}
