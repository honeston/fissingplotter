import { MapPin } from 'lucide-react'
import { hasCoordinates } from '../../lib/coordinates'
import { hasEditedField } from '../../lib/editedFields'
import type { FishingRecord } from '../../types/record'
import {
  SunChip,
  TideChip,
  TideCycleChip,
  TideSlopeChip,
  WeatherChip,
  WindChip,
} from './conditionChips'
import { Icon } from './Icon'

interface ConditionRowProps {
  record: FishingRecord
  compact?: boolean
  detailed?: boolean
  className?: string
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

export function ConditionRow({ record, compact, detailed, className = '' }: ConditionRowProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 ${compact ? '' : 'mt-1'} ${className}`}
    >
      <WeatherChip record={record} />
      <WindChip record={record} />
      <SunChip record={record} />
      {detailed && <TideCycleChip record={record} />}
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <TideChip record={record} detailed={detailed} />
        {detailed && <TideSlopeChip record={record} />}
      </span>
      {!compact && <LocationChip record={record} />}
    </div>
  )
}
