export interface TideSeriesPoint {
  ms: number
  levelCm: number
}

export interface TideChartSeries {
  startTime: string
  intervalSec: number
  levels: number[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const OVERLAP_MS = 2 * 60 * 1000

export function jstDateKeyFromMs(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms))
}

export function sameJstDay(aMs: number, bMs: number): boolean {
  return jstDateKeyFromMs(aMs) === jstDateKeyFromMs(bMs)
}

export function seriesToPoints(series: TideChartSeries): TideSeriesPoint[] {
  const startMs = Date.parse(series.startTime)
  if (!Number.isFinite(startMs) || !(series.intervalSec > 0)) return []
  return series.levels
    .map((levelCm, i) => ({
      ms: startMs + i * series.intervalSec * 1000,
      levelCm,
    }))
    .filter((p) => Number.isFinite(p.levelCm))
}

export function interpolateLevelCm(
  points: TideSeriesPoint[],
  atMs: number,
): number | null {
  if (points.length === 0) return null
  if (atMs <= points[0].ms) return points[0].levelCm
  const last = points[points.length - 1]
  if (atMs >= last.ms) return last.levelCm
  for (let i = 1; i < points.length; i++) {
    const b = points[i]
    if (atMs <= b.ms) {
      const a = points[i - 1]
      const span = b.ms - a.ms
      if (span <= 0) return a.levelCm
      const t = (atMs - a.ms) / span
      return a.levelCm + (b.levelCm - a.levelCm) * t
    }
  }
  return last.levelCm
}

export function formatTideClock(isoOrMs: string | number): string {
  const date = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  })
}

export interface TideGraphMarkers {
  showCatch: boolean
  showNow: boolean
  catchLabel: string
}

/** いまと釣れた時刻が近いときは印を一つにまとめる。 */
export function tideGraphMarkers(
  recordedAtMs: number,
  nowMs: number,
  dayStartMs: number,
): TideGraphMarkers {
  const nowOnDay = sameJstDay(nowMs, dayStartMs)
  const overlap = Math.abs(nowMs - recordedAtMs) < OVERLAP_MS
  return {
    showCatch: true,
    showNow: nowOnDay && !overlap,
    catchLabel: nowOnDay && overlap ? 'いま' : '釣れた時刻',
  }
}

export { DAY_MS }
