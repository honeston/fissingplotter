import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Icon } from './ui/Icon'
import {
  CATCH_AXIS_LABELS,
  findConditionBucket,
  type CatchAxis,
  type CatchBucket,
  type CatchAxisId,
  type SpeciesCatchPattern,
  type SpeciesConditionFilter,
} from '../lib/speciesCatchStats'

const DAY_COUNT_AXES = new Set<CatchAxisId>(['place', 'lure', 'rig'])
const COLUMN_AXES = new Set<CatchAxisId>(['slot'])
const PIE_AXES = new Set<CatchAxisId>(['tide'])
const SEGMENT_AXES = new Set<CatchAxisId>(['cycle'])
const SEGMENT_FILLS = ['bg-cyan-400', 'bg-sky-400', 'bg-teal-400', 'bg-cyan-300', 'bg-sky-300'] as const
const SHORT_LABELS: Record<string, string> = {
  dawn: '朝',
  day: '日中',
  dusk: '夕',
  night: '夜',
  up: '上げ',
  down: '下げ',
  flat: '横ばい',
}
const PIE_FILLS = ['fill-cyan-500', 'fill-sky-400', 'fill-teal-400'] as const
const PIE_DOTS = ['bg-cyan-500', 'bg-sky-400', 'bg-teal-400'] as const
const PIE_CX = 44
const PIE_CY = 44
const PIE_R_OUTER = 40
const PIE_R_INNER = 23

function bucketCaption(axis: CatchAxis, bucket: CatchBucket): string {
  if (DAY_COUNT_AXES.has(axis.id) && bucket.count > 0) {
    return `${bucket.count}匹·${bucket.dayCount}日`
  }
  return `${bucket.count}匹`
}

function bucketName(axis: CatchAxis, bucket: CatchBucket): string {
  return `${bucket.label} ${bucketCaption(axis, bucket)}`
}

function isSelected(
  filter: SpeciesConditionFilter | null,
  axis: CatchAxis,
  bucket: CatchBucket,
): boolean {
  return filter?.axis === axis.id && filter.key === bucket.key
}

function polar(cx: number, cy: number, r: number, angle: number): string {
  return `${cx + r * Math.cos(angle)} ${cy + r * Math.sin(angle)}`
}

function donutSlicePath(startRatio: number, endRatio: number): string {
  const tau = Math.PI * 2
  const start = startRatio * tau - Math.PI / 2
  const end = endRatio * tau - Math.PI / 2
  const large = endRatio - startRatio > 0.5 ? 1 : 0
  return [
    `M ${polar(PIE_CX, PIE_CY, PIE_R_OUTER, start)}`,
    `A ${PIE_R_OUTER} ${PIE_R_OUTER} 0 ${large} 1 ${polar(PIE_CX, PIE_CY, PIE_R_OUTER, end)}`,
    `L ${polar(PIE_CX, PIE_CY, PIE_R_INNER, end)}`,
    `A ${PIE_R_INNER} ${PIE_R_INNER} 0 ${large} 0 ${polar(PIE_CX, PIE_CY, PIE_R_INNER, start)}`,
    'Z',
  ].join(' ')
}

function fullDonutPath(): string {
  return [
    `M ${PIE_CX} ${PIE_CY - PIE_R_OUTER}`,
    `A ${PIE_R_OUTER} ${PIE_R_OUTER} 0 1 1 ${PIE_CX} ${PIE_CY + PIE_R_OUTER}`,
    `A ${PIE_R_OUTER} ${PIE_R_OUTER} 0 1 1 ${PIE_CX} ${PIE_CY - PIE_R_OUTER}`,
    `M ${PIE_CX} ${PIE_CY - PIE_R_INNER}`,
    `A ${PIE_R_INNER} ${PIE_R_INNER} 0 1 0 ${PIE_CX} ${PIE_CY + PIE_R_INNER}`,
    `A ${PIE_R_INNER} ${PIE_R_INNER} 0 1 0 ${PIE_CX} ${PIE_CY - PIE_R_INNER}`,
  ].join(' ')
}

