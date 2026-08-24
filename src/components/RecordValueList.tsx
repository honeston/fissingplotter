import type { ReactNode } from 'react'
import { hasCoordinates } from '../lib/coordinates'
import { hasEditedField } from '../lib/editedFields'
import { formatSunLine, formatTideCycleMoon, formatTideSlope } from '../lib/formatRecord'
import { mapsUrl } from '../lib/maps'
import { formatFishSize, formatFishWeight } from '../lib/units'
import { weatherCodeLabel } from '../lib/weatherCode'
import { useUnitPrefs } from '../hooks/useUnitPrefs'
import type { FishingRecord } from '../types/record'
import { hasTackleContent } from '../types/tackle'
import { WeatherAttribution } from './WeatherAttribution'
import { TideAttribution } from './TideAttribution'

export function EditedMark() {
  return <strong className="ml-1 font-bold">（編集済み）</strong>
}

function Row({
  label,
  edited,
  children,
}: {
  label: string
  edited?: boolean
  children: ReactNode
}) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className={`min-w-0 text-sky-950 ${edited ? 'font-bold' : ''}`}>
        {children}
        {edited ? <EditedMark /> : null}
      </dd>
    </>
  )
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
  const showWeatherCredit =
    record.temperature != null || record.weatherCode != null || record.windSpeedMs != null

  return (
    <>
    <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2 text-sm">
      {!omitCatchFields && (
        <>
          <Row label="魚種">{record.fishSpecies ?? '—'}</Row>
          <Row label="体長">{formatFishSize(record.fishSizeCm, prefs.length)}</Row>
          <Row label="重さ">{formatFishWeight(record.fishWeightG, prefs.weight)}</Row>
          {hasTackleContent(record.tackle) && (
            <>
              {record.tackle!.name ? <Row label="タックル">{record.tackle!.name}</Row> : null}
              {record.tackle!.rod ? <Row label="ロッド">{record.tackle!.rod}</Row> : null}
              {record.tackle!.reel ? <Row label="リール">{record.tackle!.reel}</Row> : null}
              {record.tackle!.line ? <Row label="ライン">{record.tackle!.line}</Row> : null}
              {record.tackle!.lureOrBait ? (
                <Row label="ルアー／エサ">{record.tackle!.lureOrBait}</Row>
              ) : null}
              {record.tackle!.rig ? <Row label="仕掛け">{record.tackle!.rig}</Row> : null}
            </>
          )}
        </>
      )}
      <Row label="場所" edited={locationEdited}>
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
      </Row>
      <Row label="天気">{weatherCodeLabel(record.weatherCode)}</Row>
      <Row label="気温">
        {record.temperature != null ? `${record.temperature}℃` : '—'}
      </Row>
      <Row label="風速">
        {record.windSpeedMs != null ? `${record.windSpeedMs} m/s` : '—'}
      </Row>
      <Row label="太陽">{formatSunLine(record)}</Row>
      <Row label="潮位">
        {record.tideLevel != null ? `${record.tideLevel} cm` : '—'}
        {record.tideHarbor ? `（${record.tideHarbor}）` : ''}
      </Row>
      <Row label="潮種">{formatTideCycleMoon(record)}</Row>
      <Row label="潮位変化">{formatTideSlope(record.tideSlopeCmPerHour)}</Row>
    </dl>
    {showWeatherCredit && (
      <div className="mt-2 space-y-1">
        <WeatherAttribution />
        <TideAttribution />
      </div>
    )}
    </>
  )
}
