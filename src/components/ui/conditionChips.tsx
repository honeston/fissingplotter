import { Moon, Sun, Sunrise, Sunset, TrendingDown, TrendingUp, Waves, Wind, type LucideIcon } from 'lucide-react'
import {
  formatSunLine,
  formatTideCycleMoon,
  formatTideLine,
  formatTideSlope,
} from '../../lib/formatRecord'
import { weatherCodeLabel } from '../../lib/weatherCode'
import type { FishingRecord } from '../../types/record'
import { Icon } from './Icon'
import { WeatherIcon } from './WeatherIcon'

export function sunIconForRecord(record: FishingRecord): LucideIcon {
  const line = formatSunLine(record)
  if (line.startsWith('日出')) return Sunrise
  if (line.startsWith('日没')) return Sunset
  if (line.startsWith('夜間')) return Moon
  if (line.startsWith('日中')) return Sun
  return Sunrise
}

export function sunCompactValue(record: FishingRecord): string | null {
  const line = formatSunLine(record)
  if (line === '—') return null
  return line.replace(/^(日出|日没|日中|夜間)\s/, '')
}

export function sunFullLine(record: FishingRecord): string {
  return formatSunLine(record)
}

export function tideCompactValue(record: FishingRecord): string | null {
  const line = formatTideLine(record)
  if (line === '—') return null
  if (record.tideLevel != null) {
    return record.tideHarbor
      ? `${record.tideLevel}cm · ${record.tideHarbor}`
      : `${record.tideLevel}cm`
  }
  return line.split(' / ')[0]?.replace('潮位 ', '') ?? null
}

export function tideSlopeIcon(record: FishingRecord): LucideIcon {
  const cmPerHour = record.tideSlopeCmPerHour
  if (cmPerHour != null && cmPerHour > 0) return TrendingUp
  if (cmPerHour != null && cmPerHour < -1) return TrendingDown
  return TrendingUp
}

export function tideSlopeCompactValue(record: FishingRecord): string | null {
  const line = formatTideSlope(record.tideSlopeCmPerHour)
  if (line === '—') return null
  const cmPerHour = record.tideSlopeCmPerHour
  if (cmPerHour != null && Math.abs(cmPerHour) < 1) return '→'
  return line.replace(/\s*(上昇|下降|横ばい)$/, '').replace('0cm/h', '→')
}

export function tideCycleValue(record: FishingRecord): string | null {
  const line = formatTideCycleMoon(record)
  return line === '—' ? null : line
}

export function SunChip({ record }: { record: FishingRecord }) {
  const line = formatSunLine(record)
  const compact = sunCompactValue(record)
  if (!compact) return null
  return (
    <span className="inline-flex items-center gap-1 tabular-nums" title={line}>
      <Icon icon={sunIconForRecord(record)} size="xs" className="text-slate-400" />
      {compact}
    </span>
  )
}

export function TideChip({ record, detailed }: { record: FishingRecord; detailed?: boolean }) {
  const line = formatTideLine(record)
  const level =
    record.tideLevel != null
      ? `${record.tideLevel}cm`
      : line.split(' / ')[0]?.replace('潮位 ', '')
  if (!level) return null
  return (
    <span className="inline-flex items-center gap-1" title={line}>
      <Icon icon={Waves} size="xs" className="text-slate-400" />
      <span className="tabular-nums">{level}</span>
      {detailed && record.tideHarbor ? (
        <span className="truncate text-slate-500" title={record.tideHarbor}>
          {record.tideHarbor}
        </span>
      ) : null}
    </span>
  )
}

export function TideCycleChip({ record }: { record: FishingRecord }) {
  const line = tideCycleValue(record)
  if (!line) return null
  return (
    <span className="inline-flex items-center gap-1" title={line}>
      <Icon icon={Moon} size="xs" className="text-slate-400" />
      <span>{line}</span>
    </span>
  )
}

export function TideSlopeChip({ record }: { record: FishingRecord }) {
  const line = formatTideSlope(record.tideSlopeCmPerHour)
  const short = tideSlopeCompactValue(record)
  if (!short) return null
  return (
    <span className="inline-flex items-center gap-1 tabular-nums" title={line}>
      <Icon icon={tideSlopeIcon(record)} size="xs" className="text-slate-400" />
      {short}
    </span>
  )
}

export function WeatherChip({ record }: { record: FishingRecord }) {
  const hasWeather = record.weatherCode != null || record.temperature != null
  if (!hasWeather) return null
  const label = weatherCodeLabel(record.weatherCode)
  return (
    <span className="inline-flex items-center gap-1">
      <WeatherIcon code={record.weatherCode} size="xs" />
      {record.weatherCode != null && <span>{label}</span>}
      {record.temperature != null && (
        <span className="tabular-nums">{record.temperature}℃</span>
      )}
    </span>
  )
}

export function WindChip({ record }: { record: FishingRecord }) {
  if (record.windSpeedMs == null) return null
  return (
    <span
      className="inline-flex items-center gap-1 tabular-nums"
      title={`風 ${record.windSpeedMs}m/s`}
    >
      <Icon icon={Wind} size="xs" className="text-slate-400" />
      {record.windSpeedMs}m/s
    </span>
  )
}
