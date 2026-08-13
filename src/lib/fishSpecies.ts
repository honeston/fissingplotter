import speciesList from './fish-species.json'

const RECENT_KEY = 'fissingplotter-recent-species'
const RECENT_LIMIT = 10

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

/** 前方一致優先、部分一致も含む候補検索 */
export function searchFishSpecies(query: string, limit = 8): string[] {
  const q = query.trim()
  if (!q) {
    const recent = getRecentFishSpecies()
    if (recent.length > 0) return recent.slice(0, limit)
    return speciesList.slice(0, limit)
  }

  const qLower = q.toLowerCase()
  const prefix: string[] = []
  const partial: string[] = []

  for (const species of speciesList) {
    const sLower = species.toLowerCase()
    if (sLower.startsWith(qLower)) {
      prefix.push(species)
    } else if (sLower.includes(qLower)) {
      partial.push(species)
    }
    if (prefix.length + partial.length >= limit * 2) break
  }

  const recent = getRecentFishSpecies().filter(
    (s) => s.toLowerCase().includes(qLower) && !prefix.includes(s) && !partial.includes(s),
  )

  return [...recent, ...prefix, ...partial].slice(0, limit)
}
