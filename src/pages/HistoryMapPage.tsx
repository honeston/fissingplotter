import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { RecordDetailSheet } from '../components/RecordDetailSheet'
import { recordsWithCoordinates } from '../lib/coordinates'
import { RecordsMap } from '../components/RecordsMap'
import { useRecords } from '../hooks/useRecords'
import { filterRecordsByDate, formatDateLabel } from '../lib/dates'
import { deleteRecord } from '../lib/sync'
import type { FishingRecord } from '../types/record'

export function HistoryMapPage() {
  const { records, loading, error, reload } = useRecords()
  const [searchParams] = useSearchParams()
  const dateKey = searchParams.get('date')
  const [selectedRecord, setSelectedRecord] = useState<FishingRecord | null>(
    null,
  )
  const [clusterRecords, setClusterRecords] = useState<FishingRecord[]>([])

  const displayedRecords = useMemo(() => {
    if (!dateKey) return records
    return filterRecordsByDate(records, dateKey)
  }, [records, dateKey])

  const mappableRecords = recordsWithCoordinates(displayedRecords)
  const selectedDate = dateKey ? new Date(`${dateKey}T00:00:00`) : undefined
  const historyBackTo = dateKey ? `/history?date=${dateKey}` : '/history'

  function handleSelectRecords(group: FishingRecord[]) {
    setClusterRecords(group)
    setSelectedRecord(group[0] ?? null)
  }

  function handleClose() {
    setSelectedRecord(null)
    setClusterRecords([])
  }

  async function handleDelete(id: string) {
    const index = clusterRecords.findIndex((r) => r.id === id)
    const remaining = clusterRecords.filter((r) => r.id !== id)
    const nextRecord =
      remaining[Math.min(index, remaining.length - 1)] ?? null

    await deleteRecord(id)
    setClusterRecords(remaining)
    setSelectedRecord((current) =>
      current?.id === id ? nextRecord : current,
    )
    await reload()
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-6">
      <header className="mb-4">
        <p className="text-sm font-medium tracking-wide text-cyan-700">
          Fissing Plotter
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-sky-950">釣果マップ</h1>
        {selectedDate && !Number.isNaN(selectedDate.getTime()) && (
          <p className="mt-1 text-sm text-slate-500">
            {formatDateLabel(selectedDate)}の記録
          </p>
        )}
      </header>

      {loading && <p className="text-sm text-slate-500">読み込み中…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {!loading && !error && displayedRecords.length === 0 && (
        <p className="rounded-xl border border-dashed border-sky-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
          表示する記録がありません
        </p>
      )}

      {!loading &&
        !error &&
        displayedRecords.length > 0 &&
        mappableRecords.length === 0 && (
          <p className="rounded-xl border border-dashed border-sky-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
            座標付きの記録がありません
          </p>
        )}

      {!loading && !error && mappableRecords.length > 0 && (
        <div className="h-[60dvh] w-full overflow-hidden rounded-xl border border-sky-100 shadow-sm">
          <RecordsMap
            records={displayedRecords}
            onSelectRecords={handleSelectRecords}
          />
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <Link
          to={historyBackTo}
          className="rounded-lg border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-cyan-800 shadow-sm"
        >
          履歴に戻る
        </Link>
      </div>

      {selectedRecord && (
        <RecordDetailSheet
          record={selectedRecord}
          records={clusterRecords}
          onNavigate={setSelectedRecord}
          onClose={handleClose}
          onDelete={(id) => void handleDelete(id)}
        />
      )}
    </main>
  )
}
