import { Link } from 'react-router-dom'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import type { RecordResult } from '../hooks/useRecord'
import { formatTideCycleMoon, formatTideSlope } from '../lib/formatRecord'
import { weatherCodeLabel } from '../lib/weatherCode'

function SavedRecordSummary({ result }: { result: RecordResult }) {
  const { record: saved, warnings } = result
  const photoUrl = usePhotoUrl(saved)

  return (
    <section
      className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950"
      role="status"
    >
      <p className="font-semibold">保存しました</p>
      <p className="mt-1 text-xs text-cyan-800">
        {new Date(saved.recordedAt).toLocaleString('ja-JP')}
        {saved.fishSpecies ? ` / ${saved.fishSpecies}` : ''}
        {saved.fishSizeCm != null ? ` / ${saved.fishSizeCm}cm` : ''}
      </p>
      {photoUrl && (
        <img
          src={photoUrl}
          alt="保存した写真"
          className="mt-2 h-24 w-24 rounded-lg border border-cyan-200 object-cover"
        />
      )}
      <dl className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between gap-2">
          <dt>座標</dt>
          <dd>
            {saved.latitude != null && saved.longitude != null
              ? `${saved.latitude.toFixed(5)}, ${saved.longitude.toFixed(5)}`
              : '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>天気</dt>
          <dd>{weatherCodeLabel(saved.weatherCode)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>気温</dt>
          <dd>{saved.temperature != null ? `${saved.temperature}℃` : '—'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>潮位</dt>
          <dd>
            {saved.tideLevel != null ? `${saved.tideLevel} cm` : '—'}
            {saved.tideHarbor ? `（${saved.tideHarbor}）` : ''}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>潮種・月相</dt>
          <dd>{formatTideCycleMoon(saved)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>潮位変化</dt>
          <dd>{formatTideSlope(saved.tideSlopeCmPerHour)}</dd>
        </div>
      </dl>
      {warnings.length > 0 && (
        <ul className="mt-2 list-disc pl-4 text-xs text-amber-800">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <Link to="/history" className="mt-3 inline-block font-medium text-cyan-800 underline">
        履歴を見る
      </Link>
    </section>
  )
}

export { SavedRecordSummary }
