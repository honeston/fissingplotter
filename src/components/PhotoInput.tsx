import { useEffect, useRef, useState } from 'react'
import { compressImage } from '../lib/compressImage'

interface PhotoInputProps {
  previewUrl: string | null
  onPreviewChange: (url: string | null) => void
  photoBlob: Blob | null
  onPhotoChange: (blob: Blob | null) => void
  disabled?: boolean
  canClear?: boolean
}

export function PhotoInput({
  previewUrl,
  onPreviewChange,
  photoBlob,
  onPhotoChange,
  disabled,
  canClear = true,
}: PhotoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [compressing, setCompressing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function handleFile(file: File | null) {
    setError('')
    if (!file) return

    setCompressing(true)
    try {
      const blob = await compressImage(file)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      onPreviewChange(URL.createObjectURL(blob))
      onPhotoChange(blob)
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像の処理に失敗しました')
    } finally {
      setCompressing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function clearPhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    onPreviewChange(null)
    onPhotoChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="mb-4">
      <span className="mb-2 block text-sm font-medium text-sky-900">写真（任意）</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled || compressing}
        onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
      />
      {previewUrl ? (
        <div className="flex items-start gap-3">
          <img
            src={previewUrl}
            alt="選択した写真"
            className="h-24 w-24 rounded-xl border border-sky-200 object-cover"
          />
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-500">
              {photoBlob ? `${Math.round(photoBlob.size / 1024)}KB（圧縮済み）` : ''}
            </p>
            {canClear && (
              <button
                type="button"
                disabled={disabled || compressing}
                onClick={clearPhoto}
                className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                削除
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || compressing}
          onClick={() => inputRef.current?.click()}
          className="flex min-h-12 w-full items-center justify-center rounded-xl border border-dashed border-sky-300 bg-sky-50/50 px-4 py-3 text-sm font-medium text-cyan-800 disabled:opacity-60"
        >
          {compressing ? '圧縮中…' : '写真を追加'}
        </button>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
