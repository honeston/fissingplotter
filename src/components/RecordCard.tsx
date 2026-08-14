import { hasCoordinates } from '../lib/coordinates'
import { formatSunLine, formatTideLine, formatWeatherLine } from '../lib/formatRecord'
import { mapsUrl } from '../lib/maps'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import { RecordValueList } from './RecordValueList'
import type { FishingRecord } from '../types/record'

interface RecordCardProps {
  record: FishingRecord
  onDelete?: (id: string) => void
  showLargePhoto?: boolean
}

export function RecordCard({ record, onDelete, showLargePhoto }: RecordCardProps) {
  const photoUrl = usePhotoUrl(record)

  if (showLargePhoto) {
    return (
      <div>
        <div className="mb-3 flex h-64 items-center justify-center overflow-hidden rounded-xl border border-sky-200 bg-sky-50">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={record.fishSpecies ?? '釣果写真'}
              draggable={false}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm text-slate-400">写真なし</span>
          )}
        </div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">
              {new Date(record.recordedAt).toLocaleString('ja-JP')}
            </p>
            <RecordValueList record={record} />
          </div>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(record.id)
              }}
              className="shrink-0 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              削除
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 gap-3">
        {photoUrl && (
          <img
            src={photoUrl}
            alt={record.fishSpecies ?? '釣果写真'}
            className="h-12 w-12 shrink-0 rounded-lg border border-sky-200 object-cover"
          />
        )}
        <RecordDetails record={record} />
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(record.id)
          }}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
        >
          削除
        </button>
      )}
    </div>
  )
}

function RecordDetails({ record }: { record: FishingRecord }) {
  const sunLine = formatSunLine(record)

  return (
    <div className="min-w-0">
      <p className="font-medium text-sky-950">
        {record.fishSpecies ?? '（魚種なし）'}
        {record.fishSizeCm != null ? (
          <span className="ml-2 text-sm font-normal text-slate-600">{record.fishSizeCm}cm</span>
        ) : null}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {new Date(record.recordedAt).toLocaleString('ja-JP')}
      </p>
      <p className="mt-1 text-xs text-slate-500">{formatWeatherLine(record)}</p>
      {sunLine !== '—' && (
        <p className="mt-0.5 text-xs text-slate-500">{sunLine}</p>
      )}
      <p className="mt-0.5 text-xs text-slate-500">{formatTideLine(record)}</p>
      <a
        href={
          hasCoordinates(record)
            ? mapsUrl(record.latitude, record.longitude)
            : undefined
        }
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-1 inline-block text-xs text-cyan-700 ${hasCoordinates(record) ? 'underline' : 'text-slate-400 no-underline'}`}
        onClick={(e) => {
          if (!hasCoordinates(record)) {
            e.preventDefault()
            return
          }
          e.stopPropagation()
        }}
      >
        {hasCoordinates(record)
          ? (record.locationName ??
            `${record.latitude.toFixed(5)}, ${record.longitude.toFixed(5)}`)
          : (record.locationName ?? '座標なし')}
      </a>
    </div>
  )
}
