import { Calendar, ChevronDown, ChevronUp, CircleStop, Fish, Play, Ruler, Scale } from 'lucide-react'
import { FishingRod } from '../components/icons/FishingRod'
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
import { IconButton } from '../components/ui/IconButton'
import { PageHeader } from '../components/ui/PageHeader'
import { Icon } from '../components/ui/Icon'
import { useRecord } from '../hooks/useRecord'
import { useUnitPrefs } from '../hooks/useUnitPrefs'
import { canonicalFishSpeciesName } from '../lib/fishSpecies'
import { parseFishCount } from '../lib/fishCount'
import { listMyTackles, saveMyTackle } from '../lib/myTackle'
import { getAllRecords } from '../lib/sync'
import {
  activeTripFromRecord,
  clearActiveTrip,
  createActiveTrip,
  readActiveTrip,
  writeActiveTrip,
  type ActiveTrip,
} from '../lib/trips'
import {
  clearTackleDraft,
  readKeepTackle,
  readTackleDraft,
  writeKeepTackle,
  writeTackleDraft,
} from '../lib/tackleDraft'
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
import { isBlankRecord } from '../types/record'

function tackleFieldsOrEmpty(fields: TackleFields | null | undefined): TackleFields {
  return fields ? { ...fields } : EMPTY_TACKLE_FIELDS
}

