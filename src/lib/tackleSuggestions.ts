import { normalizeForSearch } from './fishSpecies'
import termsData from './tackle-terms.json'
import type { LureOrBaitKind, MyTackle, TackleFields } from '../types/tackle'

export type TackleSuggestField = 'name' | 'rod' | 'reel' | 'line' | 'rig' | 'lureOrBait'

export type TackleHistoryKey =
  | 'name'
  | 'rod'
  | 'reel'
  | 'line'
  | 'lure'
  | 'bait'
  | 'rigLure'
  | 'rigBait'

export interface TackleTermEntry {
  name: string
  aliases?: string[]
}

export interface TackleSuggestMatch {
  value: string
  matchedTerm?: string
  recent?: boolean
}

type CatalogKey = Exclude<TackleHistoryKey, 'name'>

type TackleTermsFile = Record<CatalogKey, TackleTermEntry[]>

const catalog = termsData as TackleTermsFile

const RECENT_LIMIT = 10
const DEFAULT_LIMIT = 8

export const EMPTY_TACKLE_HISTORY: Record<TackleHistoryKey, string[]> = {
  name: [],
  rod: [],
  reel: [],
  line: [],
  lure: [],
  bait: [],
  rigLure: [],
  rigBait: [],
}

export function tackleHistoryKey(
  field: TackleSuggestField,
  kind: LureOrBaitKind = 'lure',
): TackleHistoryKey {
  if (field === 'lureOrBait') return kind === 'bait' ? 'bait' : 'lure'
  if (field === 'rig') return kind === 'bait' ? 'rigBait' : 'rigLure'
  return field
}

function catalogEntries(field: TackleSuggestField, kind: LureOrBaitKind): TackleTermEntry[] {
  const key = tackleHistoryKey(field, kind)
  if (key === 'name') return []
  return catalog[key] ?? []
}

function recentStorageKey(key: TackleHistoryKey): string {
  return `fissingplotter-recent-tackle-${key}`
}

export function getRecentTackle(key: TackleHistoryKey): string[] {
  try {
    const raw = localStorage.getItem(recentStorageKey(key))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s): s is string => typeof s === 'string').slice(0, RECENT_LIMIT)
  } catch {
    return []
  }
}

export function rememberTackle(key: TackleHistoryKey, value: string): void {
  const trimmed = value.trim()
  if (!trimmed) return
  const recent = getRecentTackle(key).filter((s) => s !== trimmed)
  recent.unshift(trimmed)
  localStorage.setItem(recentStorageKey(key), JSON.stringify(recent.slice(0, RECENT_LIMIT)))
}

function addUnique(list: string[], value: string) {
  const trimmed = value.trim()
  if (!trimmed || list.includes(trimmed)) return
  list.push(trimmed)
}

export function collectTackleHistory(
  records: { tackle?: TackleFields | null }[],
  tackles: Pick<MyTackle, keyof TackleFields>[],
): Record<TackleHistoryKey, string[]> {
  const out: Record<TackleHistoryKey, string[]> = {
    name: [],
    rod: [],
    reel: [],
    line: [],
    lure: [],
    bait: [],
    rigLure: [],
    rigBait: [],
  }

  function absorb(fields: TackleFields) {
    addUnique(out.name, fields.name)
    addUnique(out.rod, fields.rod)
    addUnique(out.reel, fields.reel)
    addUnique(out.line, fields.line)
    const kind = fields.lureOrBaitKind === 'bait' ? 'bait' : 'lure'
    addUnique(out[kind], fields.lureOrBait)
    addUnique(out[kind === 'bait' ? 'rigBait' : 'rigLure'], fields.rig)
  }

  for (const record of records) {
    if (record.tackle) absorb(record.tackle)
  }
  for (const tackle of tackles) absorb(tackle)
  return out
}

/** 入力文字列が別名ならカタログ上の標準名へ寄せる。無いものはそのまま */
export function canonicalTackleTerm(
  field: TackleSuggestField,
  input: string,
  kind: LureOrBaitKind = 'lure',
): string {
  const trimmed = input.trim()
  if (!trimmed) return trimmed
  const entries = catalogEntries(field, kind)
  if (entries.some((entry) => entry.name === trimmed)) return trimmed

  const qNorm = normalizeForSearch(trimmed)
  for (const entry of entries) {
    if (normalizeForSearch(entry.name) === qNorm) return entry.name
    for (const alias of entry.aliases ?? []) {
      if (normalizeForSearch(alias) === qNorm) return entry.name
    }
  }
  return trimmed
}

export function searchTackleField(
  field: TackleSuggestField,
  query: string,
  options: {
    kind?: LureOrBaitKind
    history?: string[]
    recent?: string[]
    limit?: number
  } = {},
): TackleSuggestMatch[] {
  const kind = options.kind === 'bait' ? 'bait' : 'lure'
  const limit = options.limit ?? DEFAULT_LIMIT
  const recent = options.recent ?? []
  const history = options.history ?? []
  const entries = catalogEntries(field, kind)
  const q = query.trim()

  if (!q) {
    const seen = new Set<string>()
    const out: TackleSuggestMatch[] = []
    function push(name: string, recentFlag?: boolean) {
      const trimmed = name.trim()
      if (!trimmed || seen.has(trimmed)) return
      seen.add(trimmed)
      out.push({ value: trimmed, recent: recentFlag })
    }
    for (const name of recent) push(name, true)
    for (const name of history) push(name)
    for (const entry of entries) push(entry.name)
    return out.slice(0, limit)
  }

  const qNorm = normalizeForSearch(q)
  const rows: { name: string; term: string; normalized: string }[] = []
  const catalogNames = new Set(entries.map((entry) => entry.name))

  for (const entry of entries) {
    rows.push({
      name: entry.name,
      term: entry.name,
      normalized: normalizeForSearch(entry.name),
    })
    for (const alias of entry.aliases ?? []) {
      rows.push({
        name: entry.name,
        term: alias,
        normalized: normalizeForSearch(alias),
      })
    }
  }
  for (const extra of [...recent, ...history]) {
    if (catalogNames.has(extra)) continue
    rows.push({
      name: extra,
      term: extra,
      normalized: normalizeForSearch(extra),
    })
  }

  const prefix: TackleSuggestMatch[] = []
  const partial: TackleSuggestMatch[] = []
  const seen = new Set<string>()
  const recentSet = new Set(recent)

  function push(bucket: TackleSuggestMatch[], name: string, term: string) {
    if (seen.has(name)) return
    seen.add(name)
    bucket.push({
      value: name,
      matchedTerm: term !== name ? term : undefined,
      recent: recentSet.has(name),
    })
  }

  for (const row of rows) {
    if (row.normalized.startsWith(qNorm)) {
      push(prefix, row.name, row.term)
    } else if (row.normalized.includes(qNorm)) {
      push(partial, row.name, row.term)
    }
  }

  const recentHits = recent
    .filter((name) => normalizeForSearch(name).includes(qNorm) && !seen.has(name))
    .map((name) => ({ value: name, recent: true }) satisfies TackleSuggestMatch)

  return [...recentHits, ...prefix, ...partial].slice(0, limit)
}
