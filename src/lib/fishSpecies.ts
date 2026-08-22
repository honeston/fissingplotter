import speciesData from './fish-species.json'

export interface FishSpeciesEntry {
  name: string
  aliases?: string[]
}

export interface FishSpeciesMatch {
  /** 記録に保存する標準和名 */
  name: string
  /** 検索にマッチした別名・地方名（標準和名と異なる場合） */
  matchedTerm?: string
}

const entries = speciesData as FishSpeciesEntry[]
const speciesNames = entries.map((entry) => entry.name)

const RECENT_KEY = 'fissingplotter-recent-species'
const RECENT_LIMIT = 10

/** 検索用: ひらがな→カタカナ、半角→全角（NFKC） */
function normalizeForSearch(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[\u3041-\u3096]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .toLowerCase()
}

const searchRows: { name: string; term: string; normalized: string }[] = []
for (const entry of entries) {
  searchRows.push({
    name: entry.name,
    term: entry.name,
    normalized: normalizeForSearch(entry.name),
  })
  for (const alias of entry.aliases ?? []) {
    searchRows.push({
      name: entry.name,
      term: alias,
      normalized: normalizeForSearch(alias),
    })
  }
}

export function getFishSpeciesEntries(): FishSpeciesEntry[] {
  return entries
}

export function getRecentFishSpecies(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s): s is string => typeof s === 'string').slice(0, RECENT_LIMIT)
  } catch {
    return []
  }
}

export function rememberFishSpecies(species: string): void {
  const trimmed = species.trim()
  if (!trimmed) return
  const recent = getRecentFishSpecies().filter((s) => s !== trimmed)
  recent.unshift(trimmed)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, RECENT_LIMIT)))
}

function defaultSuggestions(limit: number): FishSpeciesMatch[] {
  const recent = getRecentFishSpecies()
  if (recent.length > 0) {
    return recent.slice(0, limit).map((name) => ({ name }))
  }
  return speciesNames.slice(0, limit).map((name) => ({ name }))
}

/** 前方一致優先、部分一致も含む候補検索（別名・地方名対応） */
export function searchFishSpecies(query: string, limit = 8): FishSpeciesMatch[] {
  const q = query.trim()
  if (!q) return defaultSuggestions(limit)

  const qNorm = normalizeForSearch(q)
  const prefix: FishSpeciesMatch[] = []
  const partial: FishSpeciesMatch[] = []
  const seen = new Set<string>()

  function push(bucket: FishSpeciesMatch[], name: string, term: string) {
    if (seen.has(name)) return
    seen.add(name)
    bucket.push({
      name,
      matchedTerm: term !== name ? term : undefined,
    })
  }

  for (const row of searchRows) {
    if (row.normalized.startsWith(qNorm)) {
      push(prefix, row.name, row.term)
    } else if (row.normalized.includes(qNorm)) {
      push(partial, row.name, row.term)
    }
    if (prefix.length + partial.length >= limit * 3) break
  }

  const recent = getRecentFishSpecies()
    .filter((name) => normalizeForSearch(name).includes(qNorm) && !seen.has(name))
    .map((name) => ({ name } satisfies FishSpeciesMatch))

  return [...recent, ...prefix, ...partial].slice(0, limit)
}

/** 入力文字列が別名なら標準和名へ正規化する */
export function canonicalFishSpeciesName(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return trimmed
  if (speciesNames.includes(trimmed)) return trimmed

  const qNorm = normalizeForSearch(trimmed)
  for (const row of searchRows) {
    if (row.normalized === qNorm) return row.name
  }
  return trimmed
}
