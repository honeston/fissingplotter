import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Icon } from './ui/Icon'
import {
  CATCH_AXIS_LABELS,
  findConditionBucket,
  type CatchAxis,
  type CatchBucket,
  type SpeciesCatchPattern,
  type SpeciesConditionFilter,
} from '../lib/speciesCatchStats'

const DAY_COUNT_AXES = new Set(['place', 'lure', 'rig'])

function bucketCaption(axis: CatchAxis, bucket: CatchBucket): string {
  if (DAY_COUNT_AXES.has(axis.id) && bucket.count > 0) {
    return `${bucket.count}匹 · ${bucket.dayCount}日`
  }
  return `${bucket.count}匹`
}

function CatchBar({
  axis,
  bucket,
  maxCount,
  selected,
  onSelect,
}: {
  axis: CatchAxis
  bucket: CatchBucket
  maxCount: number
  selected: boolean
  onSelect: (filter: SpeciesConditionFilter) => void
}) {
  const ratio = maxCount > 0 ? bucket.count / maxCount : 0
  const caption = bucketCaption(axis, bucket)
  const label = `${bucket.label} ${caption}`
  const fill = (
    <div className="mt-1 h-2 overflow-hidden rounded-full bg-sky-50">
      <span
        className={`block h-2 rounded-full ${
          selected ? 'bg-cyan-600' : bucket.count > 0 ? 'bg-cyan-400' : 'bg-sky-100'
        }`}
        style={{ width: `${bucket.count > 0 ? Math.max(ratio * 100, 6) : 0}%` }}
      />
    </div>
  )

  if (bucket.count <= 0) {
    return (
      <div className="px-2 py-1.5" aria-label={label}>
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="min-w-0 truncate text-slate-400">{bucket.label}</span>
          <span className="shrink-0 tabular-nums text-slate-400">{caption}</span>
        </div>
        {fill}
      </div>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={() => onSelect({ axis: axis.id, key: bucket.key })}
      className={`w-full rounded-lg px-2 py-1.5 text-left transition ${
        selected ? 'bg-cyan-50 ring-1 ring-cyan-200' : 'hover:bg-sky-50'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-medium text-sky-950">{bucket.label}</span>
        <span className="shrink-0 tabular-nums text-slate-600">{caption}</span>
      </div>
      {fill}
    </button>
  )
}

export function SpeciesCatchPatternSection({
  pattern,
  filter,
  onSelect,
  onClear,
}: {
  pattern: SpeciesCatchPattern
  filter: SpeciesConditionFilter | null
  onSelect: (next: SpeciesConditionFilter) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)

  if (pattern.axes.length === 0) return null

  const selectedBucket = filter ? findConditionBucket(pattern, filter) : null
  const filterLabel = selectedBucket?.label ?? (filter ? CATCH_AXIS_LABELS[filter.axis] : null)

  function handleSelect(next: SpeciesConditionFilter) {
    if (filter && filter.axis === next.axis && filter.key === next.key) {
      onClear()
      return
    }
    onSelect(next)
  }

  return (
    <section
      className="mb-6 rounded-xl border border-sky-200 bg-white px-4 py-3 shadow-sm"
      data-testid="catch-pattern"
      aria-label="よく釣れている条件"
    >
      <h2>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="catch-pattern-body"
          aria-label="よく釣れている条件を開く"
          className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-sky-900"
        >
          よく釣れている条件
          <Icon icon={open ? ChevronUp : ChevronDown} size="sm" className="text-cyan-800" />
        </button>
      </h2>

      {filterLabel && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2">
          <p className="min-w-0 truncate text-sm text-cyan-900">{filterLabel}で絞り込み中</p>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-sm font-medium text-cyan-800 underline decoration-cyan-200 underline-offset-2"
          >
            解除
          </button>
        </div>
      )}

      {open && (
        <div id="catch-pattern-body">
          <p className="mt-1 text-xs text-slate-500">
            釣れたときの内訳です。釣れなかった記録は含みません。
          </p>

          {pattern.summary && (
            <div className="mt-3" data-testid="catch-summary">
              <p className="text-sm font-medium text-sky-950">{pattern.summary.labels.join(' · ')}</p>
              <p className="mt-0.5 text-xs text-slate-600">{pattern.summary.headline}</p>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-4">
            {pattern.axes.map((axis) => {
              const maxCount = Math.max(0, ...axis.buckets.map((bucket) => bucket.count))
              return (
                <div key={axis.id} data-testid={`catch-axis-${axis.id}`}>
                  <h3 className="text-xs font-medium text-slate-500">{axis.label}</h3>
                  <div className="mt-1">
                    {axis.buckets.map((bucket) => (
                      <CatchBar
                        key={bucket.key}
                        axis={axis}
                        bucket={bucket}
                        maxCount={maxCount}
                        selected={filter?.axis === axis.id && filter.key === bucket.key}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
