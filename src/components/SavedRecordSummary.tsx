import { Calendar, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import { useUnitPrefs } from '../hooks/useUnitPrefs'
import type { RecordResult } from '../hooks/useRecord'
import { formatFishCount } from '../lib/fishCount'
import { formatFishSize, formatFishWeight } from '../lib/units'
import { isBlankRecord } from '../types/record'
import { ConditionRow } from './ui/ConditionRow'
import { Icon } from './ui/Icon'

function SavedRecordSummary({ result }: { result: RecordResult }) {
  const { record: saved, warnings } = result
  const { url: photoUrl } = usePhotoUrl(saved)
  const { prefs } = useUnitPrefs()

  const catchBits = isBlankRecord(saved)
    ? ['ボウズ']
    : [
        saved.fishSpecies,
        saved.fishCount != null ? formatFishCount(saved.fishCount) : null,
        saved.fishSizeCm != null ? formatFishSize(saved.fishSizeCm, prefs.length) : null,
        saved.fishWeightG != null ? formatFishWeight(saved.fishWeightG, prefs.weight) : null,
      ].filter(Boolean)

  return (
    <section
      className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950"
      role="status"
      data-testid="record-saved"
    >
      <p className="flex items-center gap-2 font-semibold">
        <Icon icon={CheckCircle} size="sm" className="text-cyan-700" />
        {isBlankRecord(saved) ? '釣行を終了しました' : '保存しました'}
      </p>
      <p className="mt-1 text-xs tabular-nums text-cyan-800">
        {new Date(saved.recordedAt).toLocaleString('ja-JP')}
        {catchBits.length > 0 ? ` · ${catchBits.join(' · ')}` : ''}
      </p>
      {photoUrl && (
        <img
          src={photoUrl}
          alt="保存した写真"
          className="mt-2 h-24 w-24 rounded-lg border border-cyan-200 object-cover"
        />
      )}
      <ConditionRow record={saved} />
      {warnings.length > 0 && (
        <ul className="mt-2 list-disc pl-4 text-xs text-amber-800">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <Link
        to="/history"
        aria-label="履歴を見る"
        data-testid="view-history"
        className="mt-3 inline-flex items-center gap-1.5 font-medium text-cyan-800 underline"
      >
        <Icon icon={Calendar} size="xs" />
        履歴
      </Link>
    </section>
  )
}

export { SavedRecordSummary }
