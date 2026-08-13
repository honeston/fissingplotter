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

export interface RecordsByDate {
  dateKey: string
  date: Date
  records: FishingRecord[]
}

function sortRecordsNewestFirst(records: FishingRecord[]): FishingRecord[] {
  return [...records].sort(
    (a, b) =>
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  )
}

export { sortRecordsNewestFirst }

/** 日付ごとにグループ化し、日付は新しい順・各日の記録も新しい順 */
export function groupRecordsByDate(records: FishingRecord[]): RecordsByDate[] {
  const grouped = new Map<string, FishingRecord[]>()

  for (const record of records) {
    const key = recordDateKey(record)
    const list = grouped.get(key)
    if (list) {
      list.push(record)
    } else {
      grouped.set(key, [record])
    }
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, dayRecords]) => ({
      dateKey,
      date: new Date(`${dateKey}T00:00:00`),
      records: sortRecordsNewestFirst(dayRecords),
    }))
}

export function recordsGroupedForDisplay(
  records: FishingRecord[],
  selectedDate: Date | undefined,
): RecordsByDate[] {
  const sorted = sortRecordsNewestFirst(records)
  if (selectedDate) {
    const dateKey = toDateKey(selectedDate)
    const dayRecords = filterRecordsByDate(sorted, dateKey)
    return dayRecords.length > 0
      ? [{ dateKey, date: selectedDate, records: dayRecords }]
      : []
  }
  return groupRecordsByDate(sorted)
}
