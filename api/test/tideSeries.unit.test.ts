import { describe, expect, it } from 'vitest'
import {
  downsampleDaySeries,
  findTideExtrema,
  type DaySeries,
} from '../src/tideSeries.js'

function sineSeries(): DaySeries {
  const startMs = Date.parse('2026-08-01T00:00:00+09:00')
  const intervalSec = 60
  const n = 24 * 60
  const periodH = 12.42
  const levels = Array.from({ length: n }, (_, i) => {
    const hours = i / 60
    return Math.round(100 + 50 * Math.sin((2 * Math.PI * hours) / periodH))
  })
  return { startMs, intervalSec, levels }
}

describe('UNIT-14 潮位系列', () => {
  it('UNIT-14a 1 分間隔は 10 分に間引く', () => {
    const series = sineSeries()
    const down = downsampleDaySeries(series)
    expect(down.intervalSec).toBe(600)
    expect(down.levels.length).toBe(144)
    expect(down.startMs).toBe(series.startMs)
  })

  it('UNIT-14b すでに粗い系列はそのまま', () => {
    const series: DaySeries = {
      startMs: Date.parse('2026-08-01T00:00:00+09:00'),
      intervalSec: 3600,
      levels: Array.from({ length: 24 }, (_, i) => 100 + i),
    }
    const down = downsampleDaySeries(series)
    expect(down).toEqual(series)
  })

  it('UNIT-14c 半日周期の正弦は満潮 2・干潮 2', () => {
    const extrema = findTideExtrema(sineSeries())
    const highs = extrema.filter((e) => e.kind === 'high')
    const lows = extrema.filter((e) => e.kind === 'low')
    expect(highs).toHaveLength(2)
    expect(lows).toHaveLength(2)

    const hoursJst = (iso: string) =>
      new Date(iso).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Tokyo',
      })

    const minutes = (iso: string) => {
      const [h, m] = hoursJst(iso).split(':').map(Number)
      return h * 60 + m
    }
    const near = (iso: string, hour: number, minute: number) => {
      expect(Math.abs(minutes(iso) - (hour * 60 + minute))).toBeLessThanOrEqual(3)
    }
    near(highs[0].time, 3, 6)
    near(lows[0].time, 9, 19)
    near(highs[1].time, 15, 31)
    near(lows[1].time, 21, 45)
    expect(highs[0].levelCm).toBeGreaterThan(140)
    expect(lows[0].levelCm).toBeLessThan(60)
  })

  it('UNIT-14d 単調増加は満干なし。ピークの台地は中央', () => {
    const startMs = Date.parse('2026-08-01T00:00:00+09:00')
    expect(
      findTideExtrema({
        startMs,
        intervalSec: 3600,
        levels: Array.from({ length: 24 }, (_, i) => 100 + i),
      }),
    ).toEqual([])

    const plateau = findTideExtrema({
      startMs,
      intervalSec: 3600,
      levels: [10, 20, 40, 40, 40, 20, 10],
    })
    expect(plateau).toHaveLength(1)
    expect(plateau[0].kind).toBe('high')
    expect(hoursOf(plateau[0].time)).toBe('03:00')
  })
})

function hoursOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  })
}
