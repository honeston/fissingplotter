import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRecords } from '../hooks/useRecords'
import { useUnitPrefs } from '../hooks/useUnitPrefs'
import { dateFromKey, formatDateLabel } from '../lib/dates'
import {
  buildSpeciesStats,
  sortSpeciesStats,
  type SpeciesSortKey,
  type SpeciesStat,
  type SortDirection,
} from '../lib/fishEncyclopedia'
import { formatFishSize, formatFishWeight } from '../lib/units'
import { JafAttribution } from '../components/JafAttribution'

const SORT_OPTIONS: { key: SpeciesSortKey; label: string }[] = [
  { key: 'count', label: '数' },
  { key: 'species', label: '魚種' },
  { key: 'maxSizeCm', label: '最大サイズ' },
  { key: 'maxWeightG', label: '最大重量' },
]


function formatBestCatchDay(dateKey: string | null, count: number): string {
  if (!dateKey) return '—'
  const date = dateFromKey(dateKey)
  if (!date) return dateKey
  return `${formatDateLabel(date)}（${count}匹）`
}

export function FishEncyclopediaPage() {
  const { records, loading, error } = useRecords()
  const [sortKey, setSortKey] = useState<SpeciesSortKey>('count')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const stats = useMemo(() => {
    const built = buildSpeciesStats(records)
    return sortSpeciesStats(built, sortKey, sortDirection)
  }, [records, sortKey, sortDirection])

  function handleSort(key: SpeciesSortKey) {
    if (key === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection(key === 'species' ? 'asc' : 'desc')
  }

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-cyan-700">cast mark</p>
          <h1 className="mt-1 text-2xl font-semibold text-sky-950">マイ魚種図鑑</h1>
        </div>
        <Link
          to="/mypage"
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
        >
          戻る
        </Link>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {SORT_OPTIONS.map(({ key, label }) => {
          const active = sortKey === key
          const arrow = active ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSort(key)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm ${
                active
                  ? 'border-cyan-600 bg-cyan-50 text-cyan-900'
                  : 'border-sky-200 bg-white text-cyan-800'
              }`}
            >
              {label}
              {arrow}
            </button>
          )
        })}
      </div>

      {loading && <p className="text-sm text-slate-500">読み込み中…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {!loading && !error && stats.length === 0 && (
        <p className="rounded-xl border border-dashed border-sky-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
          魚種付きの記録がまだありません
        </p>
      )}

      {!loading && !error && stats.length > 0 && (
        <ul className="flex flex-col gap-3">
          {stats.map((stat) => (
            <li key={stat.species}>
              <SpeciesStatCard stat={stat} />
            </li>
          ))}
        </ul>
      )}

      <JafAttribution className="mt-auto pt-6" />
    </main>
  )
}

function SpeciesStatCard({ stat }: { stat: SpeciesStat }) {
  const { prefs } = useUnitPrefs()
  return (
    <Link
      to={`/mypage/encyclopedia/${encodeURIComponent(stat.species)}`}
      className="block rounded-xl border border-sky-100 bg-white px-4 py-3 shadow-sm outline-none transition hover:border-sky-200 active:bg-sky-50 focus-visible:ring-2 focus-visible:ring-cyan-200"
    >
      <div className="flex min-h-11 items-center justify-between gap-3">
        <p className="truncate text-base font-medium text-sky-950">{stat.species}</p>
        <p className="shrink-0 text-sm font-semibold text-cyan-800">{stat.count}匹</p>
      </div>

      <dl className="mt-2 space-y-1.5 text-sm text-slate-600">
        <div className="flex items-center justify-between gap-2">
          <dt className="shrink-0">最大サイズ</dt>
          <dd className="font-medium text-sky-950">{formatFishSize(stat.maxSizeCm, prefs.length)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="shrink-0">最大重量</dt>
          <dd className="font-medium text-sky-950">{formatFishWeight(stat.maxWeightG, prefs.weight)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="shrink-0">最大釣果日</dt>
          <dd className="font-medium text-sky-950">
            {formatBestCatchDay(stat.bestCatchDateKey, stat.bestCatchCount)}
          </dd>
        </div>
      </dl>
    </Link>
  )
}
