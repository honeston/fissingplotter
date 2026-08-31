import { Camera, Download, ImagePlus, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { compressImage } from '../lib/compressImage'
import { saveImageToDevice } from '../lib/saveImageToDevice'
import { Icon } from './ui/Icon'

interface PhotoInputProps {
  previewUrl: string | null
  onPreviewChange: (url: string | null) => void
  photoBlob: Blob | null
  onPhotoChange: (blob: Blob | null) => void
  disabled?: boolean
  canClear?: boolean
}

type PhotoSource = 'camera' | 'gallery'

function PhotoActionButton({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: typeof Camera
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-60 ${
        danger
          ? 'border-red-200 text-red-600 hover:bg-red-50'
          : 'border-sky-200 text-cyan-800 hover:bg-sky-50'
      }`}
    >
      <Icon icon={icon} size="sm" />
      <span className="sr-only">{label}</span>
    </button>
  )
}

export function PhotoInput({
  previewUrl,
  onPreviewChange,
  photoBlob,
  onPhotoChange,
  disabled,
  canClear = true,
}: PhotoInputProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [compressing, setCompressing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [photoSource, setPhotoSource] = useState<PhotoSource | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function handleFile(file: File | null, source: PhotoSource) {
    setError('')
    if (!file) return

    setCompressing(true)
    try {
      const blob = await compressImage(file)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      onPreviewChange(URL.createObjectURL(blob))
      onPhotoChange(blob)
      setPhotoSource(source)
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像の処理に失敗しました')
    } finally {
      setCompressing(false)
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  function clearPhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    onPreviewChange(null)
    onPhotoChange(null)
    setPhotoSource(null)
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  async function handleSaveToDevice() {
    if (!photoBlob) return
    setError('')
    setSaving(true)
    try {
      await saveImageToDevice(photoBlob)
    } catch (err) {
      setError(err instanceof Error ? err.message : '端末への保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const pickerDisabled = disabled || compressing
  const pickButtonClassName =
    'flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-sky-300 bg-sky-50/50 px-3 py-3 text-xs font-medium text-cyan-800 disabled:opacity-60'

  return (
    <div className="mb-4">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={pickerDisabled}
        onChange={(e) => void handleFile(e.target.files?.[0] ?? null, 'camera')}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={pickerDisabled}
        onChange={(e) => void handleFile(e.target.files?.[0] ?? null, 'gallery')}
      />
      {previewUrl ? (
        <div className="flex items-start gap-3">
          <img
            src={previewUrl}
            alt="選択した写真"
            className="h-24 w-24 rounded-xl border border-sky-200 object-cover"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {photoBlob ? (
              <p className="text-xs tabular-nums text-slate-500">
                {Math.round(photoBlob.size / 1024)}KB
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {photoSource === 'camera' ? (
                <>
                  <PhotoActionButton
                    icon={RefreshCw}
                    label="撮り直す"
                    disabled={pickerDisabled || saving}
                    onClick={() => cameraInputRef.current?.click()}
                  />
                  <PhotoActionButton
                    icon={ImagePlus}
                    label="アルバムから選ぶ"
                    disabled={pickerDisabled || saving}
                    onClick={() => galleryInputRef.current?.click()}
                  />
                  {photoBlob && (
                    <PhotoActionButton
                      icon={Download}
                      label={saving ? '保存中…' : 'カメラロールに残す'}
                      disabled={disabled || compressing || saving}
                      onClick={() => void handleSaveToDevice()}
                    />
                  )}
                </>
              ) : (
                <>
                  <PhotoActionButton
                    icon={ImagePlus}
                    label="選び直す"
                    disabled={pickerDisabled || saving}
                    onClick={() => galleryInputRef.current?.click()}
                  />
                  <PhotoActionButton
                    icon={Camera}
                    label="カメラで撮る"
                    disabled={pickerDisabled || saving}
                    onClick={() => cameraInputRef.current?.click()}
                  />
                </>
              )}
              {canClear && (
                <PhotoActionButton
                  icon={Trash2}
                  label="削除"
                  disabled={disabled || compressing || saving}
                  onClick={clearPhoto}
                  danger
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pickerDisabled}
            onClick={() => cameraInputRef.current?.click()}
            className={pickButtonClassName}
            aria-label="カメラで撮る"
          >
            <Icon icon={Camera} size="md" />
            {compressing ? '…' : '撮影'}
          </button>
          <button
            type="button"
            disabled={pickerDisabled}
            onClick={() => galleryInputRef.current?.click()}
            className={pickButtonClassName}
            aria-label="アルバムから選ぶ"
          >
            <Icon icon={ImagePlus} size="md" />
            {compressing ? '…' : 'アルバム'}
          </button>
        </div>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
