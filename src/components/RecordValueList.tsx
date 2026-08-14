import type { ReactNode } from 'react'
import { hasCoordinates } from '../lib/coordinates'
import { formatSunLine, formatTideCycleMoon, formatTideSlope } from '../lib/formatRecord'
import { mapsUrl } from '../lib/maps'
import { weatherCodeLabel } from '../lib/weatherCode'
import type { FishingRecord } from '../types/record'

function Row({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 text-sky-950">{children}</dd>
    </>
  )
}

export function RecordValueList({ record }: { record: FishingRecord }) {
  const coords = hasCoordinates(record)

  return (
    <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2 text-sm">
      <Row label="魚種">{record.fishSpecies ?? '—'}</Row>
      <Row label="体長">
        {record.fishSizeCm != null ? `${record.fishSizeCm} cm` : '—'}
      </Row>
      <Row label="場所">
        {coords ? (
          <a
            href={mapsUrl(record.latitude, record.longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-700 underline"
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
  )
}
