import { useEffect, useState } from 'react'
import type { LureOrBaitKind, TackleFields } from '../types/tackle'
import {
  lureOrBaitFieldLabel,
  lureOrBaitFieldPlaceholder,
  rigFieldPlaceholder,
} from '../types/tackle'
import { listMyTackles } from '../lib/myTackle'
import { getAllRecords } from '../lib/storage'
import {
  canonicalTackleTerm,
  collectTackleHistory,
  EMPTY_TACKLE_HISTORY,
  getRecentTackle,
  rememberTackle,
  searchTackleField,
  tackleHistoryKey,
  type TackleHistoryKey,
  type TackleSuggestField,
  type TackleSuggestMatch,
} from '../lib/tackleSuggestions'
import { SuggestInput, type SuggestItem } from './SuggestInput'

const TEXT_FIELDS: {
  key: Exclude<keyof TackleFields, 'lureOrBait' | 'lureOrBaitKind' | 'rig'>
  label: string
  placeholder: string
}[] = [
  { key: 'name', label: 'セット名', placeholder: '例: シーバスセット' },
  { key: 'rod', label: 'ロッド', placeholder: '例: ○ft ML' },
  { key: 'reel', label: 'リール', placeholder: '例: 2500番' },
  { key: 'line', label: 'ライン', placeholder: '例: PE 1.0号' },
]

const KIND_OPTIONS: { value: LureOrBaitKind; label: string }[] = [
  { value: 'lure', label: 'ルアー' },
  { value: 'bait', label: 'エサ' },
]

interface TackleFieldsFormProps {
  value: TackleFields
  onChange: (next: TackleFields) => void
  disabled?: boolean
  idPrefix?: string
}

function formatMatch(match: TackleSuggestMatch, emptyQuery: boolean): SuggestItem {
  return {
    value: match.value,
    label:
      match.matchedTerm && match.matchedTerm !== match.value
        ? `${match.value}（${match.matchedTerm}）`
        : match.value,
    badge: emptyQuery && match.recent ? '最近' : undefined,
  }
}

function suggestionsFor(
  field: TackleSuggestField,
  query: string,
  kind: LureOrBaitKind,
  history: Record<TackleHistoryKey, string[]>,
): SuggestItem[] {
  const key = tackleHistoryKey(field, kind)
  return searchTackleField(field, query, {
    kind,
    history: history[key],
    recent: getRecentTackle(key),
  }).map((match) => formatMatch(match, query.trim() === ''))
}

export function TackleFieldsForm({
  value,
  onChange,
  disabled,
  idPrefix = 'tackle',
}: TackleFieldsFormProps) {
  const [history, setHistory] = useState(EMPTY_TACKLE_HISTORY)

  useEffect(() => {
    let cancelled = false
    void Promise.all([getAllRecords(), listMyTackles()])
      .then(([records, tackles]) => {
        if (cancelled) return
        setHistory(collectTackleHistory(records, tackles))
      })
      .catch(() => {
        /* 履歴が取れなくても固定候補は出る */
      })
    return () => {
      cancelled = true
    }
  }, [])

  function update(key: keyof TackleFields, next: string) {
    onChange({ ...value, [key]: next })
  }

  function commit(field: TackleSuggestField, raw: string) {
    const kind = value.lureOrBaitKind === 'bait' ? 'bait' : 'lure'
    const trimmed = raw.trim()
    if (!trimmed) return
    const canonical = canonicalTackleTerm(field, trimmed, kind)
    if (canonical !== raw) update(field, canonical)
    rememberTackle(tackleHistoryKey(field, kind), canonical)
  }

  const lureId = `${idPrefix}-lureOrBait`
  const rigId = `${idPrefix}-rig`
  const kind = value.lureOrBaitKind === 'bait' ? 'bait' : 'lure'

  return (
    <div className="flex flex-col gap-3">
      {TEXT_FIELDS.map(({ key, label, placeholder }) => {
        const id = `${idPrefix}-${key}`
        return (
          <SuggestInput
            key={key}
            id={id}
            label={label}
            value={value[key]}
            onChange={(next) => update(key, next)}
            onCommit={(next) => commit(key, next)}
            getSuggestions={(query) => suggestionsFor(key, query, kind, history)}
            placeholder={placeholder}
            disabled={disabled}
          />
        )
      })}

      <div>
        <p className="mb-1.5 text-sm font-medium text-sky-900">ルアー／エサ</p>
        <div className="flex gap-2" role="group" aria-label="ルアーまたはエサ">
          {KIND_OPTIONS.map((option) => {
            const active = option.value === kind
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ ...value, lureOrBaitKind: option.value })}
                aria-pressed={active}
                disabled={disabled}
                className={`min-w-16 flex-1 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm disabled:opacity-60 ${
                  active
                    ? 'border-cyan-600 bg-cyan-50 text-cyan-900'
                    : 'border-sky-200 bg-white text-cyan-800'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <SuggestInput
        id={rigId}
        label="仕掛け"
        value={value.rig}
        onChange={(next) => update('rig', next)}
        onCommit={(next) => commit('rig', next)}
        getSuggestions={(query) => suggestionsFor('rig', query, kind, history)}
        placeholder={rigFieldPlaceholder(kind)}
        disabled={disabled}
      />

      <SuggestInput
        id={lureId}
        label={lureOrBaitFieldLabel(kind)}
        value={value.lureOrBait}
        onChange={(next) => update('lureOrBait', next)}
        onCommit={(next) => commit('lureOrBait', next)}
        getSuggestions={(query) => suggestionsFor('lureOrBait', query, kind, history)}
        placeholder={lureOrBaitFieldPlaceholder(kind)}
        disabled={disabled}
      />
    </div>
  )
}
