import { DEV_GEO_FALLBACK } from './devGeo'

export interface GeoPosition {
  latitude: number
  longitude: number
  accuracy: number | null
  /** 開発時の固定座標フォールバック */
  devFallback?: boolean
}

export class GeolocationError extends Error {
  code?: number

  constructor(message: string, code?: number) {
    super(message)
    this.name = 'GeolocationError'
    this.code = code
  }
}

function browserGeolocation(
  options: PositionOptions,
): Promise<GeoPosition> {
  if (!('geolocation' in navigator)) {
    return Promise.reject(new GeolocationError('この端末は位置情報に対応していません'))
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        })
      },
      (err) => {
        const messages: Record<number, string> = {
          1: '位置情報の利用が拒否されました',
          2: '位置情報を取得できませんでした',
          3: '位置情報の取得がタイムアウトしました',
        }
        reject(
          new GeolocationError(
            messages[err.code] ?? err.message ?? '位置情報の取得に失敗しました',
            err.code,
          ),
        )
      },
      options,
    )
  })
}

function devFallbackPosition(): GeoPosition {
  return {
    latitude: DEV_GEO_FALLBACK.latitude,
    longitude: DEV_GEO_FALLBACK.longitude,
    accuracy: null,
    devFallback: true,
  }
}

/**
 * 現在地を取得する。HTTPS または localhost が必要。
 * 開発時（import.meta.env.DEV）は GPS 失敗時に海岸の固定座標へフォールバックする。
 */
export function getCurrentPosition(
  options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 15_000,
    maximumAge: 60_000,
  },
): Promise<GeoPosition> {
  if (import.meta.env.DEV) {
    const devOptions: PositionOptions = {
      ...options,
      timeout: Math.min(options.timeout ?? 15_000, 3_000),
      maximumAge: options.maximumAge ?? 60_000,
    }
    return browserGeolocation(devOptions).catch(() => devFallbackPosition())
  }

  return browserGeolocation(options)
}

/** 開発フォールバック座標の説明文（警告表示用） */
export function devGeoFallbackMessage(): string {
  return `開発用の固定座標を使用しました（${DEV_GEO_FALLBACK.label}）`
}
