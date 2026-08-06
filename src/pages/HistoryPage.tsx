import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteRecord,
  exportRecordsJson,
  getAllRecords,
} from '../lib/storage'
import type { FishingRecord } from '../types/record'

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

export function HistoryPage() {
  const [records, setRecords] = useState<FishingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function reload() {
    setLoading(true)
    setError('')
    try {
      setRecords(await getAllRecords())
    } catch (err) {
      setError(err instanceof Error ? err.message : '読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

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
          <p className="text-sm font-medium tracking-wide text-cyan-700">Fissing Plotter</p>
          <h1 className="mt-1 text-2xl font-semibold text-sky-950">履歴</h1>
        </div>
        <Link
          to="/"
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
        >
          記録
        </Link>
      </header>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={records.length === 0}
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm disabled:opacity-40"
        >
          JSON エクスポート
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">読み込み中…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {!loading && !error && records.length === 0 && (
        <p className="rounded-xl border border-dashed border-sky-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
          まだ記録がありません
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {records.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-sky-100 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sky-950">
                  {r.fishSpecies ?? '（魚種なし）'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(r.recordedAt).toLocaleString('ja-JP')}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  気温 {r.temperature != null ? `${r.temperature}℃` : '—'}
                  {' / '}
                  潮位 {r.tideLevel != null ? `${r.tideLevel}cm` : '—'}
                  {r.tideHarbor ? `（${r.tideHarbor}）` : ''}
                </p>
                <a
                  href={mapsUrl(r.latitude, r.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-cyan-700 underline"
                >
                  {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                </a>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(r.id)}
                className="shrink-0 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                削除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
