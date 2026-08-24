import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { DateRange } from 'react-day-picker'
import { HistoryCalendar } from '../components/HistoryCalendar'
import { RecordCard } from '../components/RecordCard'
import { RecordDetailSheet } from '../components/RecordDetailSheet'
import { useRecords } from '../hooks/useRecords'
import {
  dateFromKey,
  formatDateLabel,
  formatDateRangeLabel,
  normalizeDateRange,
  recordsGroupedForDisplay,
} from '../lib/dates'
import { deleteRecord } from '../lib/sync'
import type { FishingRecord } from '../types/record'

const RecordsMap = lazy(() =>
  import('../components/RecordsMap').then((m) => ({ default: m.RecordsMap })),
)

function dateRangeFromSearchParams(
  params: URLSearchParams,
): DateRange | undefined {
  const fromKey = params.get('from')
  const toKey = params.get('to')
  if (fromKey) {
    const from = dateFromKey(fromKey)
    const to = dateFromKey(toKey ?? fromKey)
    if (from && to) return { from, to }
    return undefined
  }
  const dateKey = params.get('date')
  if (dateKey) {
    const date = dateFromKey(dateKey)
    if (date) return { from: date, to: date }
  }
  return undefined
}

export function HistoryPage() {
  const { records, loading, error, reload } = useRecords()
  const [searchParams] = useSearchParams()
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(() =>
    dateRangeFromSearchParams(searchParams),
  )
  const [selectedRecord, setSelectedRecord] = useState<FishingRecord | null>(
    null,
  )
  const [sheetRecords, setSheetRecords] = useState<FishingRecord[]>([])
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    if (!statusMessage) return
    const timer = window.setTimeout(() => setStatusMessage(''), 2500)
    return () => window.clearTimeout(timer)
  }, [statusMessage])

  const normalizedRange = useMemo(
    () => normalizeDateRange(selectedRange),
    [selectedRange],
  )

  const recordSections = useMemo(
    () => recordsGroupedForDisplay(records, selectedRange),
    [records, selectedRange],
  )

  const navigableRecords = useMemo(
    () => recordSections.flatMap((section) => section.records),
    [recordSections],
  )

  function openRecord(record: FishingRecord, context: FishingRecord[]) {
    setSheetRecords(context)
    setSelectedRecord(record)
  }

  function handleCloseSheet() {
    setSelectedRecord(null)
    setSheetRecords([])
  }

  function handleMapSelectRecords(group: FishingRecord[]) {
    const first = group[0]
    if (first) openRecord(first, group)
  }

  async function handleDelete(id: string) {
    const index = sheetRecords.findIndex((r) => r.id === id)
    const remaining = sheetRecords.filter((r) => r.id !== id)
    const nextRecord =
      remaining[Math.min(index, remaining.length - 1)] ?? null

    await deleteRecord(id)
    setSheetRecords(remaining)
    setSelectedRecord((current) =>
      current?.id === id ? nextRecord : current,
    )
    setStatusMessage('削除しました')
    await reload()
  }

  async function handleUpdated(updated: FishingRecord) {
    setSelectedRecord(updated)
    setSheetRecords((list) =>
      list.map((item) => (item.id === updated.id ? updated : item)),
    )
    await reload()
  }

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-cyan-700">
            Fissing Plotter
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-sky-950">履歴</h1>
        </div>
        <Link
          to="/"
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
        >
          記録
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
      <div className="mb-4">
        <HistoryCalendar
          records={records}
          selectedRange={selectedRange}
          onSelectRange={setSelectedRange}
        />
        <p className="mt-2 text-center text-xs text-slate-500">
          開始日と終了日をタップして期間を指定
        </p>
      </div>

      {normalizedRange && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm text-sky-900">
            {formatDateRangeLabel(normalizedRange.from, normalizedRange.to)}
            <span className="ml-1 text-slate-500">
              （{navigableRecords.length}件）
            </span>
          </p>
          <button
            type="button"
            onClick={() => setSelectedRange(undefined)}
            className="shrink-0 text-xs text-cyan-700 underline"
          >
            期間を解除
          </button>
        </div>
      )}

      <div className="mb-3 h-[40dvh] w-full overflow-hidden rounded-xl border border-sky-100 shadow-sm">
        <Suspense
          fallback={
            <div className="h-full w-full rounded-xl bg-sky-50" aria-hidden />
          }
        >
          <RecordsMap
            records={navigableRecords}
            onSelectRecords={handleMapSelectRecords}
          />
        </Suspense>
      </div>
      <Link
        to="/mypage/encyclopedia"
        className="mb-6 flex min-h-11 items-center justify-center rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm font-medium text-cyan-800 shadow-sm"
      >
        マイ魚種図鑑
      </Link>

      {loading && <p className="text-sm text-slate-500">読み込み中…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {!loading && !error && records.length === 0 && (
        <p className="rounded-xl border border-dashed border-sky-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
          まだ記録がありません
        </p>
      )}

      {!loading &&
        !error &&
        records.length > 0 &&
        recordSections.length === 0 && (
          <p className="rounded-xl border border-dashed border-sky-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
            {normalizedRange
              ? 'この期間の記録はありません'
              : 'この日の記録はありません'}
          </p>
        )}

      <div className="flex flex-col gap-6">
        {recordSections.map(({ dateKey, date, records: dayRecords }) => (
          <section key={dateKey}>
            <p className="mb-3 text-base font-semibold text-sky-950">
              {formatDateLabel(date)}の記録（{dayRecords.length}件）
            </p>
            <ul className="flex flex-col gap-3">
              {dayRecords.map((record) => (
                <li
                  key={record.id}
                  onClick={() => openRecord(record, navigableRecords)}
                  className="cursor-pointer rounded-xl border border-sky-100 bg-white px-4 py-3 shadow-sm transition hover:border-sky-200 active:bg-sky-50"
                >
                  <RecordCard record={record} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

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
