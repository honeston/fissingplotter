import { fetchPlaceName } from './place'
import { getSunTimes } from './sun'
import { fetchTideLevel } from './tide'
import { fetchWeather } from './weather'

export interface DerivedConditions {
  locationName: string | null
  temperature: number | null
  weatherCode: number | null
  windSpeedMs: number | null
  dawnAt: string | null
  sunriseAt: string | null
  sunsetAt: string | null
  duskAt: string | null
  tideLevel: number | null
  tideHarbor: string | null
  tideCycle: string | null
  moonPhase: string | null
  moonAge: number | null
  tideSlopeCmPerHour: number | null
}

export interface ConditionsResult {
  conditions: DerivedConditions
  weatherStatus: 'ok' | 'error' | 'skipped'
  tideStatus: 'ok' | 'error'
  warnings: string[]
  errors: { weather?: string; tide?: string }
}

export interface FetchDerivedConditionsOptions {
  /** false のとき天気は取得せず、記録済みの値を維持する */
  includeWeather?: boolean
}

function errMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export function emptyConditions(): DerivedConditions {
  return {
    locationName: null,
    temperature: null,
    weatherCode: null,
    windSpeedMs: null,
    dawnAt: null,
    sunriseAt: null,
    sunsetAt: null,
    duskAt: null,
    tideLevel: null,
    tideHarbor: null,
    tideCycle: null,
    moonPhase: null,
    moonAge: null,
    tideSlopeCmPerHour: null,
  }
}

/**
 * 座標と時刻から場所名・天気・太陽・潮位を取得する。
 * 編集時は includeWeather: false で保存済み天気を維持する。
 */
export async function fetchDerivedConditions(
  latitude: number,
  longitude: number,
  at: Date,
  options: FetchDerivedConditionsOptions = {},
): Promise<ConditionsResult> {
  const includeWeather = options.includeWeather !== false
  const conditions = emptyConditions()
  const warnings: string[] = []
  const errors: ConditionsResult['errors'] = {}

  const sun = getSunTimes(at, latitude, longitude)
  if (sun) {
    conditions.dawnAt = sun.dawnAt
    conditions.sunriseAt = sun.sunriseAt
    conditions.sunsetAt = sun.sunsetAt
    conditions.duskAt = sun.duskAt
  }

  const weatherPromise = includeWeather
    ? fetchWeather(latitude, longitude)
    : Promise.resolve(null)

  const [weatherSettled, tideSettled, placeSettled] = await Promise.allSettled([
    weatherPromise,
    fetchTideLevel(latitude, longitude, at),
    fetchPlaceName(latitude, longitude),
  ])

  if (includeWeather) {
    if (weatherSettled.status === 'fulfilled' && weatherSettled.value) {
      conditions.temperature = weatherSettled.value.temperature
      conditions.weatherCode = weatherSettled.value.weatherCode
      conditions.windSpeedMs = weatherSettled.value.windSpeedMs
    } else {
      const reason =
        weatherSettled.status === 'rejected' ? weatherSettled.reason : null
      const message = errMessage(reason, '天気の取得に失敗しました')
      warnings.push(message)
      errors.weather = message
    }
  }

  if (placeSettled.status === 'fulfilled') {
    conditions.locationName = placeSettled.value
  } else {
    warnings.push('場所名の取得に失敗したため、座標のみ保存します')
  }

  if (tideSettled.status === 'fulfilled') {
    conditions.tideLevel = tideSettled.value.levelCm
    conditions.tideHarbor = tideSettled.value.harbor.name
    conditions.tideCycle = tideSettled.value.tideCycle
    conditions.moonPhase = tideSettled.value.moonPhase
    conditions.moonAge = tideSettled.value.moonAge
    conditions.tideSlopeCmPerHour = tideSettled.value.tideSlopeCmPerHour
  } else {
    const message = errMessage(tideSettled.reason, '潮位の取得に失敗しました')
    warnings.push(message)
    errors.tide = message
  }

  return {
    conditions,
    weatherStatus: includeWeather
      ? weatherSettled.status === 'fulfilled' && weatherSettled.value
        ? 'ok'
        : 'error'
      : 'skipped',
    tideStatus: tideSettled.status === 'fulfilled' ? 'ok' : 'error',
    warnings,
    errors,
  }
}
