import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FishSpeciesInput } from '../components/FishSpeciesInput'
import { JafAttribution } from '../components/JafAttribution'
import { PhotoInput } from '../components/PhotoInput'
import { RecordProgress } from '../components/RecordProgress'
import { SavedRecordSummary } from '../components/SavedRecordSummary'
import { TackleFieldsForm } from '../components/TackleFieldsForm'
import { TideAttribution } from '../components/TideAttribution'
import { WeatherAttribution } from '../components/WeatherAttribution'
import { useRecord } from '../hooks/useRecord'
import { useUnitPrefs } from '../hooks/useUnitPrefs'
import { canonicalFishSpeciesName } from '../lib/fishSpecies'
import { listMyTackles, saveMyTackle } from '../lib/myTackle'
import { getAllRecords } from '../lib/sync'
import {
  lengthUnitLabel,
  parseSizeToCm,
  parseWeightToG,
  sizeInputStep,
  sizePlaceholder,
  sizeToInputString,
  weightInputStep,
  weightPlaceholder,
  weightToInputString,
  weightUnitLabel,
} from '../lib/units'
import {
  EMPTY_TACKLE_FIELDS,
  hasTackleContent,
  normalizeTackleFields,
  tackleFromMyTackle,
  type MyTackle,
  type TackleFields,
} from '../types/tackle'

function tackleFieldsOrEmpty(fields: TackleFields | null | undefined): TackleFields {
  return fields ? { ...fields } : EMPTY_TACKLE_FIELDS
}

