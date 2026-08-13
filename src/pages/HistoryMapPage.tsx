import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RecordDetailSheet } from '../components/RecordDetailSheet'
import { recordsWithCoordinates } from '../lib/coordinates'
import { sortRecordsNewestFirst } from '../lib/dates'
import { RecordsMap } from '../components/RecordsMap'
import { useRecords } from '../hooks/useRecords'
import { deleteRecord } from '../lib/sync'
import type { FishingRecord } from '../types/record'

export function HistoryMapPage() {
  const { records, loading, error, reload } = useRecords()
  const [selectedRecord, setSelectedRecord] = useState<FishingRecord | null>(
    null,
  )
  const mappableRecords = recordsWithCoordinates(records)
  const navigableRecords = useMemo(
    () => sortRecordsNewestFirst(mappableRecords),
    [mappableRecords],
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
    <main className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-cyan-700">
            Fissing Plotter
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-sky-950">釣果マップ</h1>
        </div>
        <Link
          to="/history"
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
        >
          履歴に戻る
        </Link>
      </header>

      {loading && <p className="text-sm text-slate-500">読み込み中…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {!loading && !error && records.length === 0 && (
        <p className="rounded-xl border border-dashed border-sky-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
          表示する記録がありません
        </p>
      )}

      {!loading && !error && records.length > 0 && mappableRecords.length === 0 && (
        <p className="rounded-xl border border-dashed border-sky-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
          座標付きの記録がありません
        </p>
      )}

      {!loading && !error && mappableRecords.length > 0 && (
        <div className="h-[60dvh] w-full overflow-hidden rounded-xl border border-sky-100 shadow-sm">
          <RecordsMap records={records} onSelectRecord={setSelectedRecord} />
        </div>
      )}

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
