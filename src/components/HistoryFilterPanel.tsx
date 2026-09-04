import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  EMPTY_HISTORY_FILTERS,
  hasActiveHistoryFilters,
  suggestHistoryValues,
  uniqueHistoryLures,
  uniqueHistoryPlaces,
  uniqueHistorySpecies,
  type HistoryFilters,
  type HistoryResultFilter,
} from '../lib/historyFilters'
import type { FishingRecord } from '../types/record'
import { SuggestInput } from './SuggestInput'
import { Icon } from './ui/Icon'

const RESULT_OPTIONS: { value: HistoryResultFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'catch', label: '釣果' },
  { value: 'blank', label: 'ボウズ' },
]

export function HistoryFilterPanel({
  records,
  filters,
  onChange,
}: {
  records: FishingRecord[]
  filters: HistoryFilters
  onChange: (filters: HistoryFilters) => void
}) {
  const active = hasActiveHistoryFilters(filters)
  const [open, setOpen] = useState(active)

  const species = useMemo(() => uniqueHistorySpecies(records), [records])
  const places = useMemo(() => uniqueHistoryPlaces(records), [records])
  const lures = useMemo(() => uniqueHistoryLures(records), [records])

  function patch(partial: Partial<HistoryFilters>) {
    onChange({ ...filters, ...partial })
  }

  return (
    <div className="mb-4 rounded-xl border border-sky-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        data-testid="history-filter-toggle"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-cyan-800"
      >
        <span className="inline-flex items-center gap-2">
          <Icon icon={Filter} size="sm" />
          絞り込み
          {active ? (
            <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs tabular-nums text-cyan-900">
              条件あり
            </span>
          ) : null}
        </span>
        <Icon icon={open ? ChevronUp : ChevronDown} size="sm" />
      </button>

      {open && (
        <div className="space-y-3 border-t border-sky-100 px-3 py-3">
          <SuggestInput
            label="魚種"
            value={filters.species}
            onChange={(value) => patch({ species: value })}
            getSuggestions={(query) =>
              suggestHistoryValues(species, query).map((value) => ({ value }))
            }
            placeholder="例: アジ"
            ariaLabel="魚種で絞り込み"
          />
          <SuggestInput
            label="場所"
            value={filters.place}
            onChange={(value) => patch({ place: value })}
            getSuggestions={(query) =>
              suggestHistoryValues(places, query).map((value) => ({ value }))
            }
            placeholder="例: 江の島"
            ariaLabel="場所で絞り込み"
          />
          <SuggestInput
            label="ルアー／エサ"
            value={filters.lure}
            onChange={(value) => patch({ lure: value })}
            getSuggestions={(query) =>
              suggestHistoryValues(lures, query).map((value) => ({ value }))
            }
            placeholder="例: ミノー"
            ariaLabel="ルアーまたはエサで絞り込み"
          />
          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-sky-900">結果</legend>
            <div className="flex gap-2" role="radiogroup" aria-label="結果">
              {RESULT_OPTIONS.map((option) => {
                const selected = filters.result === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`history-filter-result-${option.value}`}
                    onClick={() => patch({ result: option.value })}
                    className={`min-h-10 flex-1 rounded-lg border px-2 text-sm font-medium ${
                      selected
                        ? 'border-cyan-700 bg-cyan-700 text-white'
                        : 'border-sky-200 bg-white text-cyan-800'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </fieldset>
          {active && (
            <button
              type="button"
              onClick={() => onChange(EMPTY_HISTORY_FILTERS)}
              data-testid="history-filter-clear"
              className="inline-flex items-center gap-1 text-sm text-cyan-800"
            >
              <Icon icon={X} size="xs" />
              条件をクリア
            </button>
          )}
        </div>
      )}
    </div>
  )
}
