export interface WeatherResult {
  temperature: number
  weatherCode: number
  windSpeedMs: number | null
  time: string
}

/**
 * Open-Meteo で現在の気温（℃）・天気コード・風速（m/s）を取得する。APIキー不要。
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherResult> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m')
  url.searchParams.set('wind_speed_unit', 'ms')
  url.searchParams.set('timezone', 'Asia/Tokyo')

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`天気の取得に失敗しました（HTTP ${res.status}）`)
  }

  const data = (await res.json()) as {
    current?: {
      temperature_2m?: number
      weather_code?: number
      wind_speed_10m?: number
      time?: string
    }
  }

  const temperature = data.current?.temperature_2m
  const weatherCode = data.current?.weather_code
  const windSpeed = data.current?.wind_speed_10m
  if (typeof temperature !== 'number') {
    throw new Error('気温データが含まれていません')
  }
  if (typeof weatherCode !== 'number') {
    throw new Error('天気データが含まれていません')
  }

  return {
    temperature,
    weatherCode,
    windSpeedMs:
      typeof windSpeed === 'number' && Number.isFinite(windSpeed)
        ? Math.round(windSpeed * 10) / 10
        : null,
    time: data.current?.time ?? new Date().toISOString(),
  }
}
