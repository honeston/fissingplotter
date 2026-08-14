import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FishSpeciesInput } from '../components/FishSpeciesInput'
import { PhotoInput } from '../components/PhotoInput'
import { RecordProgress } from '../components/RecordProgress'
import { SavedRecordSummary } from '../components/SavedRecordSummary'
import { useRecord } from '../hooks/useRecord'

export function HomePage() {
  const [fishSpecies, setFishSpecies] = useState('')
  const [fishSizeCm, setFishSizeCm] = useState('')
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const { busy, steps, errors, lastResult, record, reset } = useRecord()
  const [fatalError, setFatalError] = useState('')
  const statusRef = useRef<HTMLDivElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLElement>(null)

  function scrollToTop() {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (!busy) return
    const node = statusRef.current
    if (!node) return
    node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    node.focus({ preventScroll: true })
  }, [busy])

  useEffect(() => {
    if (!lastResult) return
    const node = summaryRef.current
    if (!node) return
    node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    node.focus({ preventScroll: true })
  }, [lastResult])

  async function handleRecord() {
    setFatalError('')
    reset()

    const sizeRaw = fishSizeCm.trim()
    let parsedSize: number | null = null
    if (sizeRaw) {
      parsedSize = Number(sizeRaw)
      if (!Number.isFinite(parsedSize) || parsedSize < 0) {
        setFatalError('体長は 0 以上の数値で入力してください')
        return
      }
    }

    try {
      await record({
        fishSpecies: fishSpecies.trim() || null,
        fishSizeCm: parsedSize,
        photoBlob,
      })
      setFishSpecies('')
      setFishSizeCm('')
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
      setPhotoPreviewUrl(null)
      setPhotoBlob(null)
    } catch (err) {
      setFatalError(err instanceof Error ? err.message : '記録に失敗しました')
    }
  }

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
      <header ref={topRef} className="mb-8 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-cyan-700">Fissing Plotter</p>
          <h1 className="mt-1 text-2xl font-semibold text-sky-950">記録</h1>
        </div>
        <Link
          to="/history"
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
        >
          履歴
        </Link>
      </header>

      <FishSpeciesInput value={fishSpecies} onChange={setFishSpecies} disabled={busy} />

      <label className="mb-2 block text-sm font-medium text-sky-900" htmlFor="fish-size">
        体長 cm（任意）
      </label>
      <input
        id="fish-size"
        type="number"
        inputMode="decimal"
        min={0}
        step={0.1}
        placeholder="例: 25"
        value={fishSizeCm}
        onChange={(e) => setFishSizeCm(e.target.value)}
        disabled={busy}
        className="mb-4 w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base text-sky-950 shadow-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60"
      />

      <PhotoInput
        previewUrl={photoPreviewUrl}
        onPreviewChange={setPhotoPreviewUrl}
        photoBlob={photoBlob}
        onPhotoChange={setPhotoBlob}
        disabled={busy}
      />

      <p className="mb-4 text-sm text-slate-500">
        ボタンを押すと、現在地・天気・気温・潮位を取得して保存します。位置情報が取れない場合も記録できます（オフライン時は端末のみ）。
      </p>

      <div className="mt-auto">
        {fatalError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {fatalError}
          </p>
        )}
        <button
          type="button"
          onClick={() => void handleRecord()}
          disabled={busy}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-cyan-700 px-4 py-3 text-base font-semibold text-white shadow-md transition enabled:active:scale-[0.98] enabled:hover:bg-cyan-800 disabled:opacity-60"
        >
          {busy ? '記録中…' : '記録する'}
        </button>
        <div
          ref={statusRef}
          tabIndex={-1}
          className="mt-4 scroll-mt-4 outline-none"
        >
          <RecordProgress steps={steps} errors={errors} />
          {lastResult && (
            <div ref={summaryRef} tabIndex={-1} className="scroll-mt-4 outline-none">
              <SavedRecordSummary result={lastResult} />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={scrollToTop}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-cyan-700 px-3 py-2 text-sm font-semibold text-white shadow-sm enabled:active:scale-[0.98]"
                >
                  続けて記録
                </button>
                <Link
                  to="/history"
                  className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
                >
                  履歴を見る
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
