import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { RecordCard } from '../components/RecordCard'
import { RecordDetailSheet } from '../components/RecordDetailSheet'
import { SpeciesCatchPatternSection } from '../components/SpeciesCatchPattern'
import { useRecords } from '../hooks/useRecords'
import { useUnitPrefs } from '../hooks/useUnitPrefs'
import { dateFromKey, formatDateLabel, groupRecordsByDate, recordDateKey } from '../lib/dates'
import { buildSpeciesStats, findSpeciesStat } from '../lib/fishEncyclopedia'
import {
  buildSpeciesCatchPattern,
  conditionFilterQuery,
  findConditionBucket,
  parseConditionFilter,
  recordsMatchingFilter,
  type SpeciesConditionFilter,
} from '../lib/speciesCatchStats'
import { formatFishSize, formatFishWeight } from '../lib/units'
import { deleteRecord } from '../lib/sync'
import type { FishingRecord } from '../types/record'
import { JafAttribution } from '../components/JafAttribution'


function formatBestCatchDay(dateKey: string | null, count: number): string {
  if (!dateKey) return '—'
  const date = dateFromKey(dateKey)
  if (!date) return dateKey
  return `${formatDateLabel(date)}（${count}匹）`
}

export function FishEncyclopediaSpeciesPage() {
  const { prefs } = useUnitPrefs()
  const { species: speciesParam } = useParams<{ species: string }>()
  const species = speciesParam ? decodeURIComponent(speciesParam) : ''
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightDateKey = searchParams.get('date')
  const highlightRecordId = searchParams.get('record')
  const { records, loading, error, reload } = useRecords()
  const [selectedRecord, setSelectedRecord] = useState<FishingRecord | null>(null)
  const [sheetRecords, setSheetRecords] = useState<FishingRecord[]>([])
  const [statusMessage, setStatusMessage] = useState('')
  const highlightTargetRef = useRef<HTMLElement | null>(null)

  function setHighlightTarget(node: HTMLElement | null) {
    highlightTargetRef.current = node
  }

  useEffect(() => {
    if (!statusMessage) return
    const timer = window.setTimeout(() => setStatusMessage(''), 2500)
    return () => window.clearTimeout(timer)
  }, [statusMessage])

  const stats = useMemo(() => buildSpeciesStats(records), [records])
  const speciesStat = useMemo(
    () => (species ? findSpeciesStat(stats, species) : undefined),
    [stats, species],
  )
  const catchPattern = useMemo(
    () => (speciesStat ? buildSpeciesCatchPattern(speciesStat.records) : null),
    [speciesStat],
  )
  const conditionFilter = useMemo(() => parseConditionFilter(searchParams), [searchParams])
  const visibleRecords = useMemo(() => {
    if (!speciesStat || !catchPattern) return []
    if (!conditionFilter) return speciesStat.records
    return recordsMatchingFilter(catchPattern, conditionFilter)
  }, [speciesStat, conditionFilter, catchPattern])
  const filterLabel = useMemo(() => {
    if (!conditionFilter || !catchPattern) return null
    return findConditionBucket(catchPattern, conditionFilter)?.label ?? null
  }, [conditionFilter, catchPattern])

  const daySections = useMemo(
    () => groupRecordsByDate(visibleRecords),
    [visibleRecords],
  )

  const resolvedHighlightDateKey = useMemo(() => {
    if (highlightDateKey) return highlightDateKey
    if (!highlightRecordId) return null
    const record = visibleRecords.find((item) => item.id === highlightRecordId)
    return record ? recordDateKey(record) : null
  }, [highlightDateKey, highlightRecordId, visibleRecords])

  useEffect(() => {
    if ((!highlightDateKey && !highlightRecordId) || loading || !speciesStat) return
    const el = highlightTargetRef.current
    if (!el) return
    const timer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    return () => window.clearTimeout(timer)
  }, [highlightDateKey, highlightRecordId, loading, speciesStat, daySections])

  function applyConditionFilter(next: SpeciesConditionFilter | null) {
    if (!next) {
      setSearchParams({}, { replace: true })
      return
    }
    setSearchParams(conditionFilterQuery(next), { replace: true })
  }

  function scrollToDate(dateKey: string) {
    setSearchParams({ date: dateKey }, { replace: true })
  }

  function scrollToRecord(record: FishingRecord) {
    setSearchParams({ record: record.id }, { replace: true })
  }

  function openRecord(record: FishingRecord) {
    setSheetRecords(visibleRecords)
    setSelectedRecord(record)
  }

  function handleCloseSheet() {
    setSelectedRecord(null)
    setSheetRecords([])
  }

  async function handleDelete(id: string) {
    const index = sheetRecords.findIndex((r) => r.id === id)
    const remaining = sheetRecords.filter((r) => r.id !== id)
    const nextRecord = remaining[Math.min(index, remaining.length - 1)] ?? null

    await deleteRecord(id)
    setSheetRecords(remaining)
    setSelectedRecord((current) => (current?.id === id ? nextRecord : current))
    setStatusMessage('削除しました')
    await reload()
  }

  async function handleUpdated(updated: FishingRecord) {
    setSelectedRecord(updated)
    setSheetRecords((list) => list.map((item) => (item.id === updated.id ? updated : item)))
    await reload()
  }

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-wide text-cyan-700">cast mark</p>
          <h1 className="mt-1 truncate text-2xl font-semibold text-sky-950">
            {species || '魚種詳細'}
          </h1>
        </div>
        <Link
          to="/mypage/encyclopedia"
          className="shrink-0 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
        >
          戻る
        </Link>
      </header>

      {statusMessage && (
        <p
          className="fixed left-1/2 top-4 z-[80] w-[min(100%-2rem,28rem)] -translate-x-1/2 rounded-lg border border-sky-200 bg-white px-4 py-2.5 text-center text-sm text-sky-900 shadow-lg"
          role="status"
        >
          {statusMessage}
        </p>
      )}

      {loading && <p className="text-sm text-slate-500">読み込み中…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {!loading && !error && !speciesStat && (
        <div className="rounded-xl border border-dashed border-sky-200 bg-white/70 px-4 py-8 text-center">
          <p className="text-sm text-slate-500">この魚種の記録はありません</p>
          <Link
            to="/mypage/encyclopedia"
            className="mt-3 inline-block text-sm font-medium text-cyan-800 underline"
          >
            図鑑一覧へ戻る
          </Link>
        </div>
      )}

      {!loading && !error && speciesStat && (
        <>
          <section className="mb-6 rounded-xl border border-sky-200 bg-white px-4 py-3 shadow-sm">
            <h2 className="text-sm font-medium text-sky-900">集計</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">魚種</dt>
                <dd className="mt-0.5 font-medium text-sky-950">{speciesStat.species}</dd>
              </div>
              <div>
                <dt className="text-slate-500">匹数</dt>
                <dd className="mt-0.5 font-medium text-sky-950">{speciesStat.count}匹</dd>
              </div>
              <div>
                <dt className="text-slate-500">最大サイズ</dt>
                <dd className="mt-0.5">
                  {speciesStat.maxSizeRecord ? (
                    <button
                      type="button"
                      onClick={() => scrollToRecord(speciesStat.maxSizeRecord!)}
                      className="font-medium text-cyan-800 underline decoration-cyan-200 underline-offset-2"
                    >
                      {formatFishSize(speciesStat.maxSizeCm, prefs.length)}
                    </button>
                  ) : (
                    <span className="font-medium text-sky-950">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">最大重量</dt>
                <dd className="mt-0.5">
                  {speciesStat.maxWeightRecord ? (
                    <button
                      type="button"
                      onClick={() => scrollToRecord(speciesStat.maxWeightRecord!)}
                      className="font-medium text-cyan-800 underline decoration-cyan-200 underline-offset-2"
                    >
                      {formatFishWeight(speciesStat.maxWeightG, prefs.weight)}
                    </button>
                  ) : (
                    <span className="font-medium text-sky-950">—</span>
                  )}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500">最大釣果日</dt>
                <dd className="mt-0.5">
                  {speciesStat.bestCatchDateKey ? (
                    <button
                      type="button"
                      onClick={() => scrollToDate(speciesStat.bestCatchDateKey!)}
                      className="font-medium text-cyan-800 underline decoration-cyan-200 underline-offset-2"
                    >
                      {formatBestCatchDay(
                        speciesStat.bestCatchDateKey,
                        speciesStat.bestCatchCount,
                      )}
                    </button>
                  ) : (
                    <span className="font-medium text-sky-950">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {catchPattern && (
            <SpeciesCatchPatternSection
              pattern={catchPattern}
              filter={conditionFilter}
              onSelect={applyConditionFilter}
              onClear={() => applyConditionFilter(null)}
            />
          )}

          <h2 className="mb-3 text-sm font-medium text-sky-900">
            {filterLabel ? `記録一覧（${filterLabel}）` : '記録一覧'}
          </h2>
          {visibleRecords.length === 0 ? (
            <div className="rounded-xl border border-dashed border-sky-200 bg-white/70 px-4 py-8 text-center">
              <p className="text-sm text-slate-500">この条件の記録はありません</p>
              {conditionFilter && (
                <button
                  type="button"
                  onClick={() => applyConditionFilter(null)}
                  className="mt-3 text-sm font-medium text-cyan-800 underline"
                >
                  解除
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {daySections.map(({ dateKey, date, records: dayRecords }) => {
                const isDayHighlight =
                  resolvedHighlightDateKey === dateKey && !highlightRecordId
                return (
                  <section
                    key={dateKey}
                    ref={isDayHighlight ? setHighlightTarget : undefined}
                    className={
                      isDayHighlight
                        ? 'scroll-mt-4 rounded-xl border border-cyan-300 bg-cyan-50/60 px-3 py-3'
                        : undefined
                    }
                  >
                    <p className="mb-3 text-base font-semibold text-sky-950">
                      {formatDateLabel(date)}の記録（{dayRecords.length}件）
                      {isDayHighlight && (
                        <span className="ml-2 text-sm font-medium text-cyan-800">
                          最大釣果日
                        </span>
                      )}
                    </p>
                    <ul className="flex flex-col gap-3">
                      {dayRecords.map((record) => {
                        const isRecordHighlight = highlightRecordId === record.id
                        return (
                          <li
                            key={record.id}
                            ref={isRecordHighlight ? setHighlightTarget : undefined}
                            onClick={() => openRecord(record)}
                            className={`cursor-pointer rounded-xl border bg-white px-4 py-3 shadow-sm transition scroll-mt-4 ${
                              isRecordHighlight
                                ? 'border-cyan-400 ring-2 ring-cyan-200'
                                : 'border-sky-100 hover:border-sky-200 active:bg-sky-50'
                            }`}
                          >
                            <RecordCard record={record} />
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )
              })}
            </div>
          )}
        </>
      )}

      <JafAttribution className="mt-auto pt-6" />

      {selectedRecord && (
        <RecordDetailSheet
          record={selectedRecord}
          records={sheetRecords}
          onNavigate={setSelectedRecord}
          onClose={handleCloseSheet}
          onDelete={(id) => void handleDelete(id)}
          onUpdated={(updated) => void handleUpdated(updated)}
        />
      )}
    </main>
  )
}
