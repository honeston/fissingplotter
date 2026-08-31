import { MapPin, Moon, Sunrise, Sunset, Waves, Wind } from 'lucide-react'
import { hasCoordinates } from '../../lib/coordinates'
import { hasEditedField } from '../../lib/editedFields'
import { formatSunLine, formatTideLine } from '../../lib/formatRecord'
import type { FishingRecord } from '../../types/record'
import { Icon } from './Icon'
import { WeatherIcon } from './WeatherIcon'

interface ConditionRowProps {
  record: FishingRecord
  compact?: boolean
}

function SunChip({ record }: { record: FishingRecord }) {
  const line = formatSunLine(record)
  if (line === '—') return null
  const isSunrise = line.startsWith('日出')
  const isSunset = line.startsWith('日没')
  const isNight = line.startsWith('夜間')
  const sunIcon = isSunrise ? Sunrise : isSunset ? Sunset : isNight ? Moon : Sunrise
  return (
    <span className="inline-flex items-center gap-1" title={line}>
      <Icon icon={sunIcon} size="xs" className="text-slate-400" />
      <span className="tabular-nums">{line.replace(/^(日出|日没|日中|夜間)\s/, '')}</span>
    </span>
  )
}

function TideChip({ record }: { record: FishingRecord }) {
  const line = formatTideLine(record)
  if (line === '—') return null
  const level =
    record.tideLevel != null ? `${record.tideLevel}cm` : line.split(' / ')[0]?.replace('潮位 ', '')
  return (
    <span className="inline-flex items-center gap-1" title={line}>
      <Icon icon={Waves} size="xs" className="text-slate-400" />
      <span className="tabular-nums">{level}</span>
    </span>
  )
}

function LocationChip({ record }: { record: FishingRecord }) {
  const locationEdited = hasEditedField(record, 'location')
  const label = hasCoordinates(record)
    ? (record.locationName ?? `${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}`)
    : (record.locationName ?? '座標なし')

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 truncate ${locationEdited ? 'font-bold text-sky-950' : 'text-cyan-700'}`}
      title={label}
    >
      <Icon icon={MapPin} size="xs" className="shrink-0 text-slate-400" />
      <span className="truncate">{label}</span>
    </span>
  )
}

export function ConditionRow({ record, compact }: ConditionRowProps) {
  const hasWeather = record.weatherCode != null || record.temperature != null
  const hasWind = record.windSpeedMs != null

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 ${compact ? '' : 'mt-1'}`}
    >
      {hasWeather && (
        <span className="inline-flex items-center gap-1">
          <WeatherIcon code={record.weatherCode} size="xs" />
          {record.temperature != null && (
            <span className="tabular-nums">{record.temperature}℃</span>
          )}
        </span>
      )}
      {hasWind && (
        <span className="inline-flex items-center gap-1" title={`風 ${record.windSpeedMs}m/s`}>
          <Icon icon={Wind} size="xs" className="text-slate-400" />
          <span className="tabular-nums">{record.windSpeedMs}m/s</span>
        </span>
      )}
      <SunChip record={record} />
      <TideChip record={record} />
      {!compact && <LocationChip record={record} />}
    </div>
  )
}
