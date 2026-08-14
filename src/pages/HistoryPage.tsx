import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { HistoryCalendar } from '../components/HistoryCalendar'
import { RecordCard } from '../components/RecordCard'
import { RecordDetailSheet } from '../components/RecordDetailSheet'
import { useRecords } from '../hooks/useRecords'
import {
  formatDateLabel,
  recordsGroupedForDisplay,
  toDateKey,
} from '../lib/dates'
import { deleteRecord } from '../lib/sync'
import type { FishingRecord } from '../types/record'

function dateFromKey(dateKey: string | null): Date | undefined {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return undefined
  const date = new Date(`${dateKey}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function HistoryPage() {
  const { records, loading, error, reload } = useRecords()
  const [searchParams] = useSearchParams()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() =>
    dateFromKey(searchParams.get('date')),
  )
  const [selectedRecord, setSelectedRecord] = useState<FishingRecord | null>(
    null,
  )

  const recordSections = useMemo(
    () => recordsGroupedForDisplay(records, selectedDate),
    [records, selectedDate],
  )

  const navigableRecords = useMemo(
    () => recordSections.flatMap((section) => section.records),
    [recordSections],
  )

  async function handleDelete(id: string) {
    const index = navigableRecords.findIndex((r) => r.id === id)
    const nextRecord =
      index >= 0
        ? (navigableRecords[index + 1] ?? navigableRecords[index - 1] ?? null)
        : null

    await deleteRecord(id)
    setSelectedRecord((current) =>
      current?.id === id ? nextRecord : current,
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

      <div className="mb-4">
        <HistoryCalendar
          records={records}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </div>

      {selectedDate && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setSelectedDate(undefined)}
            className="text-xs text-cyan-700 underline"
          >
            すべて表示
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {navigableRecords.length > 0 ? (
          <Link
            to={
              selectedDate
                ? `/history/map?date=${toDateKey(selectedDate)}`
                : '/history/map'
            }
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
          >
            マップ表示
          </Link>
        ) : (
          <span className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 opacity-40 shadow-sm">
            マップ表示
          </span>
        )}
      </div>

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
            この日の記録はありません
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
                  onClick={() => setSelectedRecord(record)}
                  className="cursor-pointer rounded-xl border border-sky-100 bg-white px-4 py-3 shadow-sm transition hover:border-sky-200 active:bg-sky-50"
                >
                  <RecordCard
                    record={record}
                    onDelete={(id) => void handleDelete(id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {selectedRecord && (
        <RecordDetailSheet
          record={selectedRecord}
          records={navigableRecords}
          onNavigate={setSelectedRecord}
          onClose={() => setSelectedRecord(null)}
          onDelete={(id) => void handleDelete(id)}
        />
      )}
    </main>
  )
}
