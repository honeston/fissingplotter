import clipMapping from './fish-species-clip.json'
import speciesList from './fish-species.json'

export interface FishSpeciesClipEntry {
  ja: string
  clipPrompts: string[]
}

export interface FishPhotoCandidate {
  species: string
  score: number
}

/** 写真からの魚種推定（MobileCLIP）。`false` で無効化 */
export const MOBILECLIP_FISH_SUGGEST_ENABLED =
  import.meta.env.VITE_MOBILECLIP_FISH_SUGGEST !== 'false'

const TOP_K = 5

export function getFishSpeciesClipMapping(): FishSpeciesClipEntry[] {
  return clipMapping as FishSpeciesClipEntry[]
}

/** fish-species.json に無いマッピングがあれば開発時に気づけるよう検証 */
export function assertClipMappingCoversSpeciesList(): void {
  if (!import.meta.env.DEV) return
  const mapped = new Set(getFishSpeciesClipMapping().map((e) => e.ja))
  for (const ja of speciesList) {
    if (!mapped.has(ja)) {
      console.warn(`fish-species-clip.json に ${ja} がありません`)
    }
  }
}

export { TOP_K as FISH_PHOTO_CANDIDATE_LIMIT }
