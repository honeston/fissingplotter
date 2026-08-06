export interface WeatherResult {
  temperature: number
  time: string
}

/**
 * Open-Meteo で現在気温（℃）を取得する。APIキー不要。
 */
export async function fetchTemperature(
  latitude: number,
  longitude: number,
): Promise<WeatherResult> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('current', 'temperature_2m')
  url.searchParams.set('timezone', 'Asia/Tokyo')

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`気温の取得に失敗しました（HTTP ${res.status}）`)
  }

  const data = (await res.json()) as {
    current?: { temperature_2m?: number; time?: string }
  }

  const temperature = data.current?.temperature_2m
  if (typeof temperature !== 'number') {
    throw new Error('気温データが含まれていません')
  }

  return {
    temperature,
    time: data.current?.time ?? new Date().toISOString(),
  }
}
