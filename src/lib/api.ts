import type { FishingRecord } from '../types/record'
import { getIdToken } from './auth'
import { awsConfig } from './config'

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getIdToken()
  if (!token) {
    throw new Error('ログインが必要です')
  }

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${awsConfig.apiUrl}${path}`, { ...init, headers })
  return res
}

export async function fetchRecords(since?: string): Promise<FishingRecord[]> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : ''
  const res = await apiFetch(`/records${qs}`)
  if (!res.ok) {
    throw new Error(`サーバーからの取得に失敗しました (${res.status})`)
  }
  const data = (await res.json()) as { records: FishingRecord[] }
  return data.records
}

export async function postRecord(record: FishingRecord): Promise<FishingRecord> {
  const res = await apiFetch('/records', {
    method: 'POST',
    body: JSON.stringify(record),
  })
  if (!res.ok) {
    throw new Error(`サーバーへの保存に失敗しました (${res.status})`)
  }
  const data = (await res.json()) as { record: FishingRecord }
  return data.record
}

export async function deleteRemoteRecord(id: string): Promise<void> {
  const res = await apiFetch(`/records/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) {
    throw new Error(`サーバーからの削除に失敗しました (${res.status})`)
  }
}

export async function deleteAccount(): Promise<void> {
  const res = await apiFetch('/account', { method: 'DELETE' })
  if (!res.ok && res.status !== 204) {
    throw new Error(`退会処理に失敗しました (${res.status})`)
  }
}

export async function presignPhotoUpload(
  recordId: string,
): Promise<{ uploadUrl: string; photoKey: string; expiresIn: number }> {
  const res = await apiFetch('/photos/presign', {
    method: 'POST',
    body: JSON.stringify({ recordId }),
  })
  if (!res.ok) {
    throw new Error(`写真アップロード URL の取得に失敗しました (${res.status})`)
  }
  return res.json() as Promise<{ uploadUrl: string; photoKey: string; expiresIn: number }>
}

export async function getPhotoViewUrl(recordId: string): Promise<string> {
  const res = await apiFetch(`/photos/${encodeURIComponent(recordId)}/url`)
  if (!res.ok) {
    throw new Error(`写真 URL の取得に失敗しました (${res.status})`)
  }
  const data = (await res.json()) as { viewUrl: string }
  return data.viewUrl
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${awsConfig.apiUrl}/health`)
    return res.ok
  } catch {
    return false
  }
}

export interface CurrentWeatherResult {
  temperature: number
  weatherCode: number
  windSpeedMs: number | null
  time: string
}

export async function fetchCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<CurrentWeatherResult> {
  const qs = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
  })
  const res = await apiFetch(`/weather/current?${qs}`)
  if (!res.ok) {
    throw new Error(`天気の取得に失敗しました（HTTP ${res.status}）`)
  }
  const data = (await res.json()) as { weather: CurrentWeatherResult }
  return data.weather
}

export async function fetchCurrentPlace(
  latitude: number,
  longitude: number,
): Promise<string> {
  const qs = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
  })
  const res = await apiFetch(`/place/current?${qs}`)
  if (!res.ok) {
    throw new Error(`場所名の取得に失敗しました（HTTP ${res.status}）`)
  }
  const data = (await res.json()) as { placeName: string }
  return data.placeName
}

export interface CurrentTideResult {
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

export async function fetchCurrentTide(
  latitude: number,
  longitude: number,
  at: Date = new Date(),
): Promise<CurrentTideResult> {
  const qs = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    at: at.toISOString(),
  })
  const res = await apiFetch(`/tide/current?${qs}`)
  if (!res.ok) {
    throw new Error(`潮位の取得に失敗しました（HTTP ${res.status}）`)
  }
  const data = (await res.json()) as { tide: CurrentTideResult }
  return data.tide
}
