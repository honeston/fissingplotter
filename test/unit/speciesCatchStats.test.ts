import { describe, expect, it } from 'vitest'
import { EMPTY_TACKLE_FIELDS } from '../../src/types/tackle'
import {
  buildSpeciesCatchPattern,
  findConditionBucket,
  parseConditionFilter,
  recordsMatchingFilter,
  timeSlotOf,
  type CatchAxisId,
} from '../../src/lib/speciesCatchStats'
import { getSunTimes } from '../../src/lib/sun'
import { recordDateKey } from '../../src/lib/dates'
import { sampleRecord } from './recordFixture'

const LAT = 35.45
const LNG = 139.65
const SUN_AT = new Date('2026-08-01T03:00:00.000Z')
const SUN = getSunTimes(SUN_AT, LAT, LNG)

if (!SUN) throw new Error('expected sun times for Tokyo-area August')

function addMs(iso: string, ms: number): string {
  return new Date(new Date(iso).getTime() + ms).toISOString()
}

function withSun(
  id: string,
  recordedAt: string,
  overrides: Parameters<typeof sampleRecord>[0] = { id, recordedAt },
) {
  return sampleRecord({
    latitude: LAT,
    longitude: LNG,
    dawnAt: SUN.dawnAt,
    sunriseAt: SUN.sunriseAt,
    sunsetAt: SUN.sunsetAt,
    duskAt: SUN.duskAt,
    ...overrides,
    id,
    recordedAt,
  })
}

function axisBuckets(pattern: ReturnType<typeof buildSpeciesCatchPattern>, id: CatchAxisId) {
  return pattern.axes.find((axis) => axis.id === id)
}

