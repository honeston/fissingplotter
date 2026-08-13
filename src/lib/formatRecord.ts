import type { FishingRecord } from '../types/record'
import { weatherCodeLabel } from './weatherCode'

const FLAT_SLOPE_CM_PER_HOUR = 1

export function formatWeatherLine(record: FishingRecord): string {
  const label = record.weatherCode != null ? weatherCodeLabel(record.weatherCode) : null
  const temp = record.temperature != null ? `${record.temperature}℃` : null
  if (label && temp) return `${label} ${temp}`
  if (label) return label
  if (temp) return temp
  return '—'
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
