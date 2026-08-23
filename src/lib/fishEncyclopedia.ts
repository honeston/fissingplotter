import { recordDateKey } from './dates'
import type { FishingRecord } from '../types/record'

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

function findBestCatchDay(records: FishingRecord[]): {
  dateKey: string | null
  count: number
} {
  const counts = new Map<string, number>()
  for (const record of records) {
    const key = recordDateKey(record)
    counts.set(key, (counts.get(key) ?? 0) + 1)
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
      count: speciesRecords.length,
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
