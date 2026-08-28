import { describe, expect, it } from 'vitest'
import {
  dateFromKey,
  filterRecordsByDateRange,
  fromDatetimeLocalValue,
  recordDateKey,
  toDateKey,
} from '../../src/lib/dates'
import { sampleRecord } from './recordFixture'

describe('UNIT-08 日付', () => {
  it('UNIT-08a ISO8601 の日キーは YYYY-MM-DD。同じ瞬間なら安定', () => {
    const iso = '2026-08-01T12:34:56.000Z'
    const key = toDateKey(new Date(iso))
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(recordDateKey(sampleRecord({ id: '1', recordedAt: iso }))).toBe(key)
    expect(toDateKey(new Date(iso))).toBe(key)
  })

  it('UNIT-08b 空文字は datetime-local から null。日キー不正は期間に使わない', () => {
    expect(fromDatetimeLocalValue('')).toBeNull()
    expect(dateFromKey('')).toBeUndefined()
    expect(dateFromKey(null)).toBeUndefined()
    expect(dateFromKey('08-01')).toBeUndefined()
  })

  it('UNIT-08c 不正な日付文字列は変換失敗。投げない', () => {
    expect(fromDatetimeLocalValue('not-a-date')).toBeNull()
    expect(dateFromKey('2026-13-40')).toBeUndefined()
  })

  it('UNIT-08d 期間 from > to は入れ替えてその区間を含む', () => {
    const inRange = sampleRecord({ id: 'in', recordedAt: '2026-08-10T00:00:00.000Z' })
    const out = sampleRecord({ id: 'out', recordedAt: '2026-07-01T00:00:00.000Z' })
    const filtered = filterRecordsByDateRange(
      [inRange, out],
      '2026-08-15',
      '2026-08-01',
    )
    expect(filtered.map((r) => r.id)).toEqual(['in'])
  })
})
