import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { createDynamoClient } from './awsClients.js'
import { moonAgeDays, moonPhaseFromAge, tideCycleFromMoonAge } from './moon.js'
import stationsData from './tideStations.json'

function cacheTable(): string {
  return process.env.WEATHER_CACHE_TABLE ?? ''
}

function msilKey(): string {
  return process.env.MSIL_SUBSCRIPTION_KEY ?? ''
}
const MSIL_BASE = 'https://api.msil.go.jp/tide-prediction/v3'
const EARTH_RADIUS_KM = 6371

interface TideStation {
  code: string
  name: string
  nameEn: string | null
  lat: number
  lng: number
}

const stations = stationsData as TideStation[]
const doc = createDynamoClient()

export interface TidePayload {
  levelCm: number
  time: string
  stationCode: string
  stationName: string
  distanceKm: number
  tideCycle: string
  moonPhase: string
  moonAge: number
  tideSlopeCmPerHour: number
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

export function findNearestStation(
  latitude: number,
  longitude: number,
): { station: TideStation; distanceKm: number } {
  let best: TideStation | null = null
  let bestDist = Infinity
  for (const s of stations) {
    const d = distanceKm(latitude, longitude, s.lat, s.lng)
    if (d < bestDist) {
      bestDist = d
      best = s
    }
  }
  if (!best) throw new Error('Tide station master is empty')
  return { station: best, distanceKm: Math.round(bestDist * 10) / 10 }
}

function jstDateKey(at: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}${get('month')}${get('day')}`
}

interface DaySeries {
  startMs: number
  intervalSec: number
  levels: number[]
}

async function readSeriesCache(cacheKey: string): Promise<DaySeries | null> {
  const table = cacheTable()
  if (!table) return null
  const result = await doc.send(
    new GetCommand({ TableName: table, Key: { cacheKey } }),
  )
  const item = result.Item
  if (!item) return null
  const expiresAt = Number(item.expiresAt)
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return null
  }
  const levels = item.levels
  if (!Array.isArray(levels) || levels.length === 0) return null
  const startMs = Date.parse(String(item.startTime ?? ''))
  const intervalSec = Number(item.intervalSec ?? 60)
  if (!Number.isFinite(startMs) || !Number.isFinite(intervalSec)) return null
  return {
    startMs,
    intervalSec,
    levels: levels.map((n) => Number(n)).filter((n) => Number.isFinite(n)),
  }
}

async function writeSeriesCache(cacheKey: string, series: DaySeries, dateKey: string): Promise<void> {
  const table = cacheTable()
  if (!table) return
  const nowSec = Math.floor(Date.now() / 1000)
  const todayKey = jstDateKey(new Date())
  // 当日は短め、過去日は長め（推算値は変わらない）
  const ttlSec = dateKey === todayKey ? 6 * 3600 : 30 * 24 * 3600
  await doc.send(
    new PutCommand({
      TableName: table,
      Item: {
        cacheKey,
        startTime: new Date(series.startMs).toISOString(),
        intervalSec: series.intervalSec,
        levels: series.levels,
        expiresAt: nowSec + ttlSec,
      },
    }),
  )
}

async function fetchDaySeries(stationCode: string, dateKey: string): Promise<DaySeries> {
  const key = msilKey()
  if (!key) {
    throw new Error('Tide API is not configured')
  }

  const url = new URL(`${MSIL_BASE}/data`)
  url.searchParams.set('stationCode', stationCode)
  url.searchParams.set('date', dateKey)

  const res = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': key },
  })
  if (!res.ok) {
    throw new Error(`MSIL tide request failed (${res.status})`)
  }

  const data = (await res.json()) as {
    time?: string
    interval?: number
    tide?: number[]
  }
  if (!data.time || !Array.isArray(data.tide) || data.tide.length === 0) {
    throw new Error('Invalid MSIL tide response')
  }

  const startMs = Date.parse(data.time)
  if (!Number.isFinite(startMs)) {
    throw new Error('Invalid MSIL tide start time')
  }

  return {
    startMs,
    intervalSec: typeof data.interval === 'number' && data.interval > 0 ? data.interval : 60,
    levels: data.tide,
  }
}

async function getDaySeries(stationCode: string, dateKey: string): Promise<DaySeries> {
  const cacheKey = `t#series#${stationCode}#${dateKey}`
  const cached = await readSeriesCache(cacheKey)
  if (cached) return cached

  const series = await fetchDaySeries(stationCode, dateKey)
  await writeSeriesCache(cacheKey, series, dateKey)
  return series
}

function pickNearestIndex(series: DaySeries, atMs: number): number {
  const { startMs, intervalSec, levels } = series
  const idx = Math.round((atMs - startMs) / (intervalSec * 1000))
  return Math.max(0, Math.min(levels.length - 1, idx))
}

function slopeCmPerHour(series: DaySeries, index: number): number {
  const { intervalSec, levels } = series
  const curr = levels[index]
  const prev = levels[index - 1]
  const next = levels[index + 1]
  let deltaCm: number
  let deltaMs: number
  if (prev != null && next != null) {
    deltaCm = next - prev
    deltaMs = 2 * intervalSec * 1000
  } else if (next != null) {
    deltaCm = next - curr
    deltaMs = intervalSec * 1000
  } else if (prev != null) {
    deltaCm = curr - prev
    deltaMs = intervalSec * 1000
  } else {
    return 0
  }
  if (deltaMs === 0) return 0
  return Math.round((deltaCm / deltaMs) * 3_600_000 * 10) / 10
}

export async function getTideAt(
  latitude: number,
  longitude: number,
  at: Date = new Date(),
): Promise<TidePayload> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Invalid coordinates')
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Invalid coordinates')
  }

  const { station, distanceKm: dist } = findNearestStation(latitude, longitude)
  const dateKey = jstDateKey(at)
  const series = await getDaySeries(station.code, dateKey)
  const index = pickNearestIndex(series, at.getTime())
  const levelCm = series.levels[index]
  const sampleMs = series.startMs + index * series.intervalSec * 1000
  const age = moonAgeDays(at)

  return {
    levelCm,
    time: new Date(sampleMs).toISOString(),
    stationCode: station.code,
    stationName: station.name,
    distanceKm: dist,
    tideCycle: tideCycleFromMoonAge(age),
    moonPhase: moonPhaseFromAge(age),
    moonAge: age,
    tideSlopeCmPerHour: slopeCmPerHour(series, index),
  }
}
