import { Download, Maximize2, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { hasEditedField } from '../lib/editedFields'
import { formatFishSize, formatFishWeight } from '../lib/units'
import { saveImageToDevice } from '../lib/saveImageToDevice'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import { useUnitPrefs } from '../hooks/useUnitPrefs'
import { PhotoLightbox } from './PhotoLightbox'
import { EditedMark, RecordValueList } from './RecordValueList'
import { ConditionRow } from './ui/ConditionRow'
import { Icon } from './ui/Icon'
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
              aria-label={savingPhoto ? '保存中…' : '画像を保存'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-cyan-800 hover:bg-sky-50 disabled:opacity-60"
            >
              <Icon icon={Download} size="sm" />
              <span className="sr-only">{savingPhoto ? '保存中…' : '画像を保存'}</span>
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
            aria-label="削除"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
          >
            <Icon icon={Trash2} size="sm" label="削除" />
          </button>
        )}
      </div>
      <ConditionRow record={record} compact />
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

const PHOTO_TAP_EVENT = 'photo-tap'

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
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setImageReady(false)
  }, [url])

  useEffect(() => {
    const el = frameRef.current
    if (!el || !onOpen) return
    const openPhoto = onOpen

    function handlePhotoTap() {
      openPhoto()
    }

    el.addEventListener(PHOTO_TAP_EVENT, handlePhotoTap)
    return () => el.removeEventListener(PHOTO_TAP_EVENT, handlePhotoTap)
  }, [onOpen, url])

  const showSpinner = loading || Boolean(url && !imageReady)

  return (
    <>
      {showSpinner && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-sky-50">
          <LoadingSpinner />
        </div>
      )}
      {url ? (
        <div
          ref={frameRef}
          data-photo-tap
          role="button"
          tabIndex={0}
          aria-label="写真を拡大"
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            onOpen?.()
          }}
          className="relative block h-full w-full cursor-zoom-in"
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
            <span className="pointer-events-none absolute right-2 bottom-2 rounded-md bg-sky-950/60 p-1 text-white">
              <Icon icon={Maximize2} size="xs" label="拡大" />
            </span>
          )}
        </div>
      ) : (
        !loading && <span className="text-sm text-slate-400">写真なし</span>
      )}
    </>
  )
}
