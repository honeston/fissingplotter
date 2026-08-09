import { useCallback, useState } from 'react'
import { getCurrentPosition } from '../lib/geolocation'
import { addRecord } from '../lib/sync'
import { fetchTideLevel } from '../lib/tide'
import { fetchTemperature } from '../lib/weather'
import type { FishingRecord } from '../types/record'

export type StepState = 'idle' | 'pending' | 'ok' | 'error' | 'skipped'

export interface RecordSteps {
  geo: StepState
  weather: StepState
  tide: StepState
  save: StepState
}

export interface RecordStepErrors {
  geo?: string
  weather?: string
  tide?: string
  save?: string
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
}

function errMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

/**
 * 記録ボタン押下時: GPS → 気温/潮位並列 → IndexedDB 保存。
 * GPS 失敗時は保存しない。気温・潮位は失敗しても null で保存可。
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

  const record = useCallback(async (fishSpecies: string | null): Promise<RecordResult> => {
    setBusy(true)
    setLastResult(null)
    setErrors({})
    setSteps({
      geo: 'pending',
      weather: 'idle',
      tide: 'idle',
      save: 'idle',
    })

    try {
      let latitude: number
      let longitude: number

      try {
        const pos = await getCurrentPosition()
        latitude = pos.latitude
        longitude = pos.longitude
        setSteps((s) => ({ ...s, geo: 'ok', weather: 'pending', tide: 'pending' }))
      } catch (err) {
        const message = errMessage(err, '位置情報の取得に失敗しました')
        setSteps((s) => ({ ...s, geo: 'error' }))
        setErrors({ geo: message })
        throw new Error(message)
      }

      const warnings: string[] = []
      let temperature: number | null = null
      let tideLevel: number | null = null
      let tideHarbor: string | null = null

      const [weatherSettled, tideSettled] = await Promise.allSettled([
        fetchTemperature(latitude, longitude),
        fetchTideLevel(latitude, longitude),
      ])

      const nextErrors: RecordStepErrors = {}

      if (weatherSettled.status === 'fulfilled') {
        temperature = weatherSettled.value.temperature
      } else {
        const message = errMessage(weatherSettled.reason, '気温の取得に失敗しました')
        warnings.push(message)
        nextErrors.weather = message
      }

      if (tideSettled.status === 'fulfilled') {
        tideLevel = tideSettled.value.levelCm
        tideHarbor = tideSettled.value.harbor.name
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
      if (Object.keys(nextErrors).length > 0) {
        setErrors((e) => ({ ...e, ...nextErrors }))
      }

      setSteps((s) => ({ ...s, save: 'pending' }))
      try {
        const saved = await addRecord({
          latitude,
          longitude,
          temperature,
          tideLevel,
          tideHarbor,
          fishSpecies,
        })
        setSteps((s) => ({ ...s, save: 'ok' }))
        const result = { record: saved, warnings }
        setLastResult(result)
        return result
      } catch (err) {
        const message = errMessage(err, '保存に失敗しました')
        setSteps((s) => ({ ...s, save: 'error' }))
        setErrors((e) => ({ ...e, save: message }))
        throw new Error(message)
      }
    } finally {
      setBusy(false)
    }
  }, [])

  return { busy, steps, errors, lastResult, record, reset }
}
