import { useAppData } from '../../data/dataContext'

/** Exact historic values that cannot be represented by the current operational forms. */
export function LegacyRecords() {
  const { mode, snapshot } = useAppData()
  const records = snapshot?.apiLegacyRecords ?? []
  if (mode !== 'api' || records.length === 0) return null
  return <section className="form-panel legacy-records">
    <h2>Histórico de sólo lectura</h2>
    <p>{records.length} registros conservan datos que estos formularios no pueden operar. Se muestran con su precisión original; quedan fuera de los indicadores operativos de esta pantalla.</p>
    {records.map(record => <details key={record.id}>
      <summary>{record.kind} · {record.label} · {record.id}</summary>
      <p>{record.reasons.join(' ')}</p>
      <dl>{record.fields.map((field, index) => <div key={index}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>
    </details>)}
  </section>
}
