import type { FishingRecord } from '../types/record'

export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function recordDateKey(record: FishingRecord): string {
  return toDateKey(new Date(record.recordedAt))
}

export function filterRecordsByDate(
  records: FishingRecord[],
  dateKey: string,
): FishingRecord[] {
  return records.filter((r) => recordDateKey(r) === dateKey)
}

export function datesWithRecords(records: FishingRecord[]): Set<string> {
  return new Set(records.map(recordDateKey))
}

export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
