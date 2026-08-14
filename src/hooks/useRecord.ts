import { useCallback, useState } from 'react'
import { getCurrentPosition } from '../lib/geolocation'
import { fetchPlaceName } from '../lib/place'
import { addRecord } from '../lib/sync'
import { getSunTimes } from '../lib/sun'
import { fetchTideLevel } from '../lib/tide'
import { fetchWeather } from '../lib/weather'
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
        const sun = getSunTimes(new Date(), latitude, longitude)
        if (sun) {
          dawnAt = sun.dawnAt
          sunriseAt = sun.sunriseAt
          sunsetAt = sun.sunsetAt
          duskAt = sun.duskAt
        }

        const [weatherSettled, tideSettled, placeSettled] = await Promise.allSettled([
          fetchWeather(latitude, longitude),
          fetchTideLevel(latitude, longitude),
          fetchPlaceName(latitude, longitude),
        ])

        if (weatherSettled.status === 'fulfilled') {
          temperature = weatherSettled.value.temperature
          weatherCode = weatherSettled.value.weatherCode
          windSpeedMs = weatherSettled.value.windSpeedMs
        } else {
          const message = errMessage(weatherSettled.reason, '天気の取得に失敗しました')
          warnings.push(message)
          nextErrors.weather = message
        }

        if (placeSettled.status === 'fulfilled') {
          locationName = placeSettled.value
        }

        if (tideSettled.status === 'fulfilled') {
          tideLevel = tideSettled.value.levelCm
          tideHarbor = tideSettled.value.harbor.name
          tideCycle = tideSettled.value.tideCycle
          moonPhase = tideSettled.value.moonPhase
          moonAge = tideSettled.value.moonAge
          tideSlopeCmPerHour = tideSettled.value.tideSlopeCmPerHour
        } else {
          const message = errMessage(tideSettled.reason, '潮位の取得に失敗しました')
          warnings.push(message)
          nextErrors.tide = message
        }

        setSteps((s) => ({
          ...s,
          weather: weatherSettled.status === 'fulfilled' ? 'ok' : 'error',
          tide: tideSettled.status === 'fulfilled' ? 'ok' : 'error',
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
