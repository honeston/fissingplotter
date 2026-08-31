import { useEffect, useState } from 'react'
import { hasCoordinates } from '../lib/coordinates'
import { hasEditedField } from '../lib/editedFields'
import { formatSunLine, formatTideLine, formatWeatherLine } from '../lib/formatRecord'
import { mapsUrl } from '../lib/maps'
import { formatFishSize, formatFishWeight } from '../lib/units'
import { saveImageToDevice } from '../lib/saveImageToDevice'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import { useUnitPrefs } from '../hooks/useUnitPrefs'
import { PhotoLightbox } from './PhotoLightbox'
import { EditedMark, RecordValueList } from './RecordValueList'
import type { FishingRecord } from '../types/record'

interface RecordCardProps {
  record: FishingRecord
  onDelete?: (id: string) => void
  showLargePhoto?: boolean
}

export function RecordCard({ record, onDelete, showLargePhoto }: RecordCardProps) {
  const { url: photoUrl, loading: photoLoading } = usePhotoUrl(record)
  const { prefs } = useUnitPrefs()
  const [savingPhoto, setSavingPhoto] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    setLightboxOpen(false)
  }, [record.id])

  async function handleSavePhoto() {
    if (!photoUrl) return
    setSaveError('')
    setSavingPhoto(true)
    try {
      await saveImageToDevice(photoUrl)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '端末への保存に失敗しました')
    } finally {
      setSavingPhoto(false)
    }
  }

  if (showLargePhoto) {
    return (
      <div>
        <div className="relative mb-3 flex h-64 items-center justify-center overflow-hidden rounded-xl border border-sky-200 bg-sky-50">
          <PhotoFrame
            url={photoUrl}
            loading={photoLoading}
            alt={record.fishSpecies ?? '釣果写真'}
            onOpen={() => setLightboxOpen(true)}
          />
        </div>
        {lightboxOpen && photoUrl && (
          <PhotoLightbox
            src={photoUrl}
            alt={record.fishSpecies ?? '釣果写真'}
            onClose={() => setLightboxOpen(false)}
          />
        )}
        {photoUrl && !photoLoading && (
          <div className="mb-3">
            <button
              type="button"
              disabled={savingPhoto}
              onClick={(e) => {
                e.stopPropagation()
                void handleSavePhoto()
              }}
              className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-cyan-800 hover:bg-sky-50 disabled:opacity-60"
            >
              {savingPhoto ? '保存中…' : '保存'}
            </button>
            {saveError && (
              <p className="mt-1.5 text-sm text-red-600" role="alert">
                {saveError}
              </p>
            )}
          </div>
        )}
        <RecordValueList record={record} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {photoUrl && (
            <img
              src={photoUrl}
              alt={record.fishSpecies ?? '釣果写真'}
              className="h-12 w-12 shrink-0 rounded-lg border border-sky-200 object-cover"
            />
          )}
          <p className="min-w-0">
            <span
              className={`block text-sm tabular-nums text-sky-950 ${
                hasEditedField(record, 'recordedAt') ? 'font-bold' : 'font-medium'
              }`}
            >
              {new Date(record.recordedAt).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
              {hasEditedField(record, 'recordedAt') ? <EditedMark /> : null}
            </span>
            <span className="mt-0.5 block font-medium text-sky-950">
              {record.fishSpecies ?? '（魚種なし）'}
              {record.fishSizeCm != null ? (
                <span className="ml-2 text-sm font-normal text-slate-600">
                  {formatFishSize(record.fishSizeCm, prefs.length)}
                </span>
              ) : null}
              {record.fishWeightG != null ? (
                <span className="ml-2 text-sm font-normal text-slate-600">
                  {formatFishWeight(record.fishWeightG, prefs.weight)}
                </span>
              ) : null}
            </span>
          </p>
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (!window.confirm('この記録を削除しますか？')) return
              onDelete(record.id)
            }}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            削除
          </button>
        )}
      </div>
      <RecordDetails record={record} />
    </div>
  )
}

function RecordDetails({ record }: { record: FishingRecord }) {
  const sunLine = formatSunLine(record)
  const locationEdited = hasEditedField(record, 'location')

  return (
    <div className="mt-1 min-w-0">
      <p className="mt-1 whitespace-nowrap text-xs text-slate-500">
        {formatWeatherLine(record)}
      </p>
      {sunLine !== '—' && (
        <p className="mt-0.5 whitespace-nowrap text-xs text-slate-500">{sunLine}</p>
      )}
      <p className="mt-0.5 whitespace-nowrap text-xs text-slate-500">
        {formatTideLine(record)}
      </p>
      <a
        href={
          hasCoordinates(record)
            ? mapsUrl(record.latitude, record.longitude)
            : undefined
        }
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-1 inline-block whitespace-nowrap text-xs ${
          locationEdited
            ? 'font-bold text-sky-950'
            : hasCoordinates(record)
              ? 'text-cyan-700 underline'
              : 'text-slate-400 no-underline'
        }`}
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
        {locationEdited ? <EditedMark /> : null}
      </a>
    </div>
  )
}

export function LoadingSpinner({
  label = '読み込み中',
  className = 'h-8 w-8',
}: {
  label?: string
  className?: string
}) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-sky-200 border-t-cyan-700 ${className}`}
      role="status"
      aria-label={label}
    />
  )
}

function PhotoFrame({
  url,
  loading,
  alt,
  onOpen,
}: {
  url: string | null
  loading: boolean
  alt: string
  onOpen?: () => void
}) {
  const [imageReady, setImageReady] = useState(false)

  useEffect(() => {
    setImageReady(false)
  }, [url])

  const showSpinner = loading || Boolean(url && !imageReady)

  return (
    <>
      {showSpinner && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-sky-50">
          <LoadingSpinner />
        </div>
      )}
      {url ? (
        <button
          type="button"
          onClick={() => onOpen?.()}
          aria-label="写真を拡大"
          className="relative block h-full w-full cursor-zoom-in border-0 bg-transparent p-0"
        >
          <img
            src={url}
            alt={alt}
            draggable={false}
            onLoad={() => setImageReady(true)}
            className={`pointer-events-none h-full w-full object-cover ${
              imageReady ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {imageReady && (
            <span className="pointer-events-none absolute right-2 bottom-2 rounded-md bg-sky-950/60 px-2 py-0.5 text-xs text-white">
              拡大
            </span>
          )}
        </button>
      ) : (
        !loading && <span className="text-sm text-slate-400">写真なし</span>
      )}
    </>
  )
}
