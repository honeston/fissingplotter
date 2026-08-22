import type { FishingRecord } from '../types/record'

/** datetime-local 用（端末ローカル時刻） */
export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function sameMinute(a: string, b: string): boolean {
  const da = new Date(a)
  const db = new Date(b)
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return a === b
  return Math.floor(da.getTime() / 60_000) === Math.floor(db.getTime() / 60_000)
}

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

export function filterRecordsByDateRange(
  records: FishingRecord[],
  fromKey: string,
  toKey: string,
): FishingRecord[] {
  const [start, end] = fromKey <= toKey ? [fromKey, toKey] : [toKey, fromKey]
  return records.filter((r) => {
    const key = recordDateKey(r)
    return key >= start && key <= end
  })
}

export function dateFromKey(dateKey: string | null): Date | undefined {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return undefined
  const date = new Date(`${dateKey}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export interface DateRangeSelection {
  from: Date
  to: Date
}

/** react-day-picker の部分選択を正規化（from のみの場合は同日範囲） */
export function normalizeDateRange(
  range: { from?: Date; to?: Date } | undefined,
): DateRangeSelection | undefined {
  if (!range?.from) return undefined
  const from = range.from
  const to = range.to ?? range.from
  if (from <= to) return { from, to }
  return { from: to, to: from }
}

export function formatDateRangeLabel(from: Date, to: Date): string {
  if (toDateKey(from) === toDateKey(to)) return formatDateLabel(from)
  return `${formatDateLabel(from)} 〜 ${formatDateLabel(to)}`
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
  selectedRange: { from?: Date; to?: Date } | undefined,
): RecordsByDate[] {
  const sorted = sortRecordsNewestFirst(records)
  const normalized = normalizeDateRange(selectedRange)
  if (normalized) {
    const filtered = filterRecordsByDateRange(
      sorted,
      toDateKey(normalized.from),
      toDateKey(normalized.to),
    )
    return groupRecordsByDate(filtered)
  }
  return groupRecordsByDate(sorted)
}
