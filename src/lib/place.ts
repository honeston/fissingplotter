import { fetchCurrentPlace } from './api'
import { isCloudSyncEnabled } from './config'

const CACHE_TTL_MS = 30 * 60 * 1000
const memoryCache = new Map<string, { name: string; expiresAt: number }>()

function gridKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}#${longitude.toFixed(4)}`
}

function readMemory(key: string): string | null {
  const hit = memoryCache.get(key)
  if (!hit) return null
  if (hit.expiresAt <= Date.now()) {
    memoryCache.delete(key)
    return null
  }
  return hit.name
}

/**
 * GPS 座標から町名までの場所名を返す。数字・丁目・番地は含めない。
 * Nominatim は Lambda 経由（User-Agent 必須のためブラウザ直叩きしない）。
 */
export async function fetchPlaceName(
  latitude: number,
  longitude: number,
): Promise<string> {
  if (!isCloudSyncEnabled()) {
    throw new Error('場所名の取得にはクラウド同期の設定が必要です')
  }

  const key = gridKey(latitude, longitude)
  const cached = readMemory(key)
  if (cached) return cached

  const name = await fetchCurrentPlace(latitude, longitude)
  memoryCache.set(key, { name, expiresAt: Date.now() + CACHE_TTL_MS })
  return name
}
