import { useEffect, useId, useRef, useState } from 'react'
import { getRecentFishSpecies, rememberFishSpecies, searchFishSpecies } from '../lib/fishSpecies'

interface FishSpeciesInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function FishSpeciesInput({ value, onChange, disabled }: FishSpeciesInputProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSuggestions(searchFishSpecies(value))
    setHighlight(0)
  }, [value])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
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
    } else if (e.key === 'Enter' && suggestions[highlight]) {
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
      <input
        id={listId}
        type="text"
        inputMode="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        aria-controls={`${listId}-listbox`}
        placeholder="例: アジ"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
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
                onMouseDown={(e) => {
                  e.preventDefault()
                  select(species)
                }}
              >
                {species}
                {getRecentFishSpecies().includes(species) && value.trim() === '' ? (
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
