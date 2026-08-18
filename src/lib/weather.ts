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

function jstDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

interface HourlyWeather {
  time: string[]
  temperature_2m?: (number | null)[]
  weather_code?: (number | null)[]
  wind_speed_10m?: (number | null)[]
}

function parseHourlyWeather(hourly: HourlyWeather, at: Date): WeatherResult | null {
  if (!hourly.time?.length) return null

  let bestIndex = 0
  let bestDiff = Infinity
  for (let i = 0; i < hourly.time.length; i++) {
    const stamp = hourly.time[i]
    const ms = new Date(
      stamp.includes('T') && !stamp.includes('+') && !stamp.endsWith('Z')
        ? `${stamp}+09:00`
        : stamp,
    ).getTime()
    if (Number.isNaN(ms)) continue
    const diff = Math.abs(ms - at.getTime())
    if (diff < bestDiff) {
      bestDiff = diff
      bestIndex = i
    }
  }

  const temperature = hourly.temperature_2m?.[bestIndex]
  const weatherCode = hourly.weather_code?.[bestIndex]
  const windSpeed = hourly.wind_speed_10m?.[bestIndex]
  if (typeof temperature !== 'number' || typeof weatherCode !== 'number') {
    return null
  }

  return {
    temperature,
    weatherCode,
    windSpeedMs:
      typeof windSpeed === 'number' && Number.isFinite(windSpeed)
        ? Math.round(windSpeed * 10) / 10
        : null,
    time: hourly.time[bestIndex],
  }
}

async function fetchHourlyWeather(
  latitude: number,
  longitude: number,
  dateKey: string,
  endpoint: string,
): Promise<HourlyWeather | null> {
  const url = new URL(endpoint)
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('hourly', 'temperature_2m,weather_code,wind_speed_10m')
  url.searchParams.set('start_date', dateKey)
  url.searchParams.set('end_date', dateKey)
  url.searchParams.set('wind_speed_unit', 'ms')
  url.searchParams.set('timezone', 'Asia/Tokyo')

  const res = await fetch(url)
  if (!res.ok) return null

  const data = (await res.json()) as { hourly?: HourlyWeather }
  return data.hourly ?? null
}

/**
 * 指定時刻の気温・天気コード・風速。直近は予報API、古い日付はアーカイブAPI。
 */
export async function fetchWeatherAt(
  latitude: number,
  longitude: number,
  at: Date,
): Promise<WeatherResult> {
  const dateKey = jstDateKey(at)
  const endpoints = [
    'https://api.open-meteo.com/v1/forecast',
    'https://archive-api.open-meteo.com/v1/archive',
  ]

  for (const endpoint of endpoints) {
    const hourly = await fetchHourlyWeather(latitude, longitude, dateKey, endpoint)
    const picked = hourly ? parseHourlyWeather(hourly, at) : null
    if (picked) return picked
  }

  throw new Error('指定時刻の天気データが含まれていません')
}
