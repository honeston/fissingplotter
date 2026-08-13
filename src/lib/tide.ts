import harborsData from './harbors.json'

export interface Harbor {
  pc: number
  hc: number
  name: string
  nameEn?: string
  lat: number
  lng: number
}

export interface TideResult {
  levelCm: number
  time: string
  harbor: Harbor
  distanceKm: number
  tideCycle: string | null
  moonPhase: string | null
  moonAge: number | null
  tideSlopeCmPerHour: number | null
}

const harbors = harborsData as Harbor[]

const EARTH_RADIUS_KM = 6371

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

/** Haversine 距離（km） */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

export function findNearestHarbor(latitude: number, longitude: number): {
  harbor: Harbor
  distanceKm: number
} {
  let best: Harbor | null = null
  let bestDist = Infinity

  for (const h of harbors) {
    const d = distanceKm(latitude, longitude, h.lat, h.lng)
    if (d < bestDist) {
      bestDist = d
      best = h
    }
  }

  if (!best) {
    throw new Error('港マスタが空です')
  }

  return { harbor: best, distanceKm: bestDist }
}

interface TidePoint {
  time: string
  unix: number
  cm: number
}

interface TideMoon {
  title?: string
  name?: string
  age?: string | number
}

interface TideApiResponse {
  status: number
  message?: string
  tide?: {
    chart?: Record<
      string,
      {
        tide?: TidePoint[]
        moon?: TideMoon
      }
    >
  }
}

function jstParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  }
}

function pickNearestTideIndex(points: TidePoint[], nowMs: number): number {
  if (points.length === 0) {
    throw new Error('潮位時系列が空です')
  }

  let bestIndex = 0
  let bestDiff = Math.abs(points[0].unix - nowMs)
  for (let i = 1; i < points.length; i++) {
    const diff = Math.abs(points[i].unix - nowMs)
    if (diff < bestDiff) {
      bestIndex = i
      bestDiff = diff
    }
  }
  return bestIndex
}

/** 前後20分点があれば中央差分、端点なら片側差分（cm/h）。 */
function computeTideSlopeCmPerHour(series: TidePoint[], index: number): number {
  const curr = series[index]
  const prev = series[index - 1]
  const next = series[index + 1]

  let deltaCm: number
  let deltaMs: number
  if (prev && next) {
    deltaCm = next.cm - prev.cm
    deltaMs = next.unix - prev.unix
  } else if (next) {
    deltaCm = next.cm - curr.cm
    deltaMs = next.unix - curr.unix
  } else if (prev) {
    deltaCm = curr.cm - prev.cm
    deltaMs = curr.unix - prev.unix
  } else {
    return 0
  }

  if (deltaMs === 0) return 0
  return Math.round((deltaCm / deltaMs) * 3_600_000 * 10) / 10
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function optionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * GPS 座標から最寄港の現在潮位（天文潮位 cm）と月齢・潮種・傾きを取得する。
 */
export async function fetchTideLevel(
  latitude: number,
  longitude: number,
  at: Date = new Date(),
): Promise<TideResult> {
  const { harbor, distanceKm: dist } = findNearestHarbor(latitude, longitude)
  const jst = jstParts(at)

  const url = new URL('https://tide736.net/api/get_tide.php')
  url.searchParams.set('pc', String(harbor.pc))
  url.searchParams.set('hc', String(harbor.hc))
  url.searchParams.set('yr', jst.year)
  url.searchParams.set('mn', jst.month)
  url.searchParams.set('dy', jst.day)
  url.searchParams.set('rg', 'day')

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`潮位の取得に失敗しました（HTTP ${res.status}）`)
  }

  const data = (await res.json()) as TideApiResponse
  if (data.status !== 1 || !data.tide?.chart) {
    throw new Error(data.message ?? '潮位データの取得に失敗しました')
  }

  const dateKey = `${jst.year}-${jst.month}-${jst.day}`
  const day = data.tide.chart[dateKey]
  const series = day?.tide
  if (!series?.length) {
    throw new Error(`${harbor.name} の潮位時系列がありません`)
  }

  const nearestIndex = pickNearestTideIndex(series, at.getTime())
  const nearest = series[nearestIndex]
  const moon = day?.moon

  return {
    levelCm: nearest.cm,
    time: nearest.time,
    harbor,
    distanceKm: dist,
    tideCycle: optionalString(moon?.title),
    moonPhase: optionalString(moon?.name),
    moonAge: optionalNumber(moon?.age),
    tideSlopeCmPerHour: computeTideSlopeCmPerHour(series, nearestIndex),
  }
}

export function getHarborCount(): number {
  return harbors.length
}
