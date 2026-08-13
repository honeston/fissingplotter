export interface WeatherResult {
  temperature: number
  weatherCode: number
  time: string
}

/**
 * Open-Meteo で現在の気温（℃）と天気コードを取得する。APIキー不要。
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherResult> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('current', 'temperature_2m,weather_code')
  url.searchParams.set('timezone', 'Asia/Tokyo')

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`天気の取得に失敗しました（HTTP ${res.status}）`)
  }

  const data = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number; time?: string }
  }

  const temperature = data.current?.temperature_2m
  const weatherCode = data.current?.weather_code
  if (typeof temperature !== 'number') {
    throw new Error('気温データが含まれていません')
  }
  if (typeof weatherCode !== 'number') {
    throw new Error('天気データが含まれていません')
  }

  return {
    temperature,
    weatherCode,
    time: data.current?.time ?? new Date().toISOString(),
  }
}
