/** OpenStreetMap Nominatim で大まかな住所（市区町村まで、丁目・番地なし）を取得する。 */

interface NominatimAddress {
  province?: string
  state?: string
  city?: string
  town?: string
  village?: string
  county?: string
  city_district?: string
  suburb?: string
  country?: string
  country_code?: string
}

function isUsefulPart(part: string): boolean {
  if (!part) return false
  if (part === '日本' || part === 'Japan') return false
  if (/^\d{3}-?\d{4}$/.test(part)) return false
  if (/番地|番$|丁目/.test(part)) return false
  return true
}

function appendUnique(parts: string[], value: string | undefined) {
  if (!value || !isUsefulPart(value)) return
  if (parts.includes(value)) return
  parts.push(value)
}

export function formatCoarseAddress(address: NominatimAddress): string | null {
  const parts: string[] = []
  appendUnique(parts, address.province ?? address.state)
  appendUnique(parts, address.city ?? address.town ?? address.village ?? address.county)
  appendUnique(parts, address.city_district)
  return parts.length ? parts.join('') : null
}

/**
 * GPS 座標から市区町村（＋区）までの場所名を返す。丁目・番地は含めない。
 */
export async function fetchPlaceName(
  latitude: number,
  longitude: number,
): Promise<string> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('lat', String(latitude))
  url.searchParams.set('lon', String(longitude))
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('accept-language', 'ja')
  url.searchParams.set('zoom', '14')
  url.searchParams.set('addressdetails', '1')

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`場所の取得に失敗しました（HTTP ${res.status}）`)
  }

  const data = (await res.json()) as { address?: NominatimAddress }
  const name = data.address ? formatCoarseAddress(data.address) : null
  if (!name) {
    throw new Error('場所データが含まれていません')
  }
  return name
}
