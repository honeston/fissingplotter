import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { createDynamoClient } from './awsClients.js'

const CACHE_TABLE = process.env.WEATHER_CACHE_TABLE ?? ''
const API_KEY = process.env.OPENWEATHER_API_KEY ?? ''
const CACHE_TTL_SEC = 15 * 60

const doc = createDynamoClient()

export interface WeatherPayload {
  temperature: number
  weatherCode: number
  windSpeedMs: number | null
  time: string
}

function gridKey(latitude: number, longitude: number): string {
  const lat = (Math.round(latitude * 100) / 100).toFixed(2)
  const lng = (Math.round(longitude * 100) / 100).toFixed(2)
  return `w#${lat}#${lng}`
}

/** OpenWeatherMap condition id → WMO 相当コード（既存 UI ラベル互換） */
export function owmIdToWmo(id: number): number {
  if (id === 800) return 0
  if (id === 801) return 1
  if (id === 802) return 2
  if (id === 803 || id === 804) return 3
  if (id >= 200 && id < 300) return id >= 230 ? 99 : 95
  if (id >= 300 && id < 400) {
    if (id <= 301) return 51
    if (id <= 321) return 53
    return 55
  }
  if (id >= 500 && id < 600) {
    if (id === 500) return 61
    if (id <= 504) return 63
    if (id === 511) return 67
    if (id >= 520) return 82
    if (id >= 510) return 81
    return 65
  }
  if (id >= 600 && id < 700) {
    if (id === 600) return 71
    if (id === 601) return 73
    if (id === 602) return 75
    if (id === 611 || id === 612) return 77
    return 86
  }
  if (id >= 700 && id < 800) return 45
  return 3
}

async function readCache(cacheKey: string): Promise<WeatherPayload | null> {
  if (!CACHE_TABLE) return null

  const result = await doc.send(
    new GetCommand({
      TableName: CACHE_TABLE,
      Key: { cacheKey },
    }),
  )

  const item = result.Item
  if (!item) return null

  const expiresAt = Number(item.expiresAt)
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return null
  }

  const temperature = Number(item.temperature)
  const weatherCode = Number(item.weatherCode)
  if (!Number.isFinite(temperature) || !Number.isFinite(weatherCode)) return null

  const windSpeedMs =
    item.windSpeedMs == null || item.windSpeedMs === ''
      ? null
      : Number(item.windSpeedMs)

  return {
    temperature,
    weatherCode,
    windSpeedMs: Number.isFinite(windSpeedMs) ? windSpeedMs : null,
    time: typeof item.time === 'string' ? item.time : new Date().toISOString(),
  }
}

async function writeCache(cacheKey: string, weather: WeatherPayload): Promise<void> {
  if (!CACHE_TABLE) return

  const expiresAt = Math.floor(Date.now() / 1000) + CACHE_TTL_SEC
  await doc.send(
    new PutCommand({
      TableName: CACHE_TABLE,
      Item: {
        cacheKey,
        temperature: weather.temperature,
        weatherCode: weather.weatherCode,
        windSpeedMs: weather.windSpeedMs,
        time: weather.time,
        expiresAt,
      },
    }),
  )
}

async function fetchFromOpenWeather(latitude: number, longitude: number): Promise<WeatherPayload> {
  if (!API_KEY) {
    throw new Error('Weather API is not configured')
  }

  const url = new URL('https://api.openweathermap.org/data/2.5/weather')
  url.searchParams.set('lat', String(latitude))
  url.searchParams.set('lon', String(longitude))
  url.searchParams.set('appid', API_KEY)
  url.searchParams.set('units', 'metric')

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`OpenWeather request failed (${res.status})`)
  }

  const data = (await res.json()) as {
    main?: { temp?: number }
    wind?: { speed?: number }
    weather?: { id?: number }[]
    dt?: number
  }

  const temperature = data.main?.temp
  const owmId = data.weather?.[0]?.id
  if (typeof temperature !== 'number' || typeof owmId !== 'number') {
    throw new Error('Invalid OpenWeather response')
  }

  const wind = data.wind?.speed
  const time =
    typeof data.dt === 'number'
      ? new Date(data.dt * 1000).toISOString()
      : new Date().toISOString()

  return {
    temperature: Math.round(temperature * 10) / 10,
    weatherCode: owmIdToWmo(owmId),
    windSpeedMs:
      typeof wind === 'number' && Number.isFinite(wind)
        ? Math.round(wind * 10) / 10
        : null,
    time,
  }
}

export async function getCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherPayload> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Invalid coordinates')
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Invalid coordinates')
  }

  const cacheKey = gridKey(latitude, longitude)
  const cached = await readCache(cacheKey)
  if (cached) return cached

  const weather = await fetchFromOpenWeather(latitude, longitude)
  await writeCache(cacheKey, weather)
  return weather
}
