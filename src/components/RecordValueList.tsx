import {
  Anchor,
  CloudSun,
  Fish,
  Hash,
  Link2,
  MapPin,
  Moon,
  Package,
  Ruler,
  Scale,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { hasCoordinates } from '../lib/coordinates'
import { hasEditedField } from '../lib/editedFields'
import { formatTideLine, formatTideSlope } from '../lib/formatRecord'
import { formatFishCount } from '../lib/fishCount'
import { mapsUrl } from '../lib/maps'
import { formatFishSize, formatFishWeight } from '../lib/units'
import { weatherCodeLabel } from '../lib/weatherCode'
import { useUnitPrefs } from '../hooks/useUnitPrefs'
import type { FishingRecord } from '../types/record'
import { hasTackleContent } from '../types/tackle'
import {
  sunCompactValue,
  sunFullLine,
  sunIconForRecord,
  tideCycleValue,
  tideSlopeCompactValue,
  tideSlopeIcon,
} from './ui/conditionChips'
import { FishingRod } from './icons/FishingRod'
import { Icon } from './ui/Icon'
import { WeatherIcon } from './ui/WeatherIcon'

export function EditedMark() {
  return <strong className="ml-1 font-bold">（編集済み）</strong>
}

function IconRow({
  icon,
  label,
  edited,
  children,
}: {
  icon: LucideIcon
  label: string
  edited?: boolean
  children: ReactNode
}) {
  return (
    <>
      <dt className="flex items-center gap-1.5 text-slate-500" title={label}>
        <Icon icon={icon} size="xs" className="shrink-0 text-slate-400" />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className={`min-w-0 text-sky-950 ${edited ? 'font-bold' : ''}`}>
        {children}
        {edited ? <EditedMark /> : null}
      </dd>
    </>
  )
}

function tideCompactLevel(record: FishingRecord): string | null {
  const line = formatTideLine(record)
  if (line === '—') return null
  if (record.tideLevel != null) {
    return record.tideHarbor
      ? `${record.tideLevel}cm · ${record.tideHarbor}`
      : `${record.tideLevel}cm`
  }
  return line.split(' / ')[0]?.replace('潮位 ', '') ?? null
}

export function RecordValueList({
  record,
  omitCatchFields = false,
}: {
  record: FishingRecord
  omitCatchFields?: boolean
}) {
  const coords = hasCoordinates(record)
  const locationEdited = hasEditedField(record, 'location')
  const { prefs } = useUnitPrefs()
  const sunValue = sunCompactValue(record)
  const tideValue = tideCompactLevel(record)
  const tideCycle = tideCycleValue(record)
  const tideSlopeValue = tideSlopeCompactValue(record)
  const hasWeather = record.weatherCode != null || record.temperature != null

  return (
    <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2.5 text-sm">
      {!omitCatchFields && (
        <>
          <IconRow icon={Fish} label="魚種">
            {record.fishSpecies ?? '—'}
          </IconRow>
          <IconRow icon={Hash} label="匹数">
            {formatFishCount(record.fishCount)}
          </IconRow>
          <IconRow icon={Ruler} label="体長">
            {formatFishSize(record.fishSizeCm, prefs.length)}
          </IconRow>
          <IconRow icon={Scale} label="重さ">
            {formatFishWeight(record.fishWeightG, prefs.weight)}
          </IconRow>
          {hasTackleContent(record.tackle) && (
            <>
              {record.tackle!.name ? (
                <IconRow icon={FishingRod} label="タックル">
                  {record.tackle!.name}
                </IconRow>
              ) : null}
              {record.tackle!.rod ? (
                <IconRow icon={FishingRod} label="ロッド">
                  {record.tackle!.rod}
                </IconRow>
              ) : null}
              {record.tackle!.reel ? (
                <IconRow icon={Package} label="リール">
                  {record.tackle!.reel}
                </IconRow>
              ) : null}
              {record.tackle!.line ? (
                <IconRow icon={Link2} label="ライン">
                  {record.tackle!.line}
                </IconRow>
              ) : null}
              {record.tackle!.lureOrBait ? (
                <IconRow icon={Fish} label="ルアー／エサ">
                  {record.tackle!.lureOrBait}
                </IconRow>
              ) : null}
              {record.tackle!.rig ? (
                <IconRow icon={Anchor} label="仕掛け">
                  {record.tackle!.rig}
                </IconRow>
              ) : null}
            </>
          )}
        </>
      )}
      <IconRow icon={MapPin} label="場所" edited={locationEdited}>
        {coords ? (
          <a
            href={mapsUrl(record.latitude, record.longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline ${locationEdited ? 'text-sky-950' : 'text-cyan-700'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {record.locationName ??
              `${record.latitude.toFixed(5)}, ${record.longitude.toFixed(5)}`}
          </a>
        ) : (
          (record.locationName ?? '—')
        )}
      </IconRow>
      {hasWeather && (
        <IconRow icon={CloudSun} label="天気">
          <span className="inline-flex items-center gap-1.5">
            <WeatherIcon code={record.weatherCode} size="xs" />
            {record.weatherCode != null && (
              <span>{weatherCodeLabel(record.weatherCode)}</span>
            )}
            {record.temperature != null && (
              <span className="tabular-nums">{record.temperature}℃</span>
            )}
          </span>
        </IconRow>
      )}
      {record.windSpeedMs != null && (
        <IconRow icon={Wind} label="風速">
          <span className="tabular-nums">{record.windSpeedMs} m/s</span>
        </IconRow>
      )}
      {sunValue && (
        <IconRow icon={sunIconForRecord(record)} label="太陽">
          <span className="tabular-nums" title={sunFullLine(record)}>
            {sunValue}
          </span>
        </IconRow>
      )}
      {tideCycle && (
        <IconRow icon={Moon} label="潮種">
          {tideCycle}
        </IconRow>
      )}
      {(tideValue || tideSlopeValue) && (
        <IconRow icon={Waves} label="潮位">
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
            {tideValue && (
              <span title={formatTideLine(record)}>{tideValue}</span>
            )}
            {tideSlopeValue && (
              <span
                className="inline-flex items-center gap-1"
                title={formatTideSlope(record.tideSlopeCmPerHour)}
              >
                <Icon
                  icon={tideSlopeIcon(record)}
                  size="xs"
                  className="shrink-0 text-slate-400"
                />
                <span className="sr-only">潮位変化</span>
                {tideSlopeValue}
              </span>
            )}
          </span>
        </IconRow>
      )}
    </dl>
  )
}