export function HomePage() {
  const { prefs } = useUnitPrefs()
  const [fishSpecies, setFishSpecies] = useState('')
  const [fishSizeInput, setFishSizeInput] = useState('')
  const [fishWeightInput, setFishWeightInput] = useState('')
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [tackleOpen, setTackleOpen] = useState(false)
  const [tackle, setTackle] = useState<TackleFields>(EMPTY_TACKLE_FIELDS)
  const [myTackles, setMyTackles] = useState<MyTackle[]>([])
  const [showTacklePicker, setShowTacklePicker] = useState(false)
  const [tackleMessage, setTackleMessage] = useState('')
  const { busy, steps, errors, lastResult, record, reset } = useRecord()
  const [fatalError, setFatalError] = useState('')
  const statusRef = useRef<HTMLDivElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLElement>(null)
  const lengthUnitRef = useRef(prefs.length)
  const weightUnitRef = useRef(prefs.weight)

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
    const revealButtons = () => {
      node.scrollIntoView({ behavior: 'smooth', block: 'end' })
      node.focus({ preventScroll: true })
    }
    requestAnimationFrame(() => requestAnimationFrame(revealButtons))
  }, [lastResult])

  useEffect(() => {
    if (lengthUnitRef.current === prefs.length) return
    const previous = lengthUnitRef.current
    lengthUnitRef.current = prefs.length
    setFishSizeInput((current) => {
      const cm = parseSizeToCm(current, previous)
      if (cm == null || cm === 'invalid') return current.trim() ? current : ''
      return sizeToInputString(cm, prefs.length)
    })
  }, [prefs.length])

  useEffect(() => {
    if (weightUnitRef.current === prefs.weight) return
    const previous = weightUnitRef.current
    weightUnitRef.current = prefs.weight
    setFishWeightInput((current) => {
      const g = parseWeightToG(current, previous)
      if (g == null || g === 'invalid') return current.trim() ? current : ''
      return weightToInputString(g, prefs.weight)
    })
  }, [prefs.weight])

  useEffect(() => {
    if (!tackleOpen) return
    void listMyTackles().then(setMyTackles)
  }, [tackleOpen])

  useEffect(() => {
    void getAllRecords().then((records) => {
      const last = records[0]
      if (!last?.tackle) return
      setTackle(tackleFieldsOrEmpty(last.tackle))
    })
  }, [])

  async function handleUseMyTackle(item: MyTackle) {
    setTackle(tackleFromMyTackle(item))
    setShowTacklePicker(false)
    setTackleMessage(`「${item.name || '無題'}」を適用しました`)
  }

  async function handleSaveMyTackle() {
    setTackleMessage('')
    try {
      const toSave = hasTackleContent(tackle)
        ? tackle.name.trim()
          ? tackle
          : { ...tackle, name: '無題' }
        : null
      if (!toSave) {
        setTackleMessage('タックルの内容を入力してください')
        return
      }
      await saveMyTackle(toSave)
      setMyTackles(await listMyTackles())
      setTackleMessage('マイタックルに保存しました')
    } catch (err) {
      setTackleMessage(err instanceof Error ? err.message : '保存に失敗しました')
    }
  }

  async function handleRecord() {
    setFatalError('')
    reset()

    const parsedSize = parseSizeToCm(fishSizeInput, prefs.length)
    if (parsedSize === 'invalid') {
      setFatalError('体長は 0 以上の数値で入力してください')
      return
    }

    const parsedWeight = parseWeightToG(fishWeightInput, prefs.weight)
    if (parsedWeight === 'invalid') {
      setFatalError('重さは 0 以上の数値で入力してください')
      return
    }

    try {
      await record({
        fishSpecies: fishSpecies.trim() ? canonicalFishSpeciesName(fishSpecies.trim()) : null,
        fishSizeCm: parsedSize,
        fishWeightG: parsedWeight,
        tackle: normalizeTackleFields(tackle),
        photoBlob,
      })
      setFishSpecies('')
      setFishSizeInput('')
      setFishWeightInput('')
      // タックル入力は記録に埋め込み済み。次回も同じ内容を引き継ぐ
      setTackleOpen(false)
      setShowTacklePicker(false)
      setTackleMessage('')
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

      <PhotoInput
        previewUrl={photoPreviewUrl}
        onPreviewChange={setPhotoPreviewUrl}
        photoBlob={photoBlob}
        onPhotoChange={setPhotoBlob}
        disabled={busy}
      />

      <FishSpeciesInput value={fishSpecies} onChange={setFishSpecies} disabled={busy} />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-sky-900" htmlFor="fish-size">
            体長 {lengthUnitLabel(prefs.length)}（任意）
          </label>
          <input
            id="fish-size"
            type="number"
            inputMode="decimal"
            min={0}
            step={sizeInputStep(prefs.length)}
            placeholder={sizePlaceholder(prefs.length)}
            value={fishSizeInput}
            onChange={(e) => setFishSizeInput(e.target.value)}
            disabled={busy}
            className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base text-sky-950 shadow-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-sky-900" htmlFor="fish-weight">
            重さ {weightUnitLabel(prefs.weight)}（任意）
          </label>
          <input
            id="fish-weight"
            type="number"
            inputMode="decimal"
            min={0}
            step={weightInputStep(prefs.weight)}
            placeholder={weightPlaceholder(prefs.weight)}
            value={fishWeightInput}
            onChange={(e) => setFishWeightInput(e.target.value)}
            disabled={busy}
            className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base text-sky-950 shadow-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60"
          />
        </div>
      </div>

      <div className="mb-4">
        <button
          type="button"
          onClick={() => {
            setTackleOpen((open) => !open)
            setShowTacklePicker(false)
            setTackleMessage('')
          }}
          disabled={busy}
          className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-left text-sm font-medium text-cyan-800 shadow-sm disabled:opacity-60"
        >
          {tackleOpen ? 'タックル入力を閉じる' : 'タックル入力を開く'}
          {hasTackleContent(tackle) && !tackleOpen ? (
            <span className="mt-0.5 block text-xs font-normal text-slate-500">
              {tackle.name || '入力あり'}
            </span>
          ) : null}
        </button>

        {tackleOpen && (
          <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/50 px-3 py-3">
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowTacklePicker((open) => !open)}
                disabled={busy}
                className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm disabled:opacity-60"
              >
                マイタックルを使う
              </button>
              <button
                type="button"
                onClick={() => void handleSaveMyTackle()}
                disabled={busy}
                className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm disabled:opacity-60"
              >
                マイタックルに保存
              </button>
            </div>

            {showTacklePicker && (
              <div className="mb-3 max-h-48 overflow-y-auto rounded-lg border border-sky-200 bg-white">
                {myTackles.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-slate-500">
                    マイタックルがまだありません
                  </p>
                ) : (
                  <ul>
                    {myTackles.map((item) => (
                      <li key={item.id} className="border-b border-sky-100 last:border-b-0">
                        <button
                          type="button"
                          onClick={() => void handleUseMyTackle(item)}
                          className="w-full px-3 py-2.5 text-left text-sm hover:bg-sky-50"
                        >
                          <span className="font-medium text-sky-950">
                            {item.name || '（無題）'}
                          </span>
                          {(item.rod || item.reel) && (
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {[item.rod, item.reel].filter(Boolean).join(' / ')}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <TackleFieldsForm
              value={tackle}
              onChange={setTackle}
              disabled={busy}
              idPrefix="home-tackle"
            />
            {tackleMessage && (
              <p className="mt-2 text-sm text-cyan-800" role="status">
                {tackleMessage}
              </p>
            )}
          </div>
        )}
      </div>

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
        <div ref={statusRef} tabIndex={-1} className="mt-4 scroll-mt-4 outline-none">
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
        <div className="mt-6 space-y-1">
          <WeatherAttribution />
          <TideAttribution />
          <JafAttribution />
        </div>
      </div>
    </main>
  )
}
