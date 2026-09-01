import { useEffect, useMemo, useState } from 'react'
import { useTideSeries } from '../hooks/useTideSeries'
import { isCloudSyncEnabled } from '../lib/config'
import { hasCoordinates } from '../lib/coordinates'
import {
  DAY_MS,
  formatTideClock,
  interpolateLevelCm,
  seriesToPoints,
  tideGraphMarkers,
} from '../lib/tideChart'
import type { CurrentTideResult } from '../lib/api'
import type { FishingRecord } from '../types/record'

const W = 320
const H = 172
const PAD_L = 8
const PAD_R = 8
const PAD_T = 30
const PAD_B = 28

function textAnchorForX(x: number): 'start' | 'middle' | 'end' {
  if (x < PAD_L + 36) return 'start'
  if (x > W - PAD_R - 36) return 'end'
  return 'middle'
}

function yScale(level: number, yMin: number, yMax: number): number {
  const span = yMax - yMin || 1
  const plotH = H - PAD_T - PAD_B
  return PAD_T + (1 - (level - yMin) / span) * plotH
}

function xOf(ms: number, startMs: number): number {
  const plotW = W - PAD_L - PAD_R
  const x = PAD_L + ((ms - startMs) / DAY_MS) * plotW
  return Math.min(W - PAD_R, Math.max(PAD_L, x))
}

function extremaSummary(data: CurrentTideResult): string {
  const extrema = data.extrema ?? []
  if (extrema.length === 0) return ''
  return extrema
    .map((e) => {
      const label = e.kind === 'high' ? '満潮' : '干潮'
      return `${label} ${formatTideClock(e.time)}（${Math.round(e.levelCm)}cm）`
    })
    .join('、')
}

