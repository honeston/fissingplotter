import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HistoryCalendar } from '../components/HistoryCalendar'
import { RecordCard } from '../components/RecordCard'
import { useRecords } from '../hooks/useRecords'
import {
  filterRecordsByDate,
  formatDateLabel,
  toDateKey,
} from '../lib/dates'
import { deleteRecord, exportRecordsJson } from '../lib/sync'

export function HistoryPage() {
  const { records, loading, error, reload } = useRecords()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()

  const displayedRecords = useMemo(() => {
    if (!selectedDate) return records
    return filterRecordsByDate(records, toDateKey(selectedDate))
  }, [records, selectedDate])

  async function handleDelete(id: string) {
    await deleteRecord(id)
    await reload()
  }

  async function handleExport() {
    const json = await exportRecordsJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fissing-records-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
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

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={records.length === 0}
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm disabled:opacity-40"
        >
          JSON エクスポート
        </button>
        {records.length > 0 ? (
          <Link
            to="/history/map"
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

      <div className="mb-4">
        <HistoryCalendar
          records={records}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </div>

      {selectedDate && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-sky-900">
            {formatDateLabel(selectedDate)}の記録（{displayedRecords.length}件）
          </p>
          <button
            type="button"
            onClick={() => setSelectedDate(undefined)}
            className="text-xs text-cyan-700 underline"
          >
            すべて表示
          </button>
        </div>
      )}

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
        displayedRecords.length === 0 && (
          <p className="rounded-xl border border-dashed border-sky-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
            この日の記録はありません
          </p>
        )}

      <ul className="flex flex-col gap-3">
        {displayedRecords.map((record) => (
          <li
            key={record.id}
            className="rounded-xl border border-sky-100 bg-white px-4 py-3 shadow-sm"
          >
            <RecordCard
              record={record}
              onDelete={(id) => void handleDelete(id)}
            />
          </li>
        ))}
      </ul>
    </main>
  )
}
