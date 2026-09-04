import { recordDateKey } from './dates'
import { catchCountOf } from './fishCount'
import { speciesMatchesSearch } from './fishSpecies'
import { isBlankRecord, type FishingRecord } from '../types/record'

export type SpeciesStat = {
  species: string
  count: number
  maxSizeCm: number | null
  maxWeightG: number | null
  /** 最大サイズを出した記録（同値なら新しい方） */
  maxSizeRecord: FishingRecord | null
  /** 最大重量を出した記録（同値なら新しい方） */
  maxWeightRecord: FishingRecord | null
  /** 最大釣果日（いちばん多く釣った日、YYYY-MM-DD、同数なら新しい日） */
  bestCatchDateKey: string | null
  bestCatchCount: number
  records: FishingRecord[]
}

export type SpeciesSortKey = 'species' | 'count' | 'maxSizeCm' | 'maxWeightG'
export type SortDirection = 'asc' | 'desc'

function sortRecordsNewestFirst(records: FishingRecord[]): FishingRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  )
}

function pickNewer(a: FishingRecord, b: FishingRecord): FishingRecord {
  return new Date(a.recordedAt).getTime() >= new Date(b.recordedAt).getTime() ? a : b
}

function recordHasPhoto(
  record: FishingRecord,
  localPhotoIds: ReadonlySet<string>,
): boolean {
  return Boolean(record.photoKey) || localPhotoIds.has(record.id)
}

/** 写真付きのうち最大サイズ（同値・サイズなしは新しい方）。なければ null */
export function pickCoverRecord(
  records: FishingRecord[],
  localPhotoIds: ReadonlySet<string>,
): FishingRecord | null {
  let cover: FishingRecord | null = null
  for (const record of records) {
    if (!recordHasPhoto(record, localPhotoIds)) continue
    if (cover == null) {
      cover = record
      continue
    }
    const size = record.fishSizeCm
    const coverSize = cover.fishSizeCm
    if (size != null) {
      if (
        coverSize == null ||
        size > coverSize ||
        (size === coverSize && pickNewer(record, cover) === record)
      ) {
        cover = record
      }
    } else if (coverSize == null && pickNewer(record, cover) === record) {
      cover = record
    }
  }
  return cover
}

function findBestCatchDay(records: FishingRecord[]): {
  dateKey: string | null
  count: number
} {
  const counts = new Map<string, number>()
  for (const record of records) {
    const key = recordDateKey(record)
    counts.set(key, (counts.get(key) ?? 0) + catchCountOf(record))
  }

  let bestKey: string | null = null
  let bestCount = 0
  for (const [key, count] of counts) {
    if (
      count > bestCount ||
      (count === bestCount && bestKey != null && key > bestKey) ||
      (count === bestCount && bestKey == null)
    ) {
      bestKey = key
      bestCount = count
    }
  }
  return { dateKey: bestKey, count: bestCount }
}

/** 魚種ありの記録だけを集計する（未入力は除外） */
export function buildSpeciesStats(records: FishingRecord[]): SpeciesStat[] {
  const bySpecies = new Map<string, FishingRecord[]>()

  for (const record of records) {
    if (isBlankRecord(record)) continue
    const species = record.fishSpecies?.trim()
    if (!species) continue
    const list = bySpecies.get(species)
    if (list) list.push(record)
    else bySpecies.set(species, [record])
  }

  const stats: SpeciesStat[] = []
  for (const [species, speciesRecords] of bySpecies) {
    let maxSizeRecord: FishingRecord | null = null
    let maxWeightRecord: FishingRecord | null = null

    for (const record of speciesRecords) {
      if (record.fishSizeCm != null) {
        if (
          maxSizeRecord == null ||
          record.fishSizeCm > (maxSizeRecord.fishSizeCm ?? -Infinity) ||
          (record.fishSizeCm === maxSizeRecord.fishSizeCm &&
            pickNewer(record, maxSizeRecord) === record)
        ) {
          maxSizeRecord = record
        }
      }
      if (record.fishWeightG != null) {
        if (
          maxWeightRecord == null ||
          record.fishWeightG > (maxWeightRecord.fishWeightG ?? -Infinity) ||
          (record.fishWeightG === maxWeightRecord.fishWeightG &&
            pickNewer(record, maxWeightRecord) === record)
        ) {
          maxWeightRecord = record
        }
      }
    }

    const bestDay = findBestCatchDay(speciesRecords)
    stats.push({
      species,
      count: speciesRecords.reduce((sum, record) => sum + catchCountOf(record), 0),
      maxSizeCm: maxSizeRecord?.fishSizeCm ?? null,
      maxWeightG: maxWeightRecord?.fishWeightG ?? null,
      maxSizeRecord,
      maxWeightRecord,
      bestCatchDateKey: bestDay.dateKey,
      bestCatchCount: bestDay.count,
      records: sortRecordsNewestFirst(speciesRecords),
    })
  }

  return sortSpeciesStats(stats, 'count', 'desc')
}

function compareNullableNumber(
  a: number | null,
  b: number | null,
  direction: SortDirection,
): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return direction === 'asc' ? a - b : b - a
}

export function sortSpeciesStats(
  stats: SpeciesStat[],
  key: SpeciesSortKey,
  direction: SortDirection,
): SpeciesStat[] {
  return [...stats].sort((a, b) => {
    let primary = 0
    if (key === 'species') {
      primary = a.species.localeCompare(b.species, 'ja')
      if (direction === 'desc') primary = -primary
    } else if (key === 'count') {
      primary = direction === 'asc' ? a.count - b.count : b.count - a.count
    } else if (key === 'maxSizeCm') {
      primary = compareNullableNumber(a.maxSizeCm, b.maxSizeCm, direction)
    } else {
      primary = compareNullableNumber(a.maxWeightG, b.maxWeightG, direction)
    }
    if (primary !== 0) return primary
    return a.species.localeCompare(b.species, 'ja')
  })
}

export function findSpeciesStat(
  stats: SpeciesStat[],
  species: string,
): SpeciesStat | undefined {
  return stats.find((stat) => stat.species === species)
}

/** 魚種名・別名（ひらがな可）で絞り込む。空クエリは全件 */
export function filterSpeciesStats(
  stats: SpeciesStat[],
  query: string,
): SpeciesStat[] {
  if (!query.trim()) return stats
  return stats.filter((stat) => speciesMatchesSearch(stat.species, query))
}

/** 図鑑に載る魚種数と釣果数（魚種なしは含めない） */
export function encyclopediaTotals(stats: SpeciesStat[]): {
  speciesCount: number
  catchCount: number
} {
  let catchCount = 0
  for (const stat of stats) catchCount += stat.count
  return { speciesCount: stats.length, catchCount }
}
