import { Fish } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import {
  canonicalFishSpeciesName,
  getRecentFishSpecies,
  rememberFishSpecies,
  searchFishSpecies,
  type FishSpeciesMatch,
} from '../lib/fishSpecies'
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

export function FishSpeciesInput({ value, onChange, disabled, className }: FishSpeciesInputProps) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const composingRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [suggestions, setSuggestions] = useState<FishSpeciesMatch[]>([])
  /** IME 確定前の入力中文字列（Android 等で onChange が遅れるため） */
  const [composingQuery, setComposingQuery] = useState<string | null>(null)

  const effectiveQuery = composingQuery ?? value

  useEffect(() => {
    setSuggestions(searchFishSpecies(effectiveQuery))
    setHighlight(0)
  }, [effectiveQuery])

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDocPointerDown)
    return () => document.removeEventListener('pointerdown', onDocPointerDown)
  }, [])

  function select(match: FishSpeciesMatch) {
    onChange(match.name)
    rememberFishSpecies(match.name)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (!open || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' && suggestions[highlight] && !e.nativeEvent.isComposing) {
      e.preventDefault()
      select(suggestions[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && suggestions.length > 0 && !disabled

  return (
    <div ref={containerRef} className={['relative', className ?? 'mb-4'].join(' ')}>
      <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-sky-900" htmlFor={listId}>
        <Icon icon={Fish} size="sm" className="text-cyan-700" />
        魚種
      </label>
      <input
        ref={inputRef}
        id={listId}
        type="text"
        inputMode="text"
        autoComplete="off"
        enterKeyHint="done"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        aria-controls={`${listId}-listbox`}
        aria-label="魚種（任意）"
        placeholder="例: アジ、シーバス"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          if (!composingRef.current) setComposingQuery(null)
          setOpen(true)
        }}
        onInput={() => {
          if (!composingRef.current) return
          setComposingQuery(inputRef.current?.value ?? '')
          setOpen(true)
        }}
        onCompositionStart={() => {
          composingRef.current = true
          setComposingQuery(inputRef.current?.value ?? '')
          setOpen(true)
        }}
        onCompositionUpdate={(e) => {
          setComposingQuery(e.currentTarget.value)
          setOpen(true)
        }}
        onCompositionEnd={(e) => {
          composingRef.current = false
          setComposingQuery(null)
          onChange(e.currentTarget.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          const trimmed = value.trim()
          if (!trimmed) return
          const canonical = canonicalFishSpeciesName(trimmed)
          if (canonical !== trimmed) onChange(canonical)
          rememberFishSpecies(canonical)
        }}
        disabled={disabled}
        className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base text-sky-950 shadow-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60"
      />
      {showList && (
        <ul
          id={`${listId}-listbox`}
          role="listbox"
          className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-sky-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((match, i) => (
            <li
              key={`${match.name}-${match.matchedTerm ?? 'name'}-${i}`}
              role="option"
              aria-selected={i === highlight}
            >
              <button
                type="button"
                className={`w-full px-4 py-2 text-left text-sm ${
                  i === highlight ? 'bg-cyan-50 text-cyan-900' : 'text-sky-950 hover:bg-sky-50'
                }`}
                onPointerDown={(e) => {
                  e.preventDefault()
                  select(match)
                }}
              >
                {formatSuggestionLabel(match)}
                {getRecentFishSpecies().includes(match.name) && effectiveQuery.trim() === '' ? (
                  <span className="ml-2 text-xs text-slate-400">最近</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
