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

function formatClock(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  })
}

export function formatSunLine(record: FishingRecord): string {
  const dawn = formatClock(record.dawnAt)
  const sunrise = formatClock(record.sunriseAt)
  const sunset = formatClock(record.sunsetAt)
  const dusk = formatClock(record.duskAt)
  const parts: string[] = []
  if (dawn) parts.push(`薄明${dawn}`)
  if (sunrise) parts.push(`日出${sunrise}`)
  if (sunset) parts.push(`日没${sunset}`)
  if (dusk) parts.push(`薄明${dusk}`)
  return parts.length ? parts.join(' ') : '—'
}

export function formatTideCycleMoon(record: FishingRecord): string {
  const bits: string[] = []
  if (record.tideCycle) bits.push(record.tideCycle)
  if (record.moonPhase) bits.push(record.moonPhase)
  let text = bits.join('・')
  if (record.moonAge != null) {
    const age = `月齢${record.moonAge}`
    text = text ? `${text}（${age}）` : age
  }
  return text || '—'
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
