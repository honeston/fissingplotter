import { Camera, CloudSun, MapPin, Save, Waves } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { RecordStepErrors, RecordSteps, StepState } from '../hooks/useRecord'
import { Icon } from './ui/Icon'

const labels: { key: keyof RecordSteps; label: string; icon: LucideIcon }[] = [
  { key: 'geo', label: '位置', icon: MapPin },
  { key: 'weather', label: '天気', icon: CloudSun },
  { key: 'tide', label: '潮位', icon: Waves },
  { key: 'save', label: '保存', icon: Save },
  { key: 'photo', label: '写真', icon: Camera },
]

function statusText(state: StepState) {
  switch (state) {
    case 'pending':
      return '…'
    case 'ok':
      return '✓'
    case 'error':
      return '×'
    case 'skipped':
      return '—'
    default:
      return '·'
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
      <ul className="flex flex-wrap gap-3">
        {labels.map(({ key, label, icon }) => (
          <li
            key={key}
            className="flex items-center gap-1.5 text-sm"
            title={errors[key] ? `${label}: ${errors[key]}` : label}
          >
            <Icon icon={icon} size="sm" className="text-slate-400" />
            <span className={`tabular-nums ${statusClass(steps[key])}`}>
              {statusText(steps[key])}
            </span>
            {errors[key] ? (
              <span className="sr-only">{errors[key]}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
