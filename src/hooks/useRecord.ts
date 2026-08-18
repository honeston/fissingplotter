import { useCallback, useState } from 'react'
import { fetchDerivedConditions } from '../lib/conditions'
import { getCurrentPosition } from '../lib/geolocation'
import { addRecord } from '../lib/sync'
import type { FishingRecord, RecordFormInput } from '../types/record'

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

/**
 * 記録ボタン押下時: GPS → 天気・気温/潮位並列 → IndexedDB 保存 → 写真アップロード。
 * GPS 失敗時も座標なしで保存可。天気・潮位は座標がない場合スキップ。
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

  const record = useCallback(async (input: RecordFormInput): Promise<RecordResult> => {
    setBusy(true)
    setLastResult(null)
    setErrors({})
    setSteps({
      geo: 'pending',
      weather: 'idle',
      tide: 'idle',
      save: 'idle',
      photo: input.photoBlob ? 'idle' : 'skipped',
    })

    try {
      const warnings: string[] = []
      const nextErrors: RecordStepErrors = {}
      let latitude: number | null = null
      let longitude: number | null = null
      const recordedAt = new Date()

      try {
        const pos = await getCurrentPosition()
        latitude = pos.latitude
        longitude = pos.longitude
        setSteps((s) => ({ ...s, geo: 'ok', weather: 'pending', tide: 'pending' }))
      } catch (err) {
        const message = errMessage(err, '位置情報の取得に失敗しました')
        warnings.push(message)
        nextErrors.geo = message
        setSteps((s) => ({ ...s, geo: 'error', weather: 'skipped', tide: 'skipped' }))
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
        const derived = await fetchDerivedConditions(
          latitude,
          longitude,
          recordedAt,
          'current',
        )
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
        if (derived.errors.weather) nextErrors.weather = derived.errors.weather
        if (derived.errors.tide) nextErrors.tide = derived.errors.tide
        setSteps((s) => ({
          ...s,
          weather: derived.weatherStatus,
          tide: derived.tideStatus,
        }))
      }

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors)
      }

      setSteps((s) => ({ ...s, save: 'pending' }))
      let saved: FishingRecord
      try {
        if (input.photoBlob) {
          setSteps((s) => ({ ...s, photo: 'pending' }))
        }

        saved = await addRecord(
          {
            recordedAt: recordedAt.toISOString(),
            latitude,
            longitude,
            locationName,
            temperature,
            weatherCode,
            windSpeedMs,
            dawnAt,
            sunriseAt,
            sunsetAt,
            duskAt,
            tideLevel,
            tideHarbor,
            tideCycle,
            moonPhase,
            moonAge,
            tideSlopeCmPerHour,
            fishSpecies: input.fishSpecies,
            fishSizeCm: input.fishSizeCm,
            photoKey: null,
            editedFields: [],
          },
          input.photoBlob,
        )

        setSteps((s) => ({ ...s, save: 'ok' }))
        if (input.photoBlob) {
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
        setSteps((s) => ({ ...s, save: 'error', photo: input.photoBlob ? 'error' : s.photo }))
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

  return { busy, steps, errors, lastResult, record, reset }
}
