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
