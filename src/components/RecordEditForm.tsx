import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import { useUnitPrefs } from '../hooks/useUnitPrefs'
import { fetchDerivedConditions } from '../lib/conditions'
import { sameCoordinates } from '../lib/coordinates'
import {
  fromDatetimeLocalValue,
  sameMinute,
  toDatetimeLocalValue,
} from '../lib/dates'
import { withEditedField } from '../lib/editedFields'
import { rememberFishSpecies, canonicalFishSpeciesName } from '../lib/fishSpecies'
import { getCurrentPosition } from '../lib/geolocation'
import { updateRecord } from '../lib/sync'
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
import type { FishingRecord } from '../types/record'
import {
  EMPTY_TACKLE_FIELDS,
  hasTackleContent,
  normalizeTackleFields,
  type TackleFields,
} from '../types/tackle'
import { FishSpeciesInput } from './FishSpeciesInput'
import { JafAttribution } from './JafAttribution'
import { LoadingSpinner } from './RecordCard'
import { RecordValueList } from './RecordValueList'
import { PhotoInput } from './PhotoInput'
import { TackleFieldsForm } from './TackleFieldsForm'

const CoordinatePickerMap = lazy(() =>
  import('./CoordinatePickerMap').then((m) => ({ default: m.CoordinatePickerMap })),
)

const REFETCH_MS = 600

interface RecordEditFormProps {
  record: FishingRecord
  onCancel: () => void
  onSaved: (record: FishingRecord) => void
}