function AxisFrame({
  axis,
  className = '',
  children,
}: {
  axis: CatchAxis
  className?: string
  children: ReactNode
}) {
  return (
    <div data-testid={`catch-axis-${axis.id}`} className={className}>
      <h3 className="text-[11px] font-medium text-slate-500">{axis.label}</h3>
      <div className="mt-1">{children}</div>
    </div>
  )
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
  const label = bucketName(axis, bucket)
  const row = (
    <>
      <span
        className={`min-w-0 max-w-[42%] shrink-0 truncate text-xs ${
          bucket.count > 0 ? 'font-medium text-sky-950' : 'text-slate-400'
        }`}
      >
        {bucket.label}
      </span>
      <div className="h-1.5 min-w-[2.5rem] flex-1 overflow-hidden rounded-full bg-sky-50">
        <span
          className={`block h-1.5 rounded-full ${
            selected ? 'bg-cyan-600' : bucket.count > 0 ? 'bg-cyan-400' : 'bg-sky-100'
          }`}
          style={{ width: `${bucket.count > 0 ? Math.max(ratio * 100, 8) : 0}%` }}
        />
      </div>
      <span
        className={`w-[4.25rem] shrink-0 text-right text-xs tabular-nums ${
          bucket.count > 0 ? 'text-slate-600' : 'text-slate-400'
        }`}
      >
        {caption}
      </span>
    </>
  )

  if (bucket.count <= 0) {
    return (
      <div className="flex items-center gap-2 py-0.5" aria-label={label}>
        {row}
      </div>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={() => onSelect({ axis: axis.id, key: bucket.key })}
      className={`flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left transition ${
        selected ? 'bg-cyan-50 ring-1 ring-cyan-200' : 'hover:bg-sky-50'
      }`}
    >
      {row}
    </button>
  )
}

function CatchColumnChart({
  axis,
  filter,
  onSelect,
}: {
  axis: CatchAxis
  filter: SpeciesConditionFilter | null
  onSelect: (filter: SpeciesConditionFilter) => void
}) {
  const maxCount = Math.max(0, ...axis.buckets.map((bucket) => bucket.count))
  const barMaxH = 44

  return (
    <AxisFrame axis={axis}>
      <div className="flex h-[4.5rem] items-end justify-between gap-0.5">
        {axis.buckets.map((bucket) => {
          const selected = isSelected(filter, axis, bucket)
          const height =
            maxCount > 0 && bucket.count > 0
              ? Math.max((bucket.count / maxCount) * barMaxH, 8)
              : 3
          const short = SHORT_LABELS[bucket.key] ?? bucket.label
          const label = bucketName(axis, bucket)
          const column = (
            <>
              <span
                className={`h-3 text-[10px] leading-none tabular-nums ${
                  bucket.count > 0 ? 'text-sky-950' : 'text-slate-400'
                }`}
              >
                {bucket.count}
              </span>
              <span className="flex h-11 w-full items-end">
                <span
                  className={`block w-full rounded-t ${
                    selected ? 'bg-cyan-600' : bucket.count > 0 ? 'bg-cyan-400' : 'bg-sky-100'
                  }`}
                  style={{ height }}
                />
              </span>
              <span
                className={`mt-0.5 w-full truncate text-center text-[10px] leading-tight ${
                  bucket.count > 0 ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {short}
              </span>
            </>
          )

          if (bucket.count <= 0) {
            return (
              <div key={bucket.key} className="flex min-w-0 flex-1 flex-col items-center" aria-label={label}>
                {column}
              </div>
            )
          }

          return (
            <button
              key={bucket.key}
              type="button"
              aria-pressed={selected}
              aria-label={label}
              onClick={() => onSelect({ axis: axis.id, key: bucket.key })}
              className={`flex min-w-0 flex-1 flex-col items-center rounded-md px-0.5 pt-0.5 transition ${
                selected ? 'bg-cyan-50 ring-1 ring-cyan-200' : 'hover:bg-sky-50'
              }`}
            >
              {column}
            </button>
          )
        })}
      </div>
    </AxisFrame>
  )
}

function CatchPieChart({
  axis,
  filter,
  onSelect,
}: {
  axis: CatchAxis
  filter: SpeciesConditionFilter | null
  onSelect: (filter: SpeciesConditionFilter) => void
}) {
  const total = axis.knownCount
  const slices: { bucket: CatchBucket; start: number; end: number; index: number }[] = []
  let cursor = 0
  axis.buckets.forEach((bucket, index) => {
    if (bucket.count <= 0 || total <= 0) return
    const start = cursor / total
    cursor += bucket.count
    slices.push({ bucket, start, end: cursor / total, index })
  })
  const top = [...axis.buckets].sort((a, b) => b.count - a.count)[0]
  const holeLabel = top && top.count > 0 ? (SHORT_LABELS[top.key] ?? top.label) : ''
  const holeCount = top && top.count > 0 ? String(top.count) : String(total)

  return (
    <AxisFrame axis={axis}>
      <div className="flex items-center gap-2">
        <div className="relative size-[4.5rem] shrink-0">
          <svg viewBox="0 0 88 88" className="size-[4.5rem]" aria-hidden>
            {slices.length === 1 ? (
              <path
                d={fullDonutPath()}
                fillRule="evenodd"
                className={`cursor-pointer ${
                  isSelected(filter, axis, slices[0].bucket) ? 'fill-cyan-700' : PIE_FILLS[slices[0].index]
                }`}
                onClick={() => onSelect({ axis: axis.id, key: slices[0].bucket.key })}
              />
            ) : (
              slices.map((slice) => (
                <path
                  key={slice.bucket.key}
                  d={donutSlicePath(slice.start, slice.end)}
                  className={`cursor-pointer ${
                    isSelected(filter, axis, slice.bucket) ? 'fill-cyan-700' : PIE_FILLS[slice.index]
                  }`}
                  onClick={() => onSelect({ axis: axis.id, key: slice.bucket.key })}
                />
              ))
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-semibold leading-none tabular-nums text-sky-950">{holeCount}</span>
            <span className="mt-0.5 max-w-[2.6rem] truncate text-[10px] leading-tight text-slate-500">
              {holeLabel}
            </span>
          </div>
        </div>
        <ul className="flex min-w-0 flex-1 flex-col gap-0.5">
            {axis.buckets.map((bucket, index) => {
              const selected = isSelected(filter, axis, bucket)
              const label = bucketName(axis, bucket)
              const row = (
                <>
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${
                      bucket.count > 0 ? PIE_DOTS[index] : 'bg-sky-100'
                    }`}
                  />
                  <span className="min-w-0 truncate">{SHORT_LABELS[bucket.key] ?? bucket.label}</span>
                  <span className="ml-auto tabular-nums">{bucket.count}</span>
                </>
              )
              if (bucket.count <= 0) {
                return (
                  <li
                    key={bucket.key}
                    className="flex items-center gap-1 text-[10px] text-slate-400"
                    aria-label={label}
                  >
                    {row}
                  </li>
                )
              }
              return (
                <li key={bucket.key}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={label}
                    onClick={() => onSelect({ axis: axis.id, key: bucket.key })}
                    className={`flex w-full items-center gap-1 rounded px-0.5 text-left text-[10px] transition ${
                      selected
                        ? 'bg-cyan-50 font-medium text-cyan-900 ring-1 ring-cyan-200'
                        : 'text-slate-600 hover:bg-sky-50'
                    }`}
                  >
                    {row}
                  </button>
                </li>
              )
            })}
          </ul>
      </div>
    </AxisFrame>
  )
}

function CatchSegmentChart({
  axis,
  filter,
  onSelect,
}: {
  axis: CatchAxis
  filter: SpeciesConditionFilter | null
  onSelect: (filter: SpeciesConditionFilter) => void
}) {
  const filled = axis.buckets.filter((bucket) => bucket.count > 0)
  return (
    <AxisFrame axis={axis}>
      <div className="flex h-8 overflow-hidden rounded-md bg-sky-50">
        {filled.map((bucket, index) => {
          const selected = isSelected(filter, axis, bucket)
          const short = SHORT_LABELS[bucket.key] ?? bucket.label
          return (
            <button
              key={bucket.key}
              type="button"
              aria-pressed={selected}
              aria-label={bucketName(axis, bucket)}
              onClick={() => onSelect({ axis: axis.id, key: bucket.key })}
              style={{ flexGrow: bucket.count, flexBasis: 0 }}
              className={`flex min-w-0 items-center justify-center gap-0.5 px-1 text-[10px] leading-none transition ${
                selected ? 'bg-cyan-700 text-white' : `${SEGMENT_FILLS[index % SEGMENT_FILLS.length]} text-sky-950`
              }`}
            >
              <span className="truncate font-medium">{short}</span>
              <span className="tabular-nums">{bucket.count}</span>
            </button>
          )
        })}
      </div>
    </AxisFrame>
  )
}

function CatchRankList({
  axis,
  filter,
  onSelect,
}: {
  axis: CatchAxis
  filter: SpeciesConditionFilter | null
  onSelect: (filter: SpeciesConditionFilter) => void
}) {
  const maxCount = Math.max(0, ...axis.buckets.map((bucket) => bucket.count))
  return (
    <AxisFrame axis={axis}>
      {axis.buckets.map((bucket) => (
        <CatchBar
          key={bucket.key}
          axis={axis}
          bucket={bucket}
          maxCount={maxCount}
          selected={isSelected(filter, axis, bucket)}
          onSelect={onSelect}
        />
      ))}
    </AxisFrame>
  )
}

function compactColSpan(axes: CatchAxis[], axis: CatchAxis): string {
  if (axes.length === 1) return 'col-span-2'
  if (SEGMENT_AXES.has(axis.id) && axes.length > 2) return 'col-span-2'
  return ''
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
  const compactAxes = pattern.axes.filter(
    (axis) => COLUMN_AXES.has(axis.id) || PIE_AXES.has(axis.id) || SEGMENT_AXES.has(axis.id),
  )
  const placeAxis = pattern.axes.find((axis) => axis.id === 'place')
  const lureAxis = pattern.axes.find((axis) => axis.id === 'lure')
  const rigAxis = pattern.axes.find((axis) => axis.id === 'rig')
  const tackleAxes = [lureAxis, rigAxis].filter((axis): axis is CatchAxis => axis != null)

  function handleSelect(next: SpeciesConditionFilter) {
    if (filter && filter.axis === next.axis && filter.key === next.key) {
      onClear()
      return
    }
    onSelect(next)
  }

  function renderCompact(axis: CatchAxis) {
    const className = compactColSpan(compactAxes, axis)
    if (PIE_AXES.has(axis.id)) {
      return (
        <div key={axis.id} className={className}>
          <CatchPieChart axis={axis} filter={filter} onSelect={handleSelect} />
        </div>
      )
    }
    if (SEGMENT_AXES.has(axis.id)) {
      return (
        <div key={axis.id} className={className}>
          <CatchSegmentChart axis={axis} filter={filter} onSelect={handleSelect} />
        </div>
      )
    }
    return (
      <div key={axis.id} className={className}>
        <CatchColumnChart axis={axis} filter={filter} onSelect={handleSelect} />
      </div>
    )
  }

  return (
    <section
      className="mb-4 rounded-xl border border-sky-200 bg-white px-3 py-2 shadow-sm"
      data-testid="catch-pattern"
      aria-label="よく釣れている条件"
    >
      <div className="flex items-start gap-2">
        <h2 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls="catch-pattern-body"
            aria-label={open ? 'よく釣れている条件を閉じる' : 'よく釣れている条件を開く'}
            className="flex w-full items-start justify-between gap-2 text-left"
          >
            <span className="min-w-0">
              <span className="text-sm font-medium text-sky-900">よく釣れている条件</span>
              {!open && pattern.summary && (
                <span className="mt-0.5 block truncate text-xs font-normal text-slate-500">
                  {pattern.summary.labels.join(' · ')}
                </span>
              )}
              {filterLabel && (
                <span className="mt-0.5 block truncate text-xs font-normal text-cyan-800">
                  {filterLabel}で絞り込み中
                </span>
              )}
            </span>
            <Icon icon={open ? ChevronUp : ChevronDown} size="sm" className="shrink-0 text-cyan-800" />
          </button>
        </h2>
        {filterLabel && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 pt-0.5 text-xs font-medium text-cyan-800 underline decoration-cyan-200 underline-offset-2"
          >
            解除
          </button>
        )}
      </div>

      {open && (
        <div id="catch-pattern-body" className="mt-2 border-t border-sky-100 pt-2">
          <p className="text-[11px] leading-snug text-slate-500">
            釣れたときの内訳です。釣れなかった記録は含みません。
          </p>

          {pattern.summary && (
            <div className="mt-1.5" data-testid="catch-summary">
              <p className="text-xs font-medium text-sky-950">{pattern.summary.labels.join(' · ')}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-600">{pattern.summary.headline}</p>
            </div>
          )}

          <div className="mt-2 flex flex-col gap-2.5">
            {compactAxes.length > 0 && (
              <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">{compactAxes.map(renderCompact)}</div>
            )}
            {placeAxis && <CatchRankList axis={placeAxis} filter={filter} onSelect={handleSelect} />}
            {tackleAxes.length > 0 && (
              <div className={`grid gap-x-3 gap-y-2 ${tackleAxes.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {tackleAxes.map((axis) => (
                  <CatchRankList key={axis.id} axis={axis} filter={filter} onSelect={handleSelect} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
