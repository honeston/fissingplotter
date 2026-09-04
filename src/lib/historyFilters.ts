import { speciesMatchesSearch } from './fishSpecies'
import { isBlankRecord, type FishingRecord } from '../types/record'

export type HistoryResultFilter = 'all' | 'catch' | 'blank'

export type HistoryFilters = {
  species: string
  place: string
  lure: string
  result: HistoryResultFilter
}

export const EMPTY_HISTORY_FILTERS: HistoryFilters = {
  species: '',
  place: '',
  lure: '',
  result: 'all',
}

export function parseHistoryResultFilter(value: string | null): HistoryResultFilter {
  if (value === 'catch' || value === 'blank') return value
  return 'all'
}

export function historyFiltersFromSearchParams(params: URLSearchParams): HistoryFilters {
  return {
    species: params.get('species')?.trim() ?? '',
    place: params.get('place')?.trim() ?? '',
    lure: params.get('lure')?.trim() ?? '',
    result: parseHistoryResultFilter(params.get('result')),
  }
}

export function applyHistoryFiltersToSearchParams(
  params: URLSearchParams,
  filters: HistoryFilters,
): URLSearchParams {
  const next = new URLSearchParams(params)
  const setOrDelete = (key: string, value: string) => {
    if (value) next.set(key, value)
    else next.delete(key)
  }
  setOrDelete('species', filters.species)
  setOrDelete('place', filters.place)
  setOrDelete('lure', filters.lure)
  if (filters.result === 'all') next.delete('result')
  else next.set('result', filters.result)
  return next
}

export function hasActiveHistoryFilters(filters: HistoryFilters): boolean {
  return Boolean(filters.species || filters.place || filters.lure || filters.result !== 'all')
}

function includesLoose(haystack: string | null | undefined, needle: string): boolean {
  const q = needle.trim().toLocaleLowerCase('ja')
  if (!q) return true
  return (haystack ?? '').toLocaleLowerCase('ja').includes(q)
}

export function recordMatchesHistoryFilters(
  record: FishingRecord,
  filters: HistoryFilters,
): boolean {
  if (filters.result === 'blank' && !isBlankRecord(record)) return false
  if (filters.result === 'catch' && isBlankRecord(record)) return false
  if (filters.species) {
    const species = record.fishSpecies?.trim() ?? ''
    if (!species) return false
    if (!speciesMatchesSearch(species, filters.species) && species !== filters.species) {
      return false
    }
  }
  if (filters.place && !includesLoose(record.locationName, filters.place)) return false
  if (filters.lure && !includesLoose(record.tackle?.lureOrBait, filters.lure)) return false
  return true
}

export function filterRecordsByHistory(
  records: FishingRecord[],
  filters: HistoryFilters,
): FishingRecord[] {
  if (!hasActiveHistoryFilters(filters)) return records
  return records.filter((record) => recordMatchesHistoryFilters(record, filters))
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'ja'))
}

export function uniqueHistorySpecies(records: FishingRecord[]): string[] {
  return uniqueSorted(
    records
      .map((record) => record.fishSpecies?.trim() ?? '')
      .filter(Boolean),
  )
}

export function uniqueHistoryPlaces(records: FishingRecord[]): string[] {
  return uniqueSorted(
    records
      .map((record) => record.locationName?.trim() ?? '')
      .filter(Boolean),
  )
}

export function uniqueHistoryLures(records: FishingRecord[]): string[] {
  return uniqueSorted(
    records
      .map((record) => record.tackle?.lureOrBait?.trim() ?? '')
      .filter(Boolean),
  )
}

export function suggestHistoryValues(all: string[], query: string): string[] {
  const q = query.trim().toLocaleLowerCase('ja')
  if (!q) return all.slice(0, 12)
  return all.filter((value) => value.toLocaleLowerCase('ja').includes(q)).slice(0, 12)
}
