/** OpenStreetMap Nominatim で町名までの住所を取得する（数字・丁目番号・番地なし）。 */

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
  country?: string
  country_code?: string
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

/**
 * GPS 座標から町名までの場所名を返す。数字・丁目・番地は含めない。
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
  url.searchParams.set('zoom', '16')
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
