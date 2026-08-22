import { Link } from 'react-router-dom'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import type { RecordResult } from '../hooks/useRecord'
import { RecordValueList } from './RecordValueList'

function SavedRecordSummary({ result }: { result: RecordResult }) {
  const { record: saved, warnings } = result
  const { url: photoUrl } = usePhotoUrl(saved)

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
        {saved.fishWeightG != null ? ` / ${saved.fishWeightG}g` : ''}
      </p>
      {photoUrl && (
        <img
          src={photoUrl}
          alt="保存した写真"
          className="mt-2 h-24 w-24 rounded-lg border border-cyan-200 object-cover"
        />
      )}
      <RecordValueList record={saved} />
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
