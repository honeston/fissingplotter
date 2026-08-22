import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { RecordDetailSheet } from '../components/RecordDetailSheet'
import { recordsWithCoordinates } from '../lib/coordinates'
import { RecordsMap } from '../components/RecordsMap'
import { useRecords } from '../hooks/useRecords'
import {
  dateFromKey,
  filterRecordsByDate,
  filterRecordsByDateRange,
  formatDateRangeLabel,
  normalizeDateRange,
} from '../lib/dates'
import { deleteRecord } from '../lib/sync'
import type { FishingRecord } from '../types/record'

export function HistoryMapPage() {
  const { records, loading, error, reload } = useRecords()
  const [searchParams] = useSearchParams()
  const fromKey = searchParams.get('from')
  const toKey = searchParams.get('to')
  const dateKey = searchParams.get('date')
  const [selectedRecord, setSelectedRecord] = useState<FishingRecord | null>(
    null,
  )
  const [clusterRecords, setClusterRecords] = useState<FishingRecord[]>([])
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    if (!statusMessage) return
    const timer = window.setTimeout(() => setStatusMessage(''), 2500)
    return () => window.clearTimeout(timer)
  }, [statusMessage])

  const displayedRecords = useMemo(() => {
    if (fromKey) {
      return filterRecordsByDateRange(records, fromKey, toKey ?? fromKey)
    }
    if (dateKey) {
      return filterRecordsByDate(records, dateKey)
    }
    return records
  }, [records, fromKey, toKey, dateKey])

  const mappableRecords = recordsWithCoordinates(displayedRecords)
  const selectedRange = useMemo(() => {
    if (fromKey) {
      const from = dateFromKey(fromKey)
      const to = dateFromKey(toKey ?? fromKey)
      if (from && to) return normalizeDateRange({ from, to })
    }
    if (dateKey) {
      const date = dateFromKey(dateKey)
      if (date) return normalizeDateRange({ from: date, to: date })
    }
    return undefined
  }, [fromKey, toKey, dateKey])

  const historyBackTo = useMemo(() => {
    if (fromKey) {
      const to = toKey ?? fromKey
      if (fromKey === to) return `/history?date=${fromKey}`
      return `/history?from=${fromKey}&to=${to}`
    }
    if (dateKey) return `/history?date=${dateKey}`
    return '/history'
  }, [fromKey, toKey, dateKey])

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
    setStatusMessage('削除しました')
    await reload()
  }

  async function handleUpdated(updated: FishingRecord) {
    setSelectedRecord(updated)
    setClusterRecords((list) =>
      list.map((item) => (item.id === updated.id ? updated : item)),
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
        {selectedRange && (
          <p className="mt-1 text-sm text-slate-500">
            {formatDateRangeLabel(selectedRange.from, selectedRange.to)}の記録
          </p>
        )}
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
          onUpdated={(updated) => void handleUpdated(updated)}
        />
      )}
    </main>
  )
}
