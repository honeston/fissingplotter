import { RecordCard } from './RecordCard'
import type { FishingRecord } from '../types/record'

interface RecordDetailSheetProps {
  record: FishingRecord
  records?: FishingRecord[]
  onNavigate?: (record: FishingRecord) => void
  onClose: () => void
  onDelete?: (id: string) => void
}

export function RecordDetailSheet({
  record,
  records = [],
  onNavigate,
  onClose,
  onDelete,
}: RecordDetailSheetProps) {
  const currentIndex = records.findIndex((r) => r.id === record.id)
  const hasNavigation = records.length > 1 && currentIndex >= 0 && onNavigate
  const hasPrevious = hasNavigation && currentIndex > 0
  const hasNext = hasNavigation && currentIndex < records.length - 1

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="閉じる"
        className="absolute inset-0 bg-sky-950/30"
        onClick={onClose}
      />
      <div className="relative flex h-[85dvh] flex-col rounded-t-2xl border border-sky-100 bg-white shadow-lg">
        <div className="shrink-0 px-4 pt-3">
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

          {hasNavigation && (
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={!hasPrevious}
                onClick={() => onNavigate(records[currentIndex - 1])}
                className="rounded-lg border border-sky-200 px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm enabled:hover:bg-sky-50 disabled:opacity-30"
              >
                ‹ 前
              </button>
              <span className="text-xs tabular-nums text-slate-500">
                {currentIndex + 1} / {records.length}
              </span>
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => onNavigate(records[currentIndex + 1])}
                className="rounded-lg border border-sky-200 px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm enabled:hover:bg-sky-50 disabled:opacity-30"
              >
                次 ›
              </button>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          <RecordCard record={record} onDelete={onDelete} showLargePhoto />
        </div>
      </div>
    </div>
  )
}
