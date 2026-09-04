/** 空は未入力 (null)。1 以上の整数のみ。 */
export function parseFishCount(raw: string): number | null | 'invalid' {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (!/^[1-9]\d*$/.test(trimmed)) return 'invalid'
  const n = Number(trimmed)
  if (!Number.isSafeInteger(n) || n < 1) return 'invalid'
  return n
}

export function formatFishCount(count: number | null | undefined): string {
  if (count == null) return '—'
  return `${count}匹`
}

export function fishCountToInputString(count: number | null | undefined): string {
  return count != null ? String(count) : ''
}

/** 図鑑集計用。未入力・旧記録は 1 匹。ボウズは 0 */
export function catchCountOf(record: { fishCount?: number | null; kind?: string | null }): number {
  if (record.kind === 'blank') return 0
  const n = record.fishCount
  if (n == null || !Number.isFinite(n) || n < 1) return 1
  return Math.trunc(n)
}
