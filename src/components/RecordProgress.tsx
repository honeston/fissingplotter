import type { RecordStepErrors, RecordSteps, StepState } from '../hooks/useRecord'

const labels: { key: keyof RecordSteps; label: string }[] = [
  { key: 'geo', label: '座標' },
  { key: 'weather', label: '気温' },
  { key: 'tide', label: '潮位' },
  { key: 'save', label: '保存' },
  { key: 'photo', label: '写真' },
]

function statusText(state: StepState) {
  switch (state) {
    case 'pending':
      return '取得中…'
    case 'ok':
      return '完了'
    case 'error':
      return '失敗'
    case 'skipped':
      return '—'
    default:
      return '待機'
  }
}

function statusClass(state: StepState) {
  switch (state) {
    case 'pending':
      return 'text-amber-700'
    case 'ok':
      return 'text-cyan-800'
    case 'error':
      return 'text-red-600'
    case 'skipped':
      return 'text-slate-300'
    default:
      return 'text-slate-400'
  }
}

export function RecordProgress({
  steps,
  errors,
}: {
  steps: RecordSteps
  errors: RecordStepErrors
}) {
  const active = Object.values(steps).some((s) => s !== 'idle')
  if (!active) return null

  return (
    <section className="mb-4 rounded-xl border border-sky-100 bg-white/90 px-4 py-3">
      <h2 className="mb-2 text-sm font-semibold text-sky-950">取得状況</h2>
      <ul className="space-y-1.5">
        {labels.map(({ key, label }) => (
          <li key={key} className="flex items-start justify-between gap-3 text-sm">
            <span className="text-slate-600">{label}</span>
            <span className={`text-right ${statusClass(steps[key])}`}>
              {statusText(steps[key])}
              {errors[key] ? (
                <span className="mt-0.5 block text-xs font-normal text-red-600">
                  {errors[key]}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