export function HomePage() {
  const { prefs } = useUnitPrefs()
  const [fishSpecies, setFishSpecies] = useState('')
  const [fishCountInput, setFishCountInput] = useState('')
  const [fishSizeInput, setFishSizeInput] = useState('')
  const [fishWeightInput, setFishWeightInput] = useState('')
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [tackleOpen, setTackleOpen] = useState(false)
  const [tackle, setTackle] = useState<TackleFields>(EMPTY_TACKLE_FIELDS)
  const [keepTackle, setKeepTackle] = useState(() => readKeepTackle())
  const [myTackles, setMyTackles] = useState<MyTackle[]>([])
  const [showTacklePicker, setShowTacklePicker] = useState(false)
  const [tackleMessage, setTackleMessage] = useState('')
  const { busy, steps, errors, lastResult, record, captureConditions, reset } = useRecord()
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(() => readActiveTrip())
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
    if (!readKeepTackle()) return
    const draft = readTackleDraft()
    if (draft) {
      setTackle(draft)
      return
    }
    void getAllRecords().then((records) => {
      const last = records[0]
      if (!last?.tackle) return
      const fields = tackleFieldsOrEmpty(last.tackle)
      setTackle(fields)
      writeTackleDraft(fields)
    })
  }, [])

  function applyTackle(next: TackleFields) {
    setTackle(next)
    if (keepTackle) writeTackleDraft(next)
    else clearTackleDraft()
  }

  function handleKeepTackleChange(next: boolean) {
    setKeepTackle(next)
    writeKeepTackle(next)
    if (next) writeTackleDraft(tackle)
    else clearTackleDraft()
  }

  function handleClearTackle() {
    applyTackle(EMPTY_TACKLE_FIELDS)
    setShowTacklePicker(false)
    setTackleMessage('')
    clearTackleDraft()
  }

  async function handleUseMyTackle(item: MyTackle) {
    applyTackle(tackleFromMyTackle(item))
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

  async function handleStartTrip() {
    setFatalError('')
    reset()
    try {
      const captured = await captureConditions()
      const trip = createActiveTrip(captured.conditions)
      writeActiveTrip(trip)
      setActiveTrip(trip)
    } catch (err) {
      setFatalError(err instanceof Error ? err.message : '釣行を開始できませんでした')
    }
  }

  async function handleEndTrip() {
    if (!activeTrip) return
    if (activeTrip.catchCount === 0) {
      await handleRecord('blank')
      return
    }
    clearActiveTrip()
    setActiveTrip(null)
  }

  function clearCatchFields() {
    setFishSpecies('')
    setFishCountInput('')
    setFishSizeInput('')
    setFishWeightInput('')
    if (keepTackle) {
      writeTackleDraft(tackle)
    } else {
      setTackle(EMPTY_TACKLE_FIELDS)
      clearTackleDraft()
    }
    setTackleOpen(false)
    setShowTacklePicker(false)
    setTackleMessage('')
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoPreviewUrl(null)
    setPhotoBlob(null)
  }

  async function handleRecord(kind: 'catch' | 'blank') {
    setFatalError('')
    reset()

    let parsedCount: number | null = null
    let parsedSize: number | null = null
    let parsedWeight: number | null = null

    if (kind === 'catch') {
      const count = parseFishCount(fishCountInput)
      if (count === 'invalid') {
        setFatalError('匹数は 1 以上の整数で入力してください')
        return
      }
      const size = parseSizeToCm(fishSizeInput, prefs.length)
      if (size === 'invalid') {
        setFatalError('体長は 0 以上の数値で入力してください')
        return
      }
      const weight = parseWeightToG(fishWeightInput, prefs.weight)
      if (weight === 'invalid') {
        setFatalError('重さは 0 以上の数値で入力してください')
        return
      }
      parsedCount = count
      parsedSize = size
      parsedWeight = weight
    }

    try {
      const result = await record({
        fishSpecies:
          kind === 'catch' && fishSpecies.trim()
            ? canonicalFishSpeciesName(fishSpecies.trim())
            : null,
        fishCount: parsedCount,
        fishSizeCm: parsedSize,
        fishWeightG: parsedWeight,
        tackle: normalizeTackleFields(tackle),
        photoBlob,
        kind,
        tripId: activeTrip?.tripId ?? null,
        reuseConditions: activeTrip?.conditions ?? null,
      })
      if (isBlankRecord(result.record)) {
        clearActiveTrip()
        setActiveTrip(null)
      } else {
        const next = activeTripFromRecord(result.record, activeTrip)
        writeActiveTrip(next)
        setActiveTrip(next)
      }
      clearCatchFields()
    } catch (err) {
      setFatalError(err instanceof Error ? err.message : '記録に失敗しました')
    }
  }

  return (
    <main ref={topRef} className="flex flex-1 flex-col px-4 pb-8 pt-6">
      <PageHeader
        title="記録"
        action={
          <Link
            to="/history"
            aria-label="履歴"
            data-testid="header-history"
            className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-sky-200 bg-white text-cyan-800 shadow-sm"
          >
            <Icon icon={Calendar} size="sm" label="履歴" />
          </Link>
        }
      />

      {activeTrip && (
        <div
          className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3"
          data-testid="trip-banner"
          role="status"
        >
          <p className="min-w-0 text-sm text-cyan-950">
            <span className="font-semibold">釣行中</span>
            <span className="mt-0.5 block text-xs text-cyan-800">
              {[
                new Date(activeTrip.startedAt).toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }) + '〜',
                activeTrip.locationName,
                `${activeTrip.catchCount}匹`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </p>
        </div>
      )}

      <PhotoInput
        previewUrl={photoPreviewUrl}
        onPreviewChange={setPhotoPreviewUrl}
        photoBlob={photoBlob}
        onPhotoChange={setPhotoBlob}
        disabled={busy}
      />

      <div className="mb-4 flex items-start gap-2">
        <FishSpeciesInput
          value={fishSpecies}
          onChange={setFishSpecies}
          disabled={busy}
          className="min-w-0 flex-1"
        />
        <div className="w-16 shrink-0">
          <label className="mb-2 block text-sm font-medium text-sky-900" htmlFor="fish-count">
            匹数
          </label>
          <input
            id="fish-count"
            aria-label="匹数"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="1"
            value={fishCountInput}
            onChange={(e) => setFishCountInput(e.target.value)}
            disabled={busy}
            className="w-full rounded-xl border border-sky-200 bg-white px-1.5 py-3 text-center text-base tabular-nums text-sky-950 shadow-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60"
          />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-sky-900" htmlFor="fish-size">
            <Icon icon={Ruler} size="sm" className="text-cyan-700" />
            {lengthUnitLabel(prefs.length)}
          </label>
          <input
            id="fish-size"
            aria-label={`体長 ${lengthUnitLabel(prefs.length)}`}
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
          <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-sky-900" htmlFor="fish-weight">
            <Icon icon={Scale} size="sm" className="text-cyan-700" />
            {weightUnitLabel(prefs.weight)}
          </label>
          <input
            id="fish-weight"
            aria-label={`重さ ${weightUnitLabel(prefs.weight)}`}
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
          aria-expanded={tackleOpen}
          aria-label="タックル入力を開く"
          className="flex w-full items-center justify-between rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm font-medium text-cyan-800 shadow-sm disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-2">
            <Icon icon={FishingRod} size="sm" />
            タックル
            {hasTackleContent(tackle) && !tackleOpen ? (
              <span className="text-xs font-normal text-slate-500">
                {tackle.name || '入力あり'}
              </span>
            ) : null}
          </span>
          <Icon icon={tackleOpen ? ChevronUp : ChevronDown} size="sm" />
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
              <button
                type="button"
                onClick={handleClearTackle}
                disabled={busy || !hasTackleContent(tackle)}
                className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm disabled:opacity-60"
              >
                入力をクリア
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
              onChange={applyTackle}
              disabled={busy}
              idPrefix="home-tackle"
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-sky-900">
              <input
                type="checkbox"
                checked={keepTackle}
                onChange={(e) => handleKeepTackleChange(e.target.checked)}
                disabled={busy}
                aria-label="次回もこのタックルを使う"
                className="size-4 accent-cyan-700"
              />
              <span>次回も使う</span>
            </label>
            {tackleMessage && (
              <p className="mt-2 text-sm text-cyan-800" role="status">
                {tackleMessage}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto">
        {fatalError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {fatalError}
          </p>
        )}
        <IconButton
          icon={Fish}
          label="記録する"
          onClick={() => void handleRecord('catch')}
          disabled={busy}
          fullWidth
          testId="record-submit"
        >
          {busy ? (activeTrip ? '記録中…' : '記録') : activeTrip ? '追加' : '記録'}
        </IconButton>
        {activeTrip ? (
          <div className="mt-2">
            <IconButton
              icon={CircleStop}
              label="釣行を終了"
              onClick={() => void handleEndTrip()}
              disabled={busy}
              fullWidth
              variant="secondary"
              testId="trip-end"
            >
              釣行を終了
            </IconButton>
          </div>
        ) : (
          <div className="mt-2">
            <IconButton
              icon={Play}
              label="釣行を開始"
              onClick={() => void handleStartTrip()}
              disabled={busy}
              fullWidth
              variant="secondary"
              testId="trip-start"
            >
              {busy ? '開始中…' : '釣行を開始'}
            </IconButton>
          </div>
        )}
        <div ref={statusRef} tabIndex={-1} className="mt-4 scroll-mt-4 outline-none">
          <RecordProgress steps={steps} errors={errors} />
          {lastResult && (
            <div ref={summaryRef} tabIndex={-1} className="scroll-mt-4 outline-none">
              <SavedRecordSummary result={lastResult} />
              <div className="mt-3 flex gap-2">
                <IconButton
                  icon={Fish}
                  label="続けて記録"
                  onClick={scrollToTop}
                  testId="record-continue"
                  fullWidth
                >
                  続ける
                </IconButton>
                <Link
                  to="/history"
                  aria-label="履歴を見る"
                  data-testid="view-history"
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
                >
                  <Icon icon={Calendar} size="sm" />
                  履歴
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
