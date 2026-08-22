import { useEffect, useRef, useState } from 'react'
import { compressImage } from '../lib/compressImage'
import { saveImageToDevice } from '../lib/saveImageToDevice'

interface PhotoInputProps {
  previewUrl: string | null
  onPreviewChange: (url: string | null) => void
  photoBlob: Blob | null
  onPhotoChange: (blob: Blob | null) => void
  disabled?: boolean
  canClear?: boolean
}

type PhotoSource = 'camera' | 'gallery'

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
    'flex min-h-12 flex-1 items-center justify-center rounded-xl border border-dashed border-sky-300 bg-sky-50/50 px-3 py-3 text-sm font-medium text-cyan-800 disabled:opacity-60'

  return (
    <div className="mb-4">
      <span className="mb-2 block text-sm font-medium text-sky-900">写真（任意）</span>
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
            <p className="text-xs text-slate-500">
              {photoBlob ? `${Math.round(photoBlob.size / 1024)}KB（圧縮済み）` : ''}
            </p>
            {photoBlob && photoSource === 'camera' && (
              <p className="text-xs leading-relaxed text-slate-500">
                この写真はアプリにだけ残ります。カメラロールにも残す場合は下から保存してください。
              </p>
            )}
            {photoBlob && photoSource === 'gallery' && (
              <p className="text-xs leading-relaxed text-slate-500">
                アルバムの写真を記録に添付します。
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {photoSource === 'camera' ? (
                <>
                  <button
                    type="button"
                    disabled={pickerDisabled || saving}
                    onClick={() => cameraInputRef.current?.click()}
                    className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-cyan-800 hover:bg-sky-50 disabled:opacity-60"
                  >
                    撮り直す
                  </button>
                  <button
                    type="button"
                    disabled={pickerDisabled || saving}
                    onClick={() => galleryInputRef.current?.click()}
                    className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-cyan-800 hover:bg-sky-50 disabled:opacity-60"
                  >
                    アルバムから選ぶ
                  </button>
                  {photoBlob && (
                    <button
                      type="button"
                      disabled={disabled || compressing || saving}
                      onClick={() => void handleSaveToDevice()}
                      className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-cyan-800 hover:bg-sky-50 disabled:opacity-60"
                    >
                      {saving ? '保存中…' : 'カメラロールに残す'}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={pickerDisabled || saving}
                    onClick={() => galleryInputRef.current?.click()}
                    className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-cyan-800 hover:bg-sky-50 disabled:opacity-60"
                  >
                    選び直す
                  </button>
                  <button
                    type="button"
                    disabled={pickerDisabled || saving}
                    onClick={() => cameraInputRef.current?.click()}
                    className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-cyan-800 hover:bg-sky-50 disabled:opacity-60"
                  >
                    カメラで撮る
                  </button>
                </>
              )}
              {canClear && (
                <button
                  type="button"
                  disabled={disabled || compressing || saving}
                  onClick={clearPhoto}
                  className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  削除
                </button>
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
          >
            {compressing ? '圧縮中…' : 'カメラで撮る'}
          </button>
          <button
            type="button"
            disabled={pickerDisabled}
            onClick={() => galleryInputRef.current?.click()}
            className={pickButtonClassName}
          >
            {compressing ? '圧縮中…' : 'アルバムから選ぶ'}
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
