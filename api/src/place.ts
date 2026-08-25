import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { createDynamoClient } from './awsClients.js'

const CACHE_TABLE = process.env.WEATHER_CACHE_TABLE ?? ''
const CACHE_TTL_SEC = 30 * 60
const USER_AGENT = 'cast-mark/1.0 (https://github.com/honeston/fissingplotter)'
const MIN_INTERVAL_MS = 1100

const doc = createDynamoClient()
let lastNominatimAt = 0

interface NominatimAddress {
  province?: string
  state?: string
  city?: string
  town?: string
  village?: string
  county?: string
  city_district?: string
  suburb?: string
  quarter?: string
  neighbourhood?: string
  hamlet?: string
}

function stripNumericDetail(part: string): string {
  return part
    .replace(/[0-9０-９一二三四五六七八九十百]+丁目/g, '')
    .replace(/[0-9０-９一二三四五六七八九十]+番地?/g, '')
    .replace(/[0-9０-９]+号.*/g, '')
    .replace(/[0-9０-９]+/g, '')
    .replace(/丁目/g, '')
    .trim()
}

function isUsefulPart(part: string): boolean {
  if (!part) return false
  if (part === '日本' || part === 'Japan') return false
  if (/^\d{3}-?\d{4}$/.test(part)) return false
  return true
}

function appendUnique(parts: string[], value: string | undefined) {
  if (!value || !isUsefulPart(value)) return
  const cleaned = stripNumericDetail(value)
  if (!cleaned) return
  if (parts.includes(cleaned)) return
  if (parts.some((p) => p.includes(cleaned))) return
  const overlapping = parts.findIndex((p) => cleaned.includes(p))
  if (overlapping >= 0) {
    parts[overlapping] = cleaned
    return
  }
  parts.push(cleaned)
}

export function formatCoarseAddress(address: NominatimAddress): string | null {
  const parts: string[] = []
  appendUnique(parts, address.province ?? address.state)
  appendUnique(parts, address.city ?? address.town ?? address.village ?? address.county)
  appendUnique(parts, address.city_district)
  appendUnique(parts, address.suburb)
  appendUnique(parts, address.quarter)
  appendUnique(parts, address.neighbourhood)
  appendUnique(parts, address.hamlet)
  return parts.length ? parts.join('') : null
}

function gridKey(latitude: number, longitude: number): string {
  const lat = latitude.toFixed(4)
  const lng = longitude.toFixed(4)
  return `p#${lat}#${lng}`
}

async function readCache(cacheKey: string): Promise<string | null> {
  if (!CACHE_TABLE) return null
  const result = await doc.send(
    new GetCommand({ TableName: CACHE_TABLE, Key: { cacheKey } }),
  )
  const item = result.Item
  if (!item) return null
  const expiresAt = Number(item.expiresAt)
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return null
  }
  return typeof item.placeName === 'string' && item.placeName ? item.placeName : null
}

async function writeCache(cacheKey: string, placeName: string): Promise<void> {
  if (!CACHE_TABLE) return
  await doc.send(
    new PutCommand({
      TableName: CACHE_TABLE,
      Item: {
        cacheKey,
        placeName,
        expiresAt: Math.floor(Date.now() / 1000) + CACHE_TTL_SEC,
      },
    }),
  )
}

async function respectNominatimRateLimit(): Promise<void> {
  const wait = lastNominatimAt + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait))
  }
  lastNominatimAt = Date.now()
}

async function fetchFromNominatim(latitude: number, longitude: number): Promise<string> {
  await respectNominatimRateLimit()

  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('lat', String(latitude))
  url.searchParams.set('lon', String(longitude))
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('accept-language', 'ja')
  url.searchParams.set('zoom', '16')
  url.searchParams.set('addressdetails', '1')

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`Nominatim request failed (${res.status})`)
  }

  const data = (await res.json()) as { address?: NominatimAddress }
  const name = data.address ? formatCoarseAddress(data.address) : null
  if (!name) {
    throw new Error('Invalid Nominatim response')
  }
  return name
}

export async function getPlaceName(latitude: number, longitude: number): Promise<string> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Invalid coordinates')
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Invalid coordinates')
  }

  const cacheKey = gridKey(latitude, longitude)
  const cached = await readCache(cacheKey)
  if (cached) return cached

  const placeName = await fetchFromNominatim(latitude, longitude)
  await writeCache(cacheKey, placeName)
  return placeName
}
