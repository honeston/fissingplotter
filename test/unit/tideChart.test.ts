import { describe, expect, it } from 'vitest'
import {
  interpolateLevelCm,
  jstDateKeyFromMs,
  sameJstDay,
  seriesToPoints,
  tideGraphMarkers,
} from '../../src/lib/tideChart'

describe('UNIT-14 潮位グラフ（表示）', () => {
  it('JST の日キーは日付が同じなら true', () => {
    const morning = Date.parse('2026-08-01T00:30:00+09:00')
    const evening = Date.parse('2026-08-01T23:50:00+09:00')
    const next = Date.parse('2026-08-02T00:10:00+09:00')
    expect(jstDateKeyFromMs(morning)).toBe('2026-08-01')
    expect(sameJstDay(morning, evening)).toBe(true)
    expect(sameJstDay(morning, next)).toBe(false)
  })

  it('系列点の補間と、いま／釣れた時刻の重ね', () => {
    const points = seriesToPoints({
      startTime: '2026-07-31T15:00:00.000Z',
      intervalSec: 3600,
      levels: [100, 120, 80],
    })
    expect(points).toHaveLength(3)
    expect(interpolateLevelCm(points, Date.parse('2026-07-31T15:30:00.000Z'))).toBe(110)

    const dayStart = Date.parse('2026-08-01T00:00:00+09:00')
    const catchAt = Date.parse('2026-08-01T06:00:00+09:00')
    const later = Date.parse('2026-08-01T15:00:00+09:00')
    const justCaught = Date.parse('2026-08-01T06:01:00+09:00')
    const otherDay = Date.parse('2026-08-02T06:00:00+09:00')

    expect(tideGraphMarkers(catchAt, later, dayStart)).toEqual({
      showCatch: true,
      showNow: true,
      catchLabel: '釣れた時刻',
    })
    expect(tideGraphMarkers(catchAt, justCaught, dayStart)).toEqual({
      showCatch: true,
      showNow: false,
      catchLabel: 'いま',
    })
    expect(tideGraphMarkers(catchAt, otherDay, dayStart)).toEqual({
      showCatch: true,
      showNow: false,
      catchLabel: '釣れた時刻',
    })
  })
})
