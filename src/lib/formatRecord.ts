import type { FishingRecord } from '../types/record'
import { weatherCodeLabel } from './weatherCode'

const FLAT_SLOPE_CM_PER_HOUR = 1

export function formatWeatherLine(record: FishingRecord): string {
  const bits: string[] = []
  const label = record.weatherCode != null ? weatherCodeLabel(record.weatherCode) : null
  if (label) bits.push(label)
  if (record.temperature != null) bits.push(`${record.temperature}℃`)
  if (record.windSpeedMs != null) bits.push(`${record.windSpeedMs}m/s`)
  return bits.length ? bits.join(' ') : '—'
}

const SUN_NEAR_MS = 2 * 60 * 60 * 1000

function parseTime(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime()
  return Number.isNaN(ms) ? null : ms
}

function formatSignedDuration(ms: number): string {
  const sign = ms >= 0 ? '+' : '-'
  const totalMinutes = Math.round(Math.abs(ms) / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${sign}${hours}:${String(minutes).padStart(2, '0')}`
}

function formatClock(iso: string | number): string {
  const date = typeof iso === 'number' ? new Date(iso) : new Date(iso)
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  })
}

/** 日出・日没の近い方。±2時間以内なら時刻と差、それ以外は日中／夜間と時分。 */
export function formatSunLine(record: FishingRecord): string {
  const recorded = parseTime(record.recordedAt)
  const sunrise = parseTime(record.sunriseAt)
  const sunset = parseTime(record.sunsetAt)
  if (recorded == null || sunrise == null || sunset == null) return '—'

  const sunriseDelta = recorded - sunrise
  const sunsetDelta = recorded - sunset
  const nearerSunrise = Math.abs(sunriseDelta) <= Math.abs(sunsetDelta)
  const nearerDelta = nearerSunrise ? sunriseDelta : sunsetDelta

  if (Math.abs(nearerDelta) <= SUN_NEAR_MS) {
    const label = nearerSunrise ? '日出' : '日没'
    const eventAt = nearerSunrise ? sunrise : sunset
    return `${label} ${formatClock(eventAt)} ${formatSignedDuration(nearerDelta)}`
  }

  const period = recorded >= sunrise && recorded < sunset ? '日中' : '夜間'
  return `${period} ${formatClock(recorded)}`
}

export function formatTideCycleMoon(record: FishingRecord): string {
  const bits: string[] = []
  if (record.tideCycle) bits.push(record.tideCycle)
  if (record.moonPhase) bits.push(record.moonPhase)
  return bits.join('・') || '—'
}

export function formatTideSlope(cmPerHour: number | null): string {
  if (cmPerHour == null) return '—'
  if (Math.abs(cmPerHour) < FLAT_SLOPE_CM_PER_HOUR) {
    return '0cm/h 横ばい'
  }
  const rounded = Math.round(cmPerHour)
  const sign = rounded > 0 ? '+' : ''
  const dir = rounded > 0 ? '上昇' : '下降'
  return `${sign}${rounded}cm/h ${dir}`
}

export function formatTideLine(record: FishingRecord): string {
  const parts: string[] = []

  if (record.tideLevel != null) {
    const harbor = record.tideHarbor ? `（${record.tideHarbor}）` : ''
    parts.push(`潮位 ${record.tideLevel}cm${harbor}`)
  } else if (record.tideHarbor) {
    parts.push(`潮位 —（${record.tideHarbor}）`)
  }

  const cycleMoon = formatTideCycleMoon(record)
  if (cycleMoon !== '—') parts.push(cycleMoon)

  const slope = formatTideSlope(record.tideSlopeCmPerHour)
  if (slope !== '—') parts.push(slope)

  return parts.length ? parts.join(' / ') : '—'
}
