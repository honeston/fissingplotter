import { Fish } from 'lucide-react'
import {
  canonicalFishSpeciesName,
  getRecentFishSpecies,
  rememberFishSpecies,
  searchFishSpecies,
  type FishSpeciesMatch,
} from '../lib/fishSpecies'
import { SuggestInput, type SuggestItem } from './SuggestInput'
import { Icon } from './ui/Icon'

interface FishSpeciesInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

function formatSuggestionLabel(match: FishSpeciesMatch): string {
  if (match.matchedTerm && match.matchedTerm !== match.name) {
    return `${match.name}（${match.matchedTerm}）`
  }
  return match.name
}

function toItems(query: string): SuggestItem[] {
  const recent = getRecentFishSpecies()
  const empty = query.trim() === ''
  return searchFishSpecies(query).map((match) => ({
    value: match.name,
    label: formatSuggestionLabel(match),
    badge: empty && recent.includes(match.name) ? '最近' : undefined,
  }))
}

export function FishSpeciesInput({ value, onChange, disabled, className }: FishSpeciesInputProps) {
  return (
    <SuggestInput
      label={
        <>
          <Icon icon={Fish} size="sm" className="text-cyan-700" />
          魚種
        </>
      }
      labelClassName="mb-2 flex items-center gap-1.5 text-sm font-medium text-sky-900"
      className={className ?? 'mb-4'}
      value={value}
      onChange={onChange}
      onCommit={(next) => {
        const trimmed = next.trim()
        if (!trimmed) return
        const canonical = canonicalFishSpeciesName(trimmed)
        if (canonical !== trimmed) onChange(canonical)
        rememberFishSpecies(canonical)
      }}
      getSuggestions={toItems}
      placeholder="例: アジ、シーバス"
      disabled={disabled}
      ariaLabel="魚種（任意）"
    />
  )
}
