import { mapsUrl } from '../lib/maps'
import type { FishingRecord } from '../types/record'

interface RecordCardProps {
  record: FishingRecord
  onDelete?: (id: string) => void
}

export function RecordCard({ record, onDelete }: RecordCardProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="font-medium text-sky-950">
          {record.fishSpecies ?? '（魚種なし）'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {new Date(record.recordedAt).toLocaleString('ja-JP')}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          気温 {record.temperature != null ? `${record.temperature}℃` : '—'}
          {' / '}
          潮位 {record.tideLevel != null ? `${record.tideLevel}cm` : '—'}
          {record.tideHarbor ? `（${record.tideHarbor}）` : ''}
        </p>
        <a
          href={mapsUrl(record.latitude, record.longitude)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-xs text-cyan-700 underline"
        >
          {record.latitude.toFixed(5)}, {record.longitude.toFixed(5)}
        </a>
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(record.id)}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
        >
          削除
        </button>
      )}
    </div>
  )
}
