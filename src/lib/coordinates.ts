import type { FishingRecord } from '../types/record'

export type MappableRecord = FishingRecord & {
  latitude: number
  longitude: number
}

export function hasCoordinates(
  record: FishingRecord,
): record is MappableRecord {
  return record.latitude != null && record.longitude != null
}

export function recordsWithCoordinates(records: FishingRecord[]): MappableRecord[] {
  return records.filter(hasCoordinates)
}

const COORD_EPS = 1e-6

export function sameCoordinates(
  a: Pick<FishingRecord, 'latitude' | 'longitude'>,
  b: Pick<FishingRecord, 'latitude' | 'longitude'>,
): boolean {
  if (a.latitude == null && b.latitude == null && a.longitude == null && b.longitude == null) {
    return true
  }
  if (a.latitude == null || b.latitude == null || a.longitude == null || b.longitude == null) {
    return false
  }
  return (
    Math.abs(a.latitude - b.latitude) < COORD_EPS &&
    Math.abs(a.longitude - b.longitude) < COORD_EPS
  )
}
