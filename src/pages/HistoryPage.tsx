import { Calendar, FishSymbol, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { DateRange } from 'react-day-picker'
import { HistoryCalendar } from '../components/HistoryCalendar'
import { RecordCard } from '../components/RecordCard'
import { RecordDetailSheet } from '../components/RecordDetailSheet'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { PageHeader } from '../components/ui/PageHeader'
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
      <PageHeader
        title="履歴"
        icon={Calendar}
        action={
          <Link
            to="/"
            aria-label="記録"
            data-testid="header-record"
            className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-sky-200 bg-white text-cyan-800 shadow-sm"
          >
            <Icon icon={FishSymbol} size="sm" label="記録" />
          </Link>
        }
      />

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
      </div>

      {normalizedRange && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm text-sky-900">
            {formatDateRangeLabel(normalizedRange.from, normalizedRange.to)}
            <span className="ml-1 rounded-full bg-cyan-100 px-2 py-0.5 text-xs tabular-nums text-cyan-900">
              {navigableRecords.length}
            </span>
          </p>
          <button
            type="button"
            onClick={() => setSelectedRange(undefined)}
            aria-label="期間を解除"
            className="flex size-8 items-center justify-center rounded-lg text-cyan-700 hover:bg-sky-50"
          >
            <Icon icon={X} size="sm" label="期間を解除" />
          </button>
        </div>
      )}

      <div className="mb-6 h-[40dvh] w-full overflow-hidden rounded-xl border border-sky-100 shadow-sm">
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
      {loading && <p className="text-sm text-slate-500">読み込み中…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {!loading && !error && records.length === 0 && (
        <EmptyState icon={FishSymbol} message="まだ記録がありません" testId="empty-records" />
      )}

      {!loading &&
        !error &&
        records.length > 0 &&
        recordSections.length === 0 && (
          <EmptyState
            icon={Calendar}
            message={
              normalizedRange ? 'この期間の記録はありません' : 'この日の記録はありません'
            }
          />
        )}

      <div className="flex flex-col gap-6">
        {recordSections.map(({ dateKey, date, records: dayRecords }) => (
          <section key={dateKey}>
            <div className="mb-3 flex items-center gap-2">
              <p className="text-base font-semibold text-sky-950">{formatDateLabel(date)}</p>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs tabular-nums text-sky-800">
                {dayRecords.length}
              </span>
            </div>
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