export function TideGraph({
  record,
  enabled = true,
}: {
  record: FishingRecord
  enabled?: boolean
}) {
  const canShow = enabled && isCloudSyncEnabled() && hasCoordinates(record)
  const { data, loading } = useTideSeries(record, canShow)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const recordedAtMs = Date.parse(record.recordedAt)
  const dayStartMs = data ? Date.parse(data.series.startTime) : NaN
  const showNowTick =
    Number.isFinite(dayStartMs) &&
    tideGraphMarkers(recordedAtMs, Date.now(), dayStartMs).showNow

  useEffect(() => {
    if (!showNowTick) return
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [showNowTick, record.id])

  const chart = useMemo(() => {
    if (!data?.series?.levels || data.series.levels.length < 2) return null
    if (!Number.isFinite(dayStartMs)) return null
    const points = seriesToPoints(data.series)
    if (points.length < 2) return null

    const levels = points.map((p) => p.levelCm)
    const rawMin = Math.min(...levels)
    const rawMax = Math.max(...levels)
    const pad = Math.max(8, (rawMax - rawMin) * 0.18)
    const yMin = rawMin - pad
    const yMax = rawMax + pad

    const line = points
      .map((p, i) => {
        const cmd = i === 0 ? 'M' : 'L'
        return `${cmd}${xOf(p.ms, dayStartMs).toFixed(1)} ${yScale(p.levelCm, yMin, yMax).toFixed(1)}`
      })
      .join(' ')
    const lastX = xOf(points[points.length - 1].ms, dayStartMs)
    const firstX = xOf(points[0].ms, dayStartMs)
    const bottom = H - PAD_B
    const area = `${line} L${lastX.toFixed(1)} ${bottom} L${firstX.toFixed(1)} ${bottom} Z`

    const markers = tideGraphMarkers(recordedAtMs, nowMs, dayStartMs)
    const catchLevel =
      record.tideLevel ?? interpolateLevelCm(points, recordedAtMs)
    const nowLevel = interpolateLevelCm(points, nowMs)

    return {
      area,
      line,
      yMin,
      yMax,
      markers,
      catchLevel,
      nowLevel,
    }
  }, [data, dayStartMs, recordedAtMs, nowMs, record.tideLevel])

  if (!canShow) return null
  if (loading) {
    return (
      <div
        className="mt-4 h-44 animate-pulse rounded-xl bg-sky-50"
        aria-hidden
      />
    )
  }
  if (!data || !chart) return null

  const hours = [0, 6, 12, 18, 24]
  const catchX = xOf(recordedAtMs, dayStartMs)
  const nowX = xOf(nowMs, dayStartMs)
  const summary = extremaSummary(data)
  const aria = [
    '潮位グラフ',
    summary,
    `記録 ${formatTideClock(recordedAtMs)}`,
    chart.markers.showNow ? `いま ${formatTideClock(nowMs)}` : '',
  ]
    .filter(Boolean)
    .join('。')

  return (
    <figure className="mt-4">
      <figcaption className="mb-1.5 text-xs text-slate-500">
        潮位
        {data.stationName ? ` · ${data.stationName}` : ''}
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full text-cyan-800"
        role="img"
        aria-label={aria}
      >
        <path d={chart.area} fill="rgb(8 145 178 / 0.12)" />
        <path
          d={chart.line}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hours.map((hour) => {
          const x = xOf(dayStartMs + hour * 3600_000, dayStartMs)
          return (
            <g key={hour}>
              <line
                x1={x}
                x2={x}
                y1={PAD_T}
                y2={H - PAD_B}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={x}
                y={H - 8}
                textAnchor={hour === 0 ? 'start' : hour === 24 ? 'end' : 'middle'}
                className="fill-slate-400"
                fontSize="9"
                fontFamily="system-ui, sans-serif"
              >
                {hour}
              </text>
            </g>
          )
        })}
        {(data.extrema ?? []).map((ext) => {
          const ms = Date.parse(ext.time)
          if (!Number.isFinite(ms)) return null
          const x = xOf(ms, dayStartMs)
          const y = yScale(ext.levelCm, chart.yMin, chart.yMax)
          const isHigh = ext.kind === 'high'
          const labelY = isHigh ? y - 10 : Math.min(y + 14, H - PAD_B - 2)
          const hideLabel = Math.abs(x - catchX) < 28
          return (
            <g key={`${ext.kind}-${ext.time}`}>
              <circle
                cx={x}
                cy={y}
                r="3.2"
                fill={isHigh ? '#0e7490' : '#fff'}
                stroke="#0e7490"
                strokeWidth="1.5"
              />
              {hideLabel ? null : (
                <text
                  x={x}
                  y={labelY}
                  textAnchor={textAnchorForX(x)}
                  className="fill-sky-950"
                  fontSize="9"
                  fontFamily="system-ui, sans-serif"
                >
                  {isHigh ? '満' : '干'} {formatTideClock(ext.time)}
                </text>
              )}
            </g>
          )
        })}
        {chart.markers.showNow && chart.nowLevel != null && (
          <g>
            <line
              x1={nowX}
              x2={nowX}
              y1={PAD_T}
              y2={H - PAD_B}
              stroke="#64748b"
              strokeWidth="1.25"
              strokeDasharray="3 3"
            />
            <circle
              cx={nowX}
              cy={yScale(chart.nowLevel, chart.yMin, chart.yMax)}
              r="3"
              fill="#64748b"
            />
            <text
              x={nowX}
              y={PAD_T - 8}
              textAnchor={textAnchorForX(nowX)}
              className="fill-slate-500"
              fontSize="9"
              fontFamily="system-ui, sans-serif"
            >
              いま
            </text>
          </g>
        )}
        {chart.catchLevel != null && (
          <g>
            <line
              x1={catchX}
              x2={catchX}
              y1={PAD_T}
              y2={H - PAD_B}
              stroke="#c2410c"
              strokeWidth="1.5"
            />
            <circle
              cx={catchX}
              cy={yScale(chart.catchLevel, chart.yMin, chart.yMax)}
              r="4"
              fill="#c2410c"
              stroke="#fff"
              strokeWidth="1.25"
            />
            {chart.markers.catchLabel === 'いま' ? (
              <text
                x={catchX}
                y={PAD_T - 8}
                textAnchor={textAnchorForX(catchX)}
                className="fill-slate-500"
                fontSize="9"
                fontFamily="system-ui, sans-serif"
              >
                いま
              </text>
            ) : null}
          </g>
        )}
      </svg>
      {summary ? (
        <p className="mt-0.5 text-xs tabular-nums text-slate-500">{summary}</p>
      ) : null}
    </figure>
  )
}