describe('UNIT-15 魚種の釣果条件', () => {
  it('UNIT-15a 日出没から朝マヅメ / 日中 / 夕マヅメ / 夜。欠けたら母数外', () => {
    const dawn = withSun('dawn', addMs(SUN.sunriseAt, 30 * 60_000))
    const day = withSun('day', addMs(SUN.sunriseAt, 4 * 60 * 60_000))
    const dusk = withSun('dusk', addMs(SUN.sunsetAt, -30 * 60_000))
    const night = withSun('night', addMs(SUN.duskAt, 2 * 60 * 60_000))
    const missingSun = sampleRecord({
      id: 'missing',
      recordedAt: dawn.recordedAt,
      latitude: LAT,
      longitude: LNG,
    })

    expect(timeSlotOf(dawn)).toBe('dawn')
    expect(timeSlotOf(day)).toBe('day')
    expect(timeSlotOf(dusk)).toBe('dusk')
    expect(timeSlotOf(night)).toBe('night')
    expect(timeSlotOf(missingSun)).toBeNull()

    const pattern = buildSpeciesCatchPattern([dawn, day, dusk, night, missingSun])
    const slot = axisBuckets(pattern, 'slot')
    expect(slot?.knownCount).toBe(4)
    expect(slot?.buckets.map((bucket) => [bucket.key, bucket.count])).toEqual([
      ['dawn', 1],
      ['day', 1],
      ['dusk', 1],
      ['night', 1],
    ])
  })

  it('UNIT-15b 潮の傾きは上げ / 下げ / 横ばい。なしは母数外', () => {
    const pattern = buildSpeciesCatchPattern([
      sampleRecord({ id: 'up', recordedAt: '2026-08-01T00:00:00.000Z', tideSlopeCmPerHour: 15 }),
      sampleRecord({ id: 'down', recordedAt: '2026-08-02T00:00:00.000Z', tideSlopeCmPerHour: -8 }),
      sampleRecord({ id: 'flat', recordedAt: '2026-08-03T00:00:00.000Z', tideSlopeCmPerHour: 0.4 }),
      sampleRecord({ id: 'none', recordedAt: '2026-08-04T00:00:00.000Z' }),
    ])
    const tide = axisBuckets(pattern, 'tide')
    expect(tide?.knownCount).toBe(3)
    expect(tide?.buckets.map((bucket) => [bucket.key, bucket.count])).toEqual([
      ['up', 1],
      ['down', 1],
      ['flat', 1],
    ])
  })

  it('UNIT-15c 50m 以内は同一地点。離れた件は別。表示は最多の場所名', () => {
    const nearA = sampleRecord({
      id: 'a',
      recordedAt: '2026-08-01T00:00:00.000Z',
      latitude: LAT,
      longitude: LNG,
      locationName: '片瀬',
    })
    const nearB = sampleRecord({
      id: 'b',
      recordedAt: '2026-08-02T00:00:00.000Z',
      latitude: LAT + 0.0002,
      longitude: LNG,
      locationName: '片瀬海岸',
    })
    const far = sampleRecord({
      id: 'c',
      recordedAt: '2026-08-03T00:00:00.000Z',
      latitude: LAT + 0.01,
      longitude: LNG,
      locationName: '横浜',
    })
    const unnamed = sampleRecord({
      id: 'd',
      recordedAt: '2026-08-04T00:00:00.000Z',
      latitude: LAT,
      longitude: LNG,
    })

    const pattern = buildSpeciesCatchPattern([nearA, nearB, far, unnamed])
    const place = axisBuckets(pattern, 'place')
    expect(place?.buckets).toHaveLength(2)
    const home = place?.buckets.find((bucket) => bucket.records.some((record) => record.id === 'a'))
    const away = place?.buckets.find((bucket) => bucket.records.some((record) => record.id === 'c'))
    expect(home?.records.map((record) => record.id).sort()).toEqual(['a', 'b', 'd'])
    expect(home?.label).toBe('片瀬')
    expect(home?.count).toBe(3)
    expect(away?.label).toBe('横浜')
    expect(away?.count).toBe(1)
  })

  it('UNIT-15d ルアーは trim 一致。匹数は fishCount。空は母数外', () => {
    const many = sampleRecord({
      id: 'a',
      recordedAt: '2026-08-01T00:00:00.000Z',
      fishCount: 3,
      tackle: { ...EMPTY_TACKLE_FIELDS, lureOrBait: 'ミノー' },
    })
    const one = sampleRecord({
      id: 'b',
      recordedAt: '2026-08-02T00:00:00.000Z',
      tackle: { ...EMPTY_TACKLE_FIELDS, lureOrBait: ' ミノー ' },
    })
    const empty = sampleRecord({
      id: 'c',
      recordedAt: '2026-08-03T00:00:00.000Z',
    })
    const pattern = buildSpeciesCatchPattern([many, one, empty])
    const lure = axisBuckets(pattern, 'lure')
    expect(lure?.knownCount).toBe(4)
    expect(lure?.buckets).toHaveLength(1)
    expect(lure?.buckets[0]).toMatchObject({ key: 'ミノー', count: 4, dayCount: 2 })
    expect(lure?.buckets[0].dayCount).toBe(
      new Set([recordDateKey(many), recordDateKey(one)]).size,
    )
  })

  it('UNIT-15e 要約は 3 匹以上かつ最頻が一つの軸だけ。同数なら使わない', () => {
    const noPlace = { latitude: null, longitude: null }
    const dawnRecords = [1, 2, 3].map((n) =>
      withSun(`dawn-${n}`, addMs(SUN.sunriseAt, 20 * 60_000), {
        id: `dawn-${n}`,
        recordedAt: addMs(SUN.sunriseAt, 20 * 60_000),
        tideCycle: n === 1 ? '大潮' : n === 2 ? '中潮' : '小潮',
        ...noPlace,
      }),
    )
    const day = withSun('day', addMs(SUN.sunriseAt, 5 * 60 * 60_000), {
      id: 'day',
      recordedAt: addMs(SUN.sunriseAt, 5 * 60 * 60_000),
      tideCycle: '長潮',
      ...noPlace,
    })
    const withDawn = buildSpeciesCatchPattern([...dawnRecords, day])
    expect(withDawn.totalCount).toBe(4)
    expect(withDawn.summary?.labels).toEqual(['朝マヅメ'])
    expect(withDawn.summary?.headline).toBe('朝マヅメが多い（時間帯が分かる4匹中3匹）')

    const tooFew = buildSpeciesCatchPattern(dawnRecords.slice(0, 2))
    expect(tooFew.totalCount).toBe(2)
    expect(tooFew.summary).toBeNull()

    const tied = buildSpeciesCatchPattern([
      withSun('a', addMs(SUN.sunriseAt, 20 * 60_000), {
        id: 'a',
        recordedAt: addMs(SUN.sunriseAt, 20 * 60_000),
        ...noPlace,
      }),
      withSun('b', addMs(SUN.sunriseAt, 20 * 60_000), {
        id: 'b',
        recordedAt: addMs(SUN.sunriseAt, 21 * 60_000),
        ...noPlace,
      }),
      withSun('c', addMs(SUN.sunriseAt, 5 * 60 * 60_000), {
        id: 'c',
        recordedAt: addMs(SUN.sunriseAt, 5 * 60 * 60_000),
        ...noPlace,
      }),
      withSun('d', addMs(SUN.sunriseAt, 5 * 60 * 60_000), {
        id: 'd',
        recordedAt: addMs(SUN.sunriseAt, 5 * 60 * 60_000 + 60_000),
        ...noPlace,
      }),
    ])
    expect(tied.summary).toBeNull()
  })

  it('UNIT-15f 条件クエリ。不明は全件扱い。複数は slot 優先', () => {
    const dawn = withSun('dawn', addMs(SUN.sunriseAt, 20 * 60_000))
    const day = withSun('day', addMs(SUN.sunriseAt, 5 * 60 * 60_000))
    const pattern = buildSpeciesCatchPattern([dawn, day])

    const dawnFilter = parseConditionFilter(new URLSearchParams('slot=dawn'))
    expect(dawnFilter).toEqual({ axis: 'slot', key: 'dawn' })
    expect(recordsMatchingFilter(pattern, dawnFilter!).map((record) => record.id)).toEqual(['dawn'])

    expect(parseConditionFilter(new URLSearchParams('slot=nope'))).toBeNull()
    expect(parseConditionFilter(new URLSearchParams('slot=nope&lure=ミノー'))).toEqual({
      axis: 'lure',
      key: 'ミノー',
    })
    expect(parseConditionFilter(new URLSearchParams('lure=ミノー&slot=dawn'))).toEqual({
      axis: 'slot',
      key: 'dawn',
    })
    expect(findConditionBucket(pattern, { axis: 'slot', key: 'night' })?.count).toBe(0)
    expect(recordsMatchingFilter(pattern, { axis: 'place', key: '35.0000,139.0000' })).toEqual([])
  })
})
