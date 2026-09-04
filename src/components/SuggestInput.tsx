import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export type SuggestItem = {
  value: string
  label?: string
  badge?: string
}

const DEFAULT_INPUT_CLASS =
  'w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base text-sky-950 shadow-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60'

const DEFAULT_LABEL_CLASS = 'mb-1.5 block text-sm font-medium text-sky-900'

export interface SuggestInputProps {
  id?: string
  label: ReactNode
  value: string
  onChange: (value: string) => void
  onCommit?: (value: string) => void
  getSuggestions: (query: string) => SuggestItem[]
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
  className?: string
  inputClassName?: string
  labelClassName?: string
}

export function SuggestInput({
  id,
  label,
  value,
  onChange,
  onCommit,
  getSuggestions,
  placeholder,
  disabled,
  ariaLabel,
  className,
  inputClassName,
  labelClassName,
}: SuggestInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const composingRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  /** IME 確定前の入力中文字列（Android 等で onChange が遅れるため） */
  const [composingQuery, setComposingQuery] = useState<string | null>(null)

  const effectiveQuery = composingQuery ?? value
  const suggestions = getSuggestions(effectiveQuery)

  useEffect(() => {
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

  function select(item: SuggestItem) {
    onChange(item.value)
    onCommit?.(item.value)
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
    <div ref={containerRef} className={['relative', className ?? ''].join(' ')}>
      <label className={labelClassName ?? DEFAULT_LABEL_CLASS} htmlFor={inputId}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        inputMode="text"
        autoComplete="off"
        enterKeyHint="done"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        aria-controls={`${inputId}-listbox`}
        aria-label={ariaLabel}
        placeholder={placeholder}
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
          onCommit?.(value)
        }}
        disabled={disabled}
        className={inputClassName ?? DEFAULT_INPUT_CLASS}
      />
      {showList && (
        <ul
          id={`${inputId}-listbox`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-sky-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((item, i) => (
            <li
              key={`${item.value}-${item.label ?? 'label'}-${i}`}
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
                  select(item)
                }}
              >
                {item.label ?? item.value}
                {item.badge ? (
                  <span className="ml-2 text-xs text-slate-400">{item.badge}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
