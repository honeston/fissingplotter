import { describe, expect, it } from 'vitest'
import {
  groupRecordsByTrip,
  isTripStale,
  tripHeaderLabel,
  tripShowsHeader,
  type ActiveTrip,
} from '../../src/lib/trips'
import { sampleRecord } from './recordFixture'

function trip(overrides: Partial<ActiveTrip> = {}): ActiveTrip {
  return {
    tripId: 'trip-1',
    startedAt: '2026-09-04T06:00:00.000Z',
    catchCount: 1,
    locationName: '江の島',
    conditions: {
      latitude: 35.3,
      longitude: 139.48,
      locationName: '江の島',
      temperature: 18,
      weatherCode: 1,
      windSpeedMs: 2,
      tideLevel: 100,
      tideHarbor: '江の島',
      tideCycle: '大潮',
      moonPhase: '新月',
      moonAge: 0.4,
      tideSlopeCmPerHour: 10,
    },
    ...overrides,
  }
}

describe('釣行グループ', () => {
  it('同じ tripId は 1 グループ。tripId なしは 1 件ずつ', () => {
    const a1 = sampleRecord({
      id: 'a1',
      recordedAt: '2026-09-04T07:00:00.000Z',
      tripId: 't1',
      fishSpecies: 'アジ',
      fishCount: 2,
      locationName: '片瀬',
    })
    const a2 = sampleRecord({
      id: 'a2',
      recordedAt: '2026-09-04T06:30:00.000Z',
      tripId: 't1',
      fishSpecies: 'サバ',
      locationName: '片瀬',
    })
    const solo = sampleRecord({
      id: 's1',
      recordedAt: '2026-09-04T05:00:00.000Z',
      tripId: null,
      fishSpecies: 'メバル',
    })
    const groups = groupRecordsByTrip([a1, a2, solo])
    expect(groups).toHaveLength(2)
    expect(groups[0].tripId).toBe('t1')
    expect(groups[0].records.map((r) => r.id)).toEqual(['a1', 'a2'])
    expect(groups[0].catchCount).toBe(3)
    expect(groups[0].speciesLabels).toEqual(['アジ', 'サバ'])
    expect(tripShowsHeader(groups[0])).toBe(true)
    expect(groups[1].records.map((r) => r.id)).toEqual(['s1'])
    expect(tripShowsHeader(groups[1])).toBe(false)
  })

  it('ボウズだけなら kind は blank。ヘッダーにボウズと出る', () => {
    const blank = sampleRecord({
      id: 'b1',
      recordedAt: '2026-09-04T16:00:00.000Z',
      tripId: 'blank-1',
      kind: 'blank',
      locationName: '横浜',
    })
    const groups = groupRecordsByTrip([blank])
    expect(groups).toHaveLength(1)
    expect(groups[0].kind).toBe('blank')
    expect(groups[0].catchCount).toBe(0)
    expect(tripHeaderLabel(groups[0])).toContain('ボウズ')
    expect(tripHeaderLabel(groups[0])).toContain('横浜')
  })

  it('12 時間超、または日付が変わったら釣行は期限切れ', () => {
    const startedAt = '2026-09-04T06:00:00.000Z'
    const twoHoursLater = new Date(Date.parse(startedAt) + 2 * 60 * 60 * 1000)
    const thirteenHoursLater = new Date(Date.parse(startedAt) + 13 * 60 * 60 * 1000)
    const nextCalendarDay = new Date(Date.parse(startedAt))
    nextCalendarDay.setDate(nextCalendarDay.getDate() + 1)
    nextCalendarDay.setHours(8, 0, 0, 0)

    expect(isTripStale(trip({ startedAt }), twoHoursLater)).toBe(false)
    expect(isTripStale(trip({ startedAt }), thirteenHoursLater)).toBe(true)
    expect(isTripStale(trip({ startedAt }), nextCalendarDay)).toBe(true)
  })
})
