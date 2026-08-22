import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { FishPhotoCandidate } from '../lib/fishSpeciesClip'
import { getRecentFishSpecies, rememberFishSpecies, searchFishSpecies } from '../lib/fishSpecies'

interface FishSpeciesInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  photoCandidates?: FishPhotoCandidate[]
  photoIdentifying?: boolean
}

export function FishSpeciesInput({
  value,
  onChange,
  disabled,
  photoCandidates = [],
  photoIdentifying = false,
}: FishSpeciesInputProps) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const composingRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [suggestions, setSuggestions] = useState<string[]>([])
  /** IME 確定前の入力中文字列（Android 等で onChange が遅れるため） */
  const [composingQuery, setComposingQuery] = useState<string | null>(null)

  const effectiveQuery = composingQuery ?? value
  const photoCandidateSet = useMemo(
    () => new Set(photoCandidates.map((c) => c.species)),
    [photoCandidates],
  )

  useEffect(() => {
    const textResults = searchFishSpecies(effectiveQuery)
    if (effectiveQuery.trim()) {
      setSuggestions(textResults)
    } else if (photoCandidates.length > 0) {
      const photoNames = photoCandidates.map((c) => c.species)
      const rest = textResults.filter((s) => !photoNames.includes(s))
      setSuggestions([...photoNames, ...rest].slice(0, 8))
    } else {
      setSuggestions(textResults)
    }
    setHighlight(0)
  }, [effectiveQuery, photoCandidates])

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDocPointerDown)
    return () => document.removeEventListener('pointerdown', onDocPointerDown)
  }, [])

  function select(species: string) {
    onChange(species)
    rememberFishSpecies(species)
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
    <div ref={containerRef} className="relative mb-4">
      <label className="mb-2 block text-sm font-medium text-sky-900" htmlFor={listId}>
        魚種（任意）
      </label>
      {photoIdentifying && (
        <p className="mb-2 text-xs text-slate-500" role="status">
          写真から魚種候補を推定中…（初回はモデル取得に時間がかかります）
        </p>
      )}
      {!photoIdentifying && photoCandidates.length > 0 && effectiveQuery.trim() === '' && (
        <p className="mb-2 text-xs text-slate-500">
          写真からの参考候補です。必ず確認して選んでください。
        </p>
      )}
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
        placeholder="例: アジ"
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
          if (value.trim()) rememberFishSpecies(value)
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
          {suggestions.map((species, i) => (
            <li key={species} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                className={`w-full px-4 py-2 text-left text-sm ${
                  i === highlight ? 'bg-cyan-50 text-cyan-900' : 'text-sky-950 hover:bg-sky-50'
                }`}
                onPointerDown={(e) => {
                  e.preventDefault()
                  select(species)
                }}
              >
                {species}
                {photoCandidateSet.has(species) && effectiveQuery.trim() === '' ? (
                  <span className="ml-2 text-xs text-violet-600">写真</span>
                ) : null}
                {getRecentFishSpecies().includes(species) &&
                effectiveQuery.trim() === '' &&
                !photoCandidateSet.has(species) ? (
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
