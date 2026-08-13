import type { FishingRecord } from '../types/record'

export function hasCoordinates(
  record: FishingRecord,
): record is FishingRecord & { latitude: number; longitude: number } {
  return record.latitude != null && record.longitude != null
}

export function recordsWithCoordinates(records: FishingRecord[]): FishingRecord[] {
  return records.filter(hasCoordinates)
}
