import { useEffect, useState } from 'react'
import { fetchCurrentTide, type CurrentTideResult } from '../lib/api'
import { isCloudSyncEnabled } from '../lib/config'
import { hasCoordinates } from '../lib/coordinates'
import { jstDateKeyFromMs } from '../lib/tideChart'
import type { FishingRecord } from '../types/record'

const memory = new Map<string, CurrentTideResult>()
const inflight = new Map<string, Promise<CurrentTideResult | null>>()

function cacheKey(latitude: number, longitude: number, atMs: number): string {
  return `${latitude.toFixed(3)}:${longitude.toFixed(3)}:${jstDateKeyFromMs(atMs)}`
}

function loadTide(
  latitude: number,
  longitude: number,
  at: Date,
): Promise<CurrentTideResult | null> {
  const key = cacheKey(latitude, longitude, at.getTime())
  const hit = memory.get(key)
  if (hit) return Promise.resolve(hit)
  const pending = inflight.get(key)
  if (pending) return pending

  const request = fetchCurrentTide(latitude, longitude, at)
    .then((data) => {
      if (data.series?.levels?.length >= 2) {
        memory.set(key, data)
      }
      inflight.delete(key)
      return data
    })
    .catch(() => {
      inflight.delete(key)
      return null
    })
  inflight.set(key, request)
  return request
}

export function useTideSeries(
  record: FishingRecord,
  enabled: boolean,
): { data: CurrentTideResult | null; loading: boolean } {
  const coords = hasCoordinates(record)
  const cloud = isCloudSyncEnabled()
  const atMs = Date.parse(record.recordedAt)
  const lat = coords ? record.latitude : null
  const lng = coords ? record.longitude : null
  const canLoad =
    enabled && cloud && lat != null && lng != null && Number.isFinite(atMs)

  const [data, setData] = useState<CurrentTideResult | null>(() => {
    if (!canLoad || lat == null || lng == null) return null
    return memory.get(cacheKey(lat, lng, atMs)) ?? null
  })
  const [loading, setLoading] = useState(canLoad && data == null)

  useEffect(() => {
    if (!canLoad || lat == null || lng == null) {
      setData(null)
      setLoading(false)
      return
    }

    const cached = memory.get(cacheKey(lat, lng, atMs))
    if (cached) {
      setData(cached)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void loadTide(lat, lng, new Date(atMs)).then((result) => {
      if (cancelled) return
      setData(result)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [canLoad, lat, lng, atMs, record.id])

  return { data, loading }
}
