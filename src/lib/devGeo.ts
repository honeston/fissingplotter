/**
 * ローカル開発（PC 等で GPS が使えないとき）の代替座標。
 * デフォルト: 横浜新港（海しる推算点 1403 付近）
 */
export const DEV_GEO_FALLBACK = {
  latitude: parseDevCoord(import.meta.env.VITE_DEV_LAT, 35.45),
  longitude: parseDevCoord(import.meta.env.VITE_DEV_LNG, 139.65),
  label: '横浜新港（開発用）',
} as const

function parseDevCoord(raw: string | undefined, fallback: number): number {
  if (raw == null || raw === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}
