import type { FishingRecord } from '../types/record'
import { hasCoordinates, type MappableRecord } from './coordinates'
import { recordDateKey } from './dates'
import { catchCountOf } from './fishCount'
import { FLAT_SLOPE_CM_PER_HOUR } from './formatRecord'

export const TIME_SLOTS = ['dawn', 'day', 'dusk', 'night'] as const
export type TimeSlot = (typeof TIME_SLOTS)[number]

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  dawn: '朝マヅメ',
  day: '日中',
  dusk: '夕マヅメ',
  night: '夜',
}

export const TIDE_SLOPES = ['up', 'down', 'flat'] as const
export type TideSlopeKey = (typeof TIDE_SLOPES)[number]

export const TIDE_SLOPE_LABELS: Record<TideSlopeKey, string> = {
  up: '上げ潮',
  down: '下げ潮',
  flat: '横ばい',
}

export const TIDE_CYCLE_ORDER = ['大潮', '中潮', '小潮', '長潮', '若潮'] as const

export const CATCH_AXIS_IDS = ['slot', 'tide', 'cycle', 'place', 'lure', 'rig'] as const
export type CatchAxisId = (typeof CATCH_AXIS_IDS)[number]

export const CATCH_AXIS_LABELS: Record<CatchAxisId, string> = {
  slot: '時間帯',
  tide: '潮の向き',
  cycle: '潮種',
  place: '場所',
  lure: 'ルアー／エサ',
  rig: '仕掛け',
}

export const PLACE_GROUP_METERS = 50
export const SUMMARY_MIN_CATCH = 3
const MAZUME_MS = 60 * 60 * 1000
const EARTH_RADIUS_M = 6_371_000

export type CatchBucket = {
  key: string
  label: string
  count: number
  dayCount: number
  records: FishingRecord[]
}

export type CatchAxis = {
  id: CatchAxisId
  label: string
  knownCount: number
  buckets: CatchBucket[]
}

export type SpeciesCatchSummary = {
  labels: string[]
  headline: string
}

export type SpeciesCatchPattern = {
  totalCount: number
  summary: SpeciesCatchSummary | null
  axes: CatchAxis[]
}

export type SpeciesConditionFilter = {
  axis: CatchAxisId
  key: string
}

function parseMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime()
  return Number.isNaN(ms) ? null : ms
}

function uniqueDayCount(records: FishingRecord[]): number {
  return new Set(records.map(recordDateKey)).size
}

function bucketOf(key: string, label: string, records: FishingRecord[]): CatchBucket {
  return {
    key,
    label,
    count: records.reduce((sum, record) => sum + catchCountOf(record), 0),
    dayCount: uniqueDayCount(records),
    records,
  }
}