export function RecordEditForm({ record, onCancel, onSaved }: RecordEditFormProps) {
  const timeId = useId()
  const sizeId = useId()
  const weightId = useId()
  const { url: existingPhotoUrl } = usePhotoUrl(record)
  const { prefs } = useUnitPrefs()
  const [draft, setDraft] = useState<FishingRecord>(record)
  const [fishSizeInput, setFishSizeInput] = useState(
    record.fishSizeCm != null ? sizeToInputString(record.fishSizeCm, prefs.length) : '',
  )
  const [fishWeightInput, setFishWeightInput] = useState(
    record.fishWeightG != null ? weightToInputString(record.fishWeightG, prefs.weight) : '',
  )
  const [tackleDraft, setTackleDraft] = useState<TackleFields>(
    record.tackle ?? EMPTY_TACKLE_FIELDS,
  )
  const [tackleOpen, setTackleOpen] = useState(hasTackleContent(record.tackle))
  const lengthUnitRef = useRef(prefs.length)
  const weightUnitRef = useRef(prefs.weight)
  const [recordedLocal, setRecordedLocal] = useState(toDatetimeLocalValue(record.recordedAt))
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [flyNonce, setFlyNonce] = useState(0)
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [geoBusy, setGeoBusy] = useState(false)
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const fetchGen = useRef(0)
  const originalRef = useRef(record)

  useEffect(() => {
    originalRef.current = record
    setDraft(record)
    setFishSizeInput(
      record.fishSizeCm != null ? sizeToInputString(record.fishSizeCm, prefs.length) : '',
    )
    setFishWeightInput(
      record.fishWeightG != null ? weightToInputString(record.fishWeightG, prefs.weight) : '',
    )
    setTackleDraft(record.tackle ?? EMPTY_TACKLE_FIELDS)
    setTackleOpen(hasTackleContent(record.tackle))
    lengthUnitRef.current = prefs.length
    weightUnitRef.current = prefs.weight
    setRecordedLocal(toDatetimeLocalValue(record.recordedAt))
    setPhotoBlob(null)
    setPhotoPreviewUrl(null)
    setWarnings([])
    setError('')
  }, [record, prefs.length, prefs.weight])

  useEffect(() => {
    const gen = ++fetchGen.current
    const original = originalRef.current
    const latitude = draft.latitude
    const longitude = draft.longitude
    const recordedAt = draft.recordedAt
    const coordsChanged = !sameCoordinates(original, {
      latitude,
      longitude,
    })
    const timeChanged = !sameMinute(original.recordedAt, recordedAt)
    if (!coordsChanged && !timeChanged) {
      setFetching(false)
      return
    }
    if (latitude == null || longitude == null) {
      setFetching(false)
      return
    }

    const handle = window.setTimeout(() => {
      setFetching(true)
      setError('')
      void fetchDerivedConditions(
        latitude,
        longitude,
        new Date(recordedAt),
        { includeWeather: false },
      )
        .then((result) => {
          if (gen !== fetchGen.current) return
          setDraft((current) => ({
            ...current,
            locationName: result.conditions.locationName ?? current.locationName,
            dawnAt: result.conditions.dawnAt,
            sunriseAt: result.conditions.sunriseAt,
            sunsetAt: result.conditions.sunsetAt,
            duskAt: result.conditions.duskAt,
            tideLevel: result.conditions.tideLevel,
            tideHarbor: result.conditions.tideHarbor,
            tideCycle: result.conditions.tideCycle,
            moonPhase: result.conditions.moonPhase,
            moonAge: result.conditions.moonAge,
            tideSlopeCmPerHour: result.conditions.tideSlopeCmPerHour,
          }))
          setWarnings(result.warnings)
          setFetching(false)
        })
        .catch((err: unknown) => {
          if (gen !== fetchGen.current) return
          setWarnings([err instanceof Error ? err.message : '更新に失敗しました'])
          setFetching(false)
        })
    }, REFETCH_MS)

    return () => window.clearTimeout(handle)
  }, [draft.latitude, draft.longitude, draft.recordedAt])

  function setCoordinates(latitude: number, longitude: number) {
    setDraft((current) => ({ ...current, latitude, longitude }))
  }

  async function applyCurrentLocation() {
    setGeoBusy(true)
    setError('')
    try {
      const pos = await getCurrentPosition()
      setCoordinates(pos.latitude, pos.longitude)
      setFlyNonce((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : '位置情報の取得に失敗しました')
    } finally {
      setGeoBusy(false)
    }
  }

  async function handleSave() {
    setError('')
    const parsedSize = parseSizeToCm(fishSizeInput, prefs.length)
    if (parsedSize === 'invalid') {
      setError('体長は 0 以上の数値で入力してください')
      return
    }

    const parsedWeight = parseWeightToG(fishWeightInput, prefs.weight)
    if (parsedWeight === 'invalid') {
      setError('重さは 0 以上の数値で入力してください')
      return
    }

    const recordedAtRaw = fromDatetimeLocalValue(recordedLocal)
    if (!recordedAtRaw) {
      setError('記録日時を入力してください')
      return
    }

    const original = originalRef.current
    const recordedAt = sameMinute(original.recordedAt, recordedAtRaw)
      ? original.recordedAt
      : recordedAtRaw
    let editedFields = original.editedFields
    if (!sameCoordinates(original, draft)) {
      editedFields = withEditedField(editedFields, 'location')
    }
    if (!sameMinute(original.recordedAt, recordedAt)) {
      editedFields = withEditedField(editedFields, 'recordedAt')
    }

    const speciesRaw = draft.fishSpecies?.trim() || ''
    const species = speciesRaw ? canonicalFishSpeciesName(speciesRaw) : null
    if (species) rememberFishSpecies(species)

    setSaving(true)
    try {
      const saved = await updateRecord(
        {
          ...draft,
          recordedAt,
          fishSpecies: species,
          fishSizeCm: parsedSize,
          fishWeightG: parsedWeight,
          tackle: normalizeTackleFields(tackleDraft),
          editedFields,
        },
        photoBlob,
      )
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || fetching || geoBusy

  return (
    <div className="pb-2">
      {existingPhotoUrl && !photoPreviewUrl && (
        <img
          src={existingPhotoUrl}
          alt="保存済みの写真"
          className="mb-2 h-24 w-24 rounded-xl border border-sky-200 object-cover"
        />
      )}
      <PhotoInput
        previewUrl={photoPreviewUrl}
        onPreviewChange={setPhotoPreviewUrl}
        photoBlob={photoBlob}
        onPhotoChange={setPhotoBlob}
        disabled={saving}
      />

      <FishSpeciesInput
        value={draft.fishSpecies ?? ''}
        onChange={(value) =>
          setDraft((current) => ({ ...current, fishSpecies: value || null }))
        }
        disabled={saving}
      />

      <label className="mb-2 block text-sm font-medium text-sky-900" htmlFor={sizeId}>
        体長 {lengthUnitLabel(prefs.length)}（任意）
      </label>
      <input
        id={sizeId}
        type="number"
        inputMode="decimal"
        min={0}
        step={sizeInputStep(prefs.length)}
        placeholder={sizePlaceholder(prefs.length)}
        value={fishSizeInput}
        onChange={(e) => setFishSizeInput(e.target.value)}
        disabled={saving}
        className="mb-4 w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base text-sky-950 shadow-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60"
      />

      <label className="mb-2 block text-sm font-medium text-sky-900" htmlFor={weightId}>
        重さ {weightUnitLabel(prefs.weight)}（任意）
      </label>
      <input
        id={weightId}
        type="number"
        inputMode="decimal"
        min={0}
        step={weightInputStep(prefs.weight)}
        placeholder={weightPlaceholder(prefs.weight)}
        value={fishWeightInput}
        onChange={(e) => setFishWeightInput(e.target.value)}
        disabled={saving}
        className="mb-4 w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base text-sky-950 shadow-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60"
      />

      <button
        type="button"
        onClick={() => setTackleOpen((open) => !open)}
        disabled={saving}
        className="mb-3 w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-left text-sm font-medium text-cyan-800 shadow-sm disabled:opacity-60"
      >
        {tackleOpen ? 'タックル入力を閉じる' : 'タックル入力'}
      </button>
      {tackleOpen && (
        <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50/50 px-3 py-3">
          <TackleFieldsForm
            value={tackleDraft}
            onChange={setTackleDraft}
            disabled={saving}
            idPrefix="edit-tackle"
          />
        </div>
      )}

      <label className="mb-2 block text-sm font-medium text-sky-900" htmlFor={timeId}>
        記録日時
      </label>
      <input
        id={timeId}
        type="datetime-local"
        value={recordedLocal}
        onChange={(e) => {
          const value = e.target.value
          setRecordedLocal(value)
          const iso = fromDatetimeLocalValue(value)
          if (iso) setDraft((current) => ({ ...current, recordedAt: iso }))
        }}
        disabled={saving}
        className="mb-4 w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base text-sky-950 shadow-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60"
      />

      <p className="mb-2 text-sm font-medium text-sky-900">場所</p>
      <p className="mb-2 text-xs text-slate-500">
        地図をタップ、またはピンをドラッグして位置を指定します。天気・日出没・潮位は座標と時刻から自動で更新されます。
      </p>
      <div className="relative mb-2 h-52 overflow-hidden rounded-xl border border-sky-100">
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-sky-50">
              <LoadingSpinner />
            </div>
          }
        >
          <CoordinatePickerMap
            latitude={draft.latitude}
            longitude={draft.longitude}
            flyNonce={flyNonce}
            onChange={setCoordinates}
          />
        </Suspense>
      </div>
      <button
        type="button"
        onClick={() => void applyCurrentLocation()}
        disabled={busy}
        className="mb-4 rounded-lg border border-sky-200 px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm enabled:hover:bg-sky-50 disabled:opacity-60"
      >
        {geoBusy ? '現在地を取得中…' : '現在地を使う'}
      </button>

      {fetching && (
        <p className="mb-3 text-sm text-amber-800">天気・潮位・場所名を更新中…</p>
      )}
      {warnings.length > 0 && !fetching && (
        <ul className="mb-3 list-disc pl-4 text-xs text-amber-800">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2">
        <p className="text-xs font-medium text-slate-500">自動取得の内容（編集不可）</p>
        <RecordValueList record={draft} omitCatchFields />
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm disabled:opacity-60"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={busy}
          className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-cyan-700 px-3 py-2 text-sm font-semibold text-white shadow-sm enabled:active:scale-[0.98] enabled:hover:bg-cyan-800 disabled:opacity-60"
        >
          {saving ? '保存中…' : fetching ? '更新中…' : '保存する'}
        </button>
      </div>
      <JafAttribution className="mt-4" />
    </div>
  )
}
