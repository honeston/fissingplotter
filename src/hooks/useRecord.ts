import { useCallback, useState } from 'react'
import { fetchDerivedConditions } from '../lib/conditions'
import { devGeoFallbackMessage, getCurrentPosition } from '../lib/geolocation'
import { getSunTimes } from '../lib/sun'
import { addRecord } from '../lib/sync'
import {
  normalizeRecordKind,
  type FishingRecord,
  type RecordFormInput,
  type TripReuseConditions,
} from '../types/record'

export type StepState = 'idle' | 'pending' | 'ok' | 'error' | 'skipped'

export interface RecordSteps {
  geo: StepState
  weather: StepState
  tide: StepState
  save: StepState
  photo: StepState
}

export interface RecordStepErrors {
  geo?: string
  weather?: string
  tide?: string
  save?: string
  photo?: string
}

export interface RecordResult {
  record: FishingRecord
  warnings: string[]
}

export type CapturedSession = {
  conditions: TripReuseConditions
  warnings: string[]
}

const idleSteps: RecordSteps = {
  geo: 'idle',
  weather: 'idle',
  tide: 'idle',
  save: 'idle',
  photo: 'idle',
}

function errMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

async function fetchLiveSession(
  report: (patch: Partial<RecordSteps>) => void,
): Promise<{
  conditions: TripReuseConditions
  dawnAt: string | null
  sunriseAt: string | null
  sunsetAt: string | null
  duskAt: string | null
  warnings: string[]
  errors: RecordStepErrors
}> {
  const warnings: string[] = []
  const errors: RecordStepErrors = {}
  let latitude: number | null = null
  let longitude: number | null = null
  const recordedAt = new Date()

  try {
    const pos = await getCurrentPosition()
    latitude = pos.latitude
    longitude = pos.longitude
    if (pos.devFallback) {
      warnings.push(devGeoFallbackMessage())
    }
    report({ geo: 'ok', weather: 'pending', tide: 'pending' })
  } catch (err) {
    const message = errMessage(err, '位置情報の取得に失敗しました')
    warnings.push(message)
    errors.geo = message
    report({ geo: 'error', weather: 'skipped', tide: 'skipped' })
  }

  let locationName: string | null = null
  let temperature: number | null = null
  let weatherCode: number | null = null
  let windSpeedMs: number | null = null
  let dawnAt: string | null = null
  let sunriseAt: string | null = null
  let sunsetAt: string | null = null
  let duskAt: string | null = null
  let tideLevel: number | null = null
  let tideHarbor: string | null = null
  let tideCycle: string | null = null
  let moonPhase: string | null = null
  let moonAge: number | null = null
  let tideSlopeCmPerHour: number | null = null

  if (latitude != null && longitude != null) {
    const derived = await fetchDerivedConditions(latitude, longitude, recordedAt)
    locationName = derived.conditions.locationName
    temperature = derived.conditions.temperature
    weatherCode = derived.conditions.weatherCode
    windSpeedMs = derived.conditions.windSpeedMs
    dawnAt = derived.conditions.dawnAt
    sunriseAt = derived.conditions.sunriseAt
    sunsetAt = derived.conditions.sunsetAt
    duskAt = derived.conditions.duskAt
    tideLevel = derived.conditions.tideLevel
    tideHarbor = derived.conditions.tideHarbor
    tideCycle = derived.conditions.tideCycle
    moonPhase = derived.conditions.moonPhase
    moonAge = derived.conditions.moonAge
    tideSlopeCmPerHour = derived.conditions.tideSlopeCmPerHour
    warnings.push(...derived.warnings)
    if (derived.errors.weather) errors.weather = derived.errors.weather
    if (derived.errors.tide) errors.tide = derived.errors.tide
    report({
      weather: derived.weatherStatus,
      tide: derived.tideStatus,
    })
  }

  return {
    conditions: {
      latitude,
      longitude,
      locationName,
      temperature,
      weatherCode,
      windSpeedMs,
      tideLevel,
      tideHarbor,
      tideCycle,
      moonPhase,
      moonAge,
      tideSlopeCmPerHour,
    },
    dawnAt,
    sunriseAt,
    sunsetAt,
    duskAt,
    warnings,
    errors,
  }
}

/**
 * 記録ボタン押下時: GPS → 天気・気温/潮位並列 → IndexedDB 保存 → 写真アップロード。
 * GPS 失敗時も座標なしで保存可。天気・潮位は座標がない場合スキップ。
 * 釣行中は位置・天気・潮位を再利用し、太陽時刻だけ取り直す。
 */