function distanceMeters(
  a: Pick<MappableRecord, 'latitude' | 'longitude'>,
  b: Pick<MappableRecord, 'latitude' | 'longitude'>,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLng * sinLng
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function timeSlotOf(record: FishingRecord): TimeSlot | null {
  const recorded = parseMs(record.recordedAt)
  const dawn = parseMs(record.dawnAt)
  const sunrise = parseMs(record.sunriseAt)
  const sunset = parseMs(record.sunsetAt)
  const dusk = parseMs(record.duskAt)
  if (recorded == null || dawn == null || sunrise == null || sunset == null || dusk == null) {
    return null
  }

  if (recorded < dawn || recorded > dusk) return 'night'

  const morningEnd = sunrise + MAZUME_MS
  const eveningStart = sunset - MAZUME_MS
  if (morningEnd > eveningStart) {
    const noon = (sunrise + sunset) / 2
    return recorded < noon ? 'dawn' : 'dusk'
  }
  if (recorded < morningEnd) return 'dawn'
  if (recorded >= eveningStart) return 'dusk'
  return 'day'
}

export function tideSlopeKeyOf(record: FishingRecord): TideSlopeKey | null {
  const slope = record.tideSlopeCmPerHour
  if (slope == null || !Number.isFinite(slope)) return null
  if (Math.abs(slope) < FLAT_SLOPE_CM_PER_HOUR) return 'flat'
  return slope > 0 ? 'up' : 'down'
}

export function placeKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`
}

function tackleField(record: FishingRecord, field: 'lureOrBait' | 'rig'): string | null {
  const value = record.tackle?.[field]?.trim()
  return value ? value : null
}

function groupByKey(
  records: FishingRecord[],
  keyOf: (record: FishingRecord) => string | null,
): { knownCount: number; groups: Map<string, FishingRecord[]> } {
  const groups = new Map<string, FishingRecord[]>()
  let knownCount = 0
  for (const record of records) {
    const key = keyOf(record)
    if (!key) continue
    knownCount += catchCountOf(record)
    const list = groups.get(key)
    if (list) list.push(record)
    else groups.set(key, [record])
  }
  return { knownCount, groups }
}

function axisFromGroups(
  id: CatchAxisId,
  knownCount: number,
  buckets: CatchBucket[],
): CatchAxis | null {
  if (knownCount <= 0) return null
  return { id, label: CATCH_AXIS_LABELS[id], knownCount, buckets }
}

function buildSlotAxis(records: FishingRecord[]): CatchAxis | null {
  const { knownCount, groups } = groupByKey(records, timeSlotOf)
  if (knownCount <= 0) return null
  const buckets = TIME_SLOTS.map((slot) =>
    bucketOf(slot, TIME_SLOT_LABELS[slot], groups.get(slot) ?? []),
  )
  return axisFromGroups('slot', knownCount, buckets)
}

function buildTideAxis(records: FishingRecord[]): CatchAxis | null {
  const { knownCount, groups } = groupByKey(records, tideSlopeKeyOf)
  if (knownCount <= 0) return null
  const buckets = TIDE_SLOPES.map((key) =>
    bucketOf(key, TIDE_SLOPE_LABELS[key], groups.get(key) ?? []),
  )
  return axisFromGroups('tide', knownCount, buckets)
}

function buildCycleAxis(records: FishingRecord[]): CatchAxis | null {
  const { knownCount, groups } = groupByKey(records, (record) => {
    const cycle = record.tideCycle?.trim()
    return cycle ? cycle : null
  })
  if (knownCount <= 0) return null

  const known = new Set<string>(TIDE_CYCLE_ORDER)
  const extra = [...groups.keys()].filter((key) => !known.has(key)).sort((a, b) => a.localeCompare(b, 'ja'))
  const keys = [...TIDE_CYCLE_ORDER.filter((key) => groups.has(key)), ...extra]
  const buckets = keys.map((key) => bucketOf(key, key, groups.get(key) ?? []))
  return axisFromGroups('cycle', knownCount, buckets)
}

function placeLabel(members: MappableRecord[]): string {
  const counts = new Map<string, number>()
  for (const record of members) {
    const name = record.locationName?.trim()
    if (!name) continue
    counts.set(name, (counts.get(name) ?? 0) + catchCountOf(record))
  }
  let best: string | null = null
  let bestCount = 0
  for (const [name, count] of counts) {
    if (
      count > bestCount ||
      (count === bestCount && (best == null || name.localeCompare(best, 'ja') < 0))
    ) {
      best = name
      bestCount = count
    }
  }
  if (best) return best
  const lat = members.reduce((sum, record) => sum + record.latitude, 0) / members.length
  const lng = members.reduce((sum, record) => sum + record.longitude, 0) / members.length
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

function buildPlaceAxis(records: FishingRecord[]): CatchAxis | null {
  const mapped = records.filter(hasCoordinates)
  if (mapped.length === 0) return null

  const parent = mapped.map((_, index) => index)
  function find(index: number): number {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]]
      index = parent[index]
    }
    return index
  }
  function union(a: number, b: number) {
    const pa = find(a)
    const pb = find(b)
    if (pa !== pb) parent[pb] = pa
  }

  for (let i = 0; i < mapped.length; i++) {
    for (let j = i + 1; j < mapped.length; j++) {
      if (distanceMeters(mapped[i], mapped[j]) <= PLACE_GROUP_METERS) union(i, j)
    }
  }

  const groups = new Map<number, MappableRecord[]>()
  for (let i = 0; i < mapped.length; i++) {
    const root = find(i)
    const list = groups.get(root)
    if (list) list.push(mapped[i])
    else groups.set(root, [mapped[i]])
  }

  const byKey = new Map<string, CatchBucket>()
  for (const members of groups.values()) {
    const lat = members.reduce((sum, record) => sum + record.latitude, 0) / members.length
    const lng = members.reduce((sum, record) => sum + record.longitude, 0) / members.length
    const key = placeKey(lat, lng)
    const existing = byKey.get(key)
    const merged = existing ? [...existing.records, ...members] : members
    byKey.set(key, bucketOf(key, placeLabel(merged as MappableRecord[]), merged))
  }

  const buckets = [...byKey.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.label.localeCompare(b.label, 'ja')
  })
  const knownCount = buckets.reduce((sum, bucket) => sum + bucket.count, 0)
  return axisFromGroups('place', knownCount, buckets)
}

function buildTackleAxis(
  id: 'lure' | 'rig',
  records: FishingRecord[],
  field: 'lureOrBait' | 'rig',
): CatchAxis | null {
  const { knownCount, groups } = groupByKey(records, (record) => tackleField(record, field))
  if (knownCount <= 0) return null
  const buckets = [...groups.entries()]
    .map(([key, list]) => bucketOf(key, key, list))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.label.localeCompare(b.label, 'ja')
    })
  return axisFromGroups(id, knownCount, buckets)
}

function uniqueTop(axis: CatchAxis): CatchBucket | null {
  const ranked = axis.buckets.filter((bucket) => bucket.count > 0).sort((a, b) => b.count - a.count)
  if (ranked.length === 0) return null
  if (ranked.length > 1 && ranked[0].count === ranked[1].count) return null
  return ranked[0]
}

function buildSummary(totalCount: number, axes: CatchAxis[]): SpeciesCatchSummary | null {
  if (totalCount < SUMMARY_MIN_CATCH) return null

  const tops: { axis: CatchAxis; bucket: CatchBucket }[] = []
  for (const axis of axes) {
    if (axis.knownCount < SUMMARY_MIN_CATCH) continue
    const top = uniqueTop(axis)
    if (!top) continue
    tops.push({ axis, bucket: top })
  }
  if (tops.length === 0) return null

  let best = tops[0]
  for (const candidate of tops.slice(1)) {
    const bestShare = best.bucket.count / best.axis.knownCount
    const nextShare = candidate.bucket.count / candidate.axis.knownCount
    if (nextShare > bestShare) best = candidate
  }

  return {
    labels: tops.map((item) => item.bucket.label),
    headline: `${best.bucket.label}が多い（${best.axis.label}が分かる${best.axis.knownCount}匹中${best.bucket.count}匹）`,
  }
}

export function buildSpeciesCatchPattern(records: FishingRecord[]): SpeciesCatchPattern {
  const totalCount = records.reduce((sum, record) => sum + catchCountOf(record), 0)
  const axes = [
    buildSlotAxis(records),
    buildTideAxis(records),
    buildCycleAxis(records),
    buildPlaceAxis(records),
    buildTackleAxis('lure', records, 'lureOrBait'),
    buildTackleAxis('rig', records, 'rig'),
  ].filter((axis): axis is CatchAxis => axis != null)

  return {
    totalCount,
    summary: buildSummary(totalCount, axes),
    axes,
  }
}

const SLOT_KEYS = new Set<string>(TIME_SLOTS)
const TIDE_KEYS = new Set<string>(TIDE_SLOPES)
const PLACE_KEY_RE = /^-?\d+\.\d{4},-?\d+\.\d{4}$/

function validFilterKey(axis: CatchAxisId, key: string): boolean {
  if (!key) return false
  if (axis === 'slot') return SLOT_KEYS.has(key)
  if (axis === 'tide') return TIDE_KEYS.has(key)
  if (axis === 'place') return PLACE_KEY_RE.test(key)
  return true
}

export function parseConditionFilter(params: URLSearchParams): SpeciesConditionFilter | null {
  for (const axis of CATCH_AXIS_IDS) {
    const raw = params.get(axis)
    if (raw == null) continue
    const key = raw.trim()
    if (!validFilterKey(axis, key)) continue
    return { axis, key }
  }
  return null
}

export function conditionFilterQuery(filter: SpeciesConditionFilter): Record<string, string> {
  return { [filter.axis]: filter.key }
}

export function findConditionBucket(
  pattern: SpeciesCatchPattern,
  filter: SpeciesConditionFilter,
): CatchBucket | null {
  const axis = pattern.axes.find((item) => item.id === filter.axis)
  return axis?.buckets.find((bucket) => bucket.key === filter.key) ?? null
}

export function recordsMatchingFilter(
  pattern: SpeciesCatchPattern,
  filter: SpeciesConditionFilter,
): FishingRecord[] {
  return findConditionBucket(pattern, filter)?.records ?? []
}
