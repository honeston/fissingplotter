import { fetchCurrentTide } from './api'
import { awsConfig } from './config'

export interface TideResult {
  levelCm: number
  time: string
  harbor: { name: string }
  distanceKm: number
  tideCycle: string | null
  moonPhase: string | null
  moonAge: number | null
  tideSlopeCmPerHour: number | null
}

/**
 * GPS 座標から最寄推算点の天文潮位（cm）と月齢・潮種・傾きを取得する。
 * 海しる潮汐推算 API を Lambda 経由で呼ぶ（クラウド必須）。
 */
export async function fetchTideLevel(
  latitude: number,
  longitude: number,
  at: Date = new Date(),
): Promise<TideResult> {
  if (!awsConfig.apiUrl) {
    throw new Error('潮位 API が設定されていません')
  }

  const tide = await fetchCurrentTide(latitude, longitude, at)
  return {
    levelCm: tide.levelCm,
    time: tide.time,
    harbor: { name: tide.stationName },
    distanceKm: tide.distanceKm,
    tideCycle: tide.tideCycle,
    moonPhase: tide.moonPhase,
    moonAge: tide.moonAge,
    tideSlopeCmPerHour: tide.tideSlopeCmPerHour,
  }
}
