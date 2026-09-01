/** 日次天文潮位の系列処理（グラフ用の間引きと満潮・干潮） */

export const TIDE_GRAPH_INTERVAL_SEC = 600

export interface DaySeries {
  startMs: number
  intervalSec: number
  levels: number[]
}

export type TideExtremumKind = 'high' | 'low'

export interface TideExtremum {
  kind: TideExtremumKind
  time: string
  levelCm: number
}

const MIN_SEPARATION_MS = 90 * 60 * 1000
const MIN_AMPLITUDE_CM = 5

function sampleMs(series: DaySeries, index: number): number {
  return series.startMs + index * series.intervalSec * 1000
}

/** グラフ用に間隔を広げる。元がすでに粗いときはそのまま。 */
export function downsampleDaySeries(
  series: DaySeries,
  targetIntervalSec = TIDE_GRAPH_INTERVAL_SEC,
): DaySeries {
  if (!(series.intervalSec > 0) || series.levels.length === 0) return series
  if (series.intervalSec >= targetIntervalSec) return series
  const step = Math.max(1, Math.round(targetIntervalSec / series.intervalSec))
  if (step <= 1) return series
  const levels: number[] = []
  for (let i = 0; i < series.levels.length; i += step) {
    levels.push(series.levels[i])
  }
  return {
    startMs: series.startMs,
    intervalSec: series.intervalSec * step,
    levels,
  }
}

function turningPoints(
  series: DaySeries,
): { index: number; kind: TideExtremumKind; levelCm: number }[] {
  const { levels } = series
  const n = levels.length
  if (n < 3) return []

  const found: { index: number; kind: TideExtremumKind; levelCm: number }[] = []
  let i = 0
  while (i < n) {
    let j = i
    while (j + 1 < n && levels[j + 1] === levels[i]) j += 1
    const left = i > 0 ? levels[i - 1] : null
    const right = j < n - 1 ? levels[j + 1] : null
    const mid = levels[i]
    if (left != null && right != null) {
      if (left < mid && right < mid) {
        found.push({ index: Math.floor((i + j) / 2), kind: 'high', levelCm: mid })
      } else if (left > mid && right > mid) {
        found.push({ index: Math.floor((i + j) / 2), kind: 'low', levelCm: mid })
      }
    }
    i = j + 1
  }
  return found
}

/** 日次系列の転地点から満潮・干潮を取る。端点は前日・翌日に続くので含めない。 */
export function findTideExtrema(series: DaySeries): TideExtremum[] {
  const raw = turningPoints(series)
  const kept: { index: number; kind: TideExtremumKind; levelCm: number }[] = []

  for (const point of raw) {
    const prev = kept[kept.length - 1]
    if (!prev) {
      kept.push(point)
      continue
    }
    const sep = Math.abs(sampleMs(series, point.index) - sampleMs(series, prev.index))
    const amp = Math.abs(point.levelCm - prev.levelCm)
    if (point.kind === prev.kind) {
      if (point.kind === 'high' && point.levelCm > prev.levelCm) {
        kept[kept.length - 1] = point
      } else if (point.kind === 'low' && point.levelCm < prev.levelCm) {
        kept[kept.length - 1] = point
      }
      continue
    }
    if (sep < MIN_SEPARATION_MS || amp < MIN_AMPLITUDE_CM) continue
    kept.push(point)
  }

  return kept.map((point) => ({
    kind: point.kind,
    time: new Date(sampleMs(series, point.index)).toISOString(),
    levelCm: point.levelCm,
  }))
}
