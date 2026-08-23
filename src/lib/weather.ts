import { fetchCurrentWeather as fetchCurrentWeatherApi } from './api'
import { isCloudSyncEnabled } from './config'

export interface WeatherResult {
  temperature: number
  weatherCode: number
  windSpeedMs: number | null
  time: string
}

/**
 * 現在の気温（℃）・天気コード・風速（m/s）を API 経由で取得する。
 * OpenWeatherMap Current Weather（Lambda キャッシュ付きプロキシ）。
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherResult> {
  if (!isCloudSyncEnabled()) {
    throw new Error('天気の取得にはクラウド同期の設定が必要です')
  }
  return fetchCurrentWeatherApi(latitude, longitude)
}
