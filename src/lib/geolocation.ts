export interface GeoPosition {
  latitude: number
  longitude: number
  accuracy: number | null
}

export class GeolocationError extends Error {
  code?: number

  constructor(message: string, code?: number) {
    super(message)
    this.name = 'GeolocationError'
    this.code = code
  }
}

/**
 * 現在地を取得する。HTTPS または localhost が必要。
 */
export function getCurrentPosition(
  options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 15_000,
    maximumAge: 60_000,
  },
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
