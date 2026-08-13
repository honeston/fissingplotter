import { RecordCard } from './RecordCard'
import type { FishingRecord } from '../types/record'

interface RecordDetailSheetProps {
  record: FishingRecord
  onClose: () => void
  onDelete?: (id: string) => void
}

export function RecordDetailSheet({
  record,
  onClose,
  onDelete,
}: RecordDetailSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="閉じる"
        className="absolute inset-0 bg-sky-950/30"
        onClick={onClose}
      />
      <div className="relative max-h-[85dvh] overflow-y-auto rounded-t-2xl border border-sky-100 bg-white px-4 pb-6 pt-3 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-sky-950">釣果詳細</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            閉じる
          </button>
        </div>
        <RecordCard record={record} onDelete={onDelete} showLargePhoto />
      </div>
    </div>
  )
}