export function useRecord() {
  const [busy, setBusy] = useState(false)
  const [steps, setSteps] = useState<RecordSteps>(idleSteps)
  const [errors, setErrors] = useState<RecordStepErrors>({})
  const [lastResult, setLastResult] = useState<RecordResult | null>(null)

  const reset = useCallback(() => {
    setSteps(idleSteps)
    setErrors({})
    setLastResult(null)
  }, [])

  const captureConditions = useCallback(async (): Promise<CapturedSession> => {
    setBusy(true)
    setLastResult(null)
    setErrors({})
    setSteps({
      geo: 'pending',
      weather: 'idle',
      tide: 'idle',
      save: 'skipped',
      photo: 'skipped',
    })
    try {
      const live = await fetchLiveSession((patch) => {
        setSteps((s) => ({ ...s, ...patch }))
      })
      if (Object.keys(live.errors).length > 0) {
        setErrors(live.errors)
      }
      return { conditions: live.conditions, warnings: live.warnings }
    } finally {
      setBusy(false)
    }
  }, [])

  const record = useCallback(async (input: RecordFormInput): Promise<RecordResult> => {
    setBusy(true)
    setLastResult(null)
    setErrors({})
    const kind = normalizeRecordKind(input.kind)
    const blank = kind === 'blank'
    const reuse = input.reuseConditions
    const tripId = input.tripId?.trim() || crypto.randomUUID()
    const photoBlob = input.photoBlob

    setSteps({
      geo: reuse ? 'skipped' : 'pending',
      weather: reuse ? 'skipped' : 'idle',
      tide: reuse ? 'skipped' : 'idle',
      save: 'idle',
      photo: photoBlob ? 'idle' : 'skipped',
    })

    try {
      const warnings: string[] = []
      let nextErrors: RecordStepErrors = {}
      const recordedAt = new Date()
      let conditions: TripReuseConditions
      let dawnAt: string | null = null
      let sunriseAt: string | null = null
      let sunsetAt: string | null = null
      let duskAt: string | null = null

      if (reuse) {
        conditions = reuse
        if (reuse.latitude != null && reuse.longitude != null) {
          const sun = getSunTimes(recordedAt, reuse.latitude, reuse.longitude)
          if (sun) {
            dawnAt = sun.dawnAt
            sunriseAt = sun.sunriseAt
            sunsetAt = sun.sunsetAt
            duskAt = sun.duskAt
          }
        }
      } else {
        const live = await fetchLiveSession((patch) => {
          setSteps((s) => ({ ...s, ...patch }))
        })
        conditions = live.conditions
        dawnAt = live.dawnAt
        sunriseAt = live.sunriseAt
        sunsetAt = live.sunsetAt
        duskAt = live.duskAt
        warnings.push(...live.warnings)
        nextErrors = live.errors
      }

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors)
      }

      setSteps((s) => ({ ...s, save: 'pending' }))
      let saved: FishingRecord
      try {
        if (photoBlob) {
          setSteps((s) => ({ ...s, photo: 'pending' }))
        }

        saved = await addRecord(
          {
            recordedAt: recordedAt.toISOString(),
            latitude: conditions.latitude,
            longitude: conditions.longitude,
            locationName: conditions.locationName,
            temperature: conditions.temperature,
            weatherCode: conditions.weatherCode,
            windSpeedMs: conditions.windSpeedMs,
            dawnAt,
            sunriseAt,
            sunsetAt,
            duskAt,
            tideLevel: conditions.tideLevel,
            tideHarbor: conditions.tideHarbor,
            tideCycle: conditions.tideCycle,
            moonPhase: conditions.moonPhase,
            moonAge: conditions.moonAge,
            tideSlopeCmPerHour: conditions.tideSlopeCmPerHour,
            fishSpecies: blank ? null : input.fishSpecies,
            fishCount: blank ? null : input.fishCount,
            fishSizeCm: blank ? null : input.fishSizeCm,
            fishWeightG: blank ? null : input.fishWeightG,
            tackle: input.tackle,
            photoKey: null,
            editedFields: [],
            tripId,
            kind,
          },
          photoBlob,
        )

        setSteps((s) => ({ ...s, save: 'ok' }))
        if (photoBlob) {
          if (saved.photoKey) {
            setSteps((s) => ({ ...s, photo: 'ok' }))
          } else {
            const message = '写真は端末に保存しました。クラウドへのアップロードは後で再試行されます'
            warnings.push(message)
            setSteps((s) => ({ ...s, photo: 'error' }))
            setErrors((e) => ({ ...e, photo: message }))
          }
        }
      } catch (err) {
        const message = errMessage(err, '保存に失敗しました')
        setSteps((s) => ({ ...s, save: 'error', photo: photoBlob ? 'error' : s.photo }))
        setErrors((e) => ({ ...e, save: message }))
        throw new Error(message)
      }

      const result = { record: saved, warnings }
      setLastResult(result)
      return result
    } finally {
      setBusy(false)
    }
  }, [])

  return { busy, steps, errors, lastResult, record, captureConditions, reset }
}
