import { catchCountOf } from './fishCount'
import { toDateKey } from './dates'
import {
  isBlankRecord,
  type FishingRecord,
  type RecordKind,
  type TripReuseConditions,
} from '../types/record'

const ACTIVE_TRIP_KEY = 'fp.activeTrip'
const TRIP_STALE_MS = 12 * 60 * 60 * 1000

export type ActiveTrip = {
  tripId: string
  startedAt: string
  catchCount: number
  locationName: string | null
  conditions: TripReuseConditions
}

export type TripGroup = {
  key: string
  tripId: string | null
  kind: RecordKind
  records: FishingRecord[]
  startedAt: string
  endedAt: string
  locationName: string | null
  catchCount: number
  speciesLabels: string[]
}

export function conditionsFromRecord(record: FishingRecord): TripReuseConditions {
  return {
    latitude: record.latitude,
    longitude: record.longitude,
    locationName: record.locationName,
    temperature: record.temperature,
    weatherCode: record.weatherCode,
    windSpeedMs: record.windSpeedMs,
    tideLevel: record.tideLevel,
    tideHarbor: record.tideHarbor,
    tideCycle: record.tideCycle,
    moonPhase: record.moonPhase,
    moonAge: record.moonAge,
    tideSlopeCmPerHour: record.tideSlopeCmPerHour,
  }
}

export function isTripStale(trip: ActiveTrip, now = new Date()): boolean {
  const started = new Date(trip.startedAt)
  if (Number.isNaN(started.getTime())) return true
  if (toDateKey(started) !== toDateKey(now)) return true
  return now.getTime() - started.getTime() > TRIP_STALE_MS
}

function parseActiveTrip(value: unknown): ActiveTrip | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (typeof v.tripId !== 'string' || !v.tripId.trim()) return null
  if (typeof v.startedAt !== 'string' || !v.startedAt) return null
  const catchCount = typeof v.catchCount === 'number' && Number.isFinite(v.catchCount) ? v.catchCount : 0
  const conditions = v.conditions
  if (!conditions || typeof conditions !== 'object') return null
  const c = conditions as Record<string, unknown>
  const optionalNumber = (n: unknown) =>
    typeof n === 'number' && Number.isFinite(n) ? n : null
  const optionalString = (n: unknown) => (typeof n === 'string' ? n : null)
  return {
    tripId: v.tripId.trim(),
    startedAt: v.startedAt,
    catchCount,
    locationName: optionalString(v.locationName),
    conditions: {
      latitude: optionalNumber(c.latitude),
      longitude: optionalNumber(c.longitude),
      locationName: optionalString(c.locationName),
      temperature: optionalNumber(c.temperature),
      weatherCode: optionalNumber(c.weatherCode),
      windSpeedMs: optionalNumber(c.windSpeedMs),
      tideLevel: optionalNumber(c.tideLevel),
      tideHarbor: optionalString(c.tideHarbor),
      tideCycle: optionalString(c.tideCycle),
      moonPhase: optionalString(c.moonPhase),
      moonAge: optionalNumber(c.moonAge),
      tideSlopeCmPerHour: optionalNumber(c.tideSlopeCmPerHour),
    },
  }
}

export function readActiveTrip(now = new Date()): ActiveTrip | null {
  try {
    const raw = localStorage.getItem(ACTIVE_TRIP_KEY)
    if (!raw) return null
    const trip = parseActiveTrip(JSON.parse(raw) as unknown)
    if (!trip || isTripStale(trip, now)) {
      clearActiveTrip()
      return null
    }
    return trip
  } catch {
    return null
  }
}

export function writeActiveTrip(trip: ActiveTrip): void {
  localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(trip))
}

export function clearActiveTrip(): void {
  localStorage.removeItem(ACTIVE_TRIP_KEY)
}

export function createActiveTrip(
  conditions: TripReuseConditions,
  startedAt = new Date(),
): ActiveTrip {
  return {
    tripId: crypto.randomUUID(),
    startedAt: startedAt.toISOString(),
    catchCount: 0,
    locationName: conditions.locationName,
    conditions,
  }
}

export function activeTripFromRecord(
  record: FishingRecord,
  previous: ActiveTrip | null,
): ActiveTrip {
  const added = isBlankRecord(record) ? 0 : catchCountOf(record)
  return {
    tripId: record.tripId || previous?.tripId || record.id,
    startedAt: previous?.startedAt ?? record.recordedAt,
    catchCount: (previous?.catchCount ?? 0) + added,
    locationName: record.locationName ?? previous?.locationName ?? null,
    conditions: previous?.conditions ?? conditionsFromRecord(record),
  }
}

function formatClock(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function tripTimeRangeLabel(group: TripGroup): string {
  const start = formatClock(group.startedAt)
  const end = formatClock(group.endedAt)
  if (!start) return ''
  if (!end || start === end) return start
  return `${start}–${end}`
}

export function tripHeaderLabel(group: TripGroup): string {
  const time = tripTimeRangeLabel(group)
  const place = group.locationName?.trim() || null
  if (group.kind === 'blank') {
    return ['ボウズ', time, place].filter(Boolean).join(' · ')
  }
  const bits = ['釣行', time, place]
  if (group.catchCount > 0) bits.push(`${group.catchCount}匹`)
  if (group.speciesLabels.length > 0) bits.push(group.speciesLabels.join('、'))
  return bits.filter(Boolean).join(' · ')
}

/** 同じ日の記録を釣行ごとにまとめる。tripId なしは 1 件ずつ。新しい順を維持 */
export function groupRecordsByTrip(records: FishingRecord[]): TripGroup[] {
  const lists = new Map<string, FishingRecord[]>()
  const order: string[] = []

  for (const record of records) {
    const tripId = record.tripId?.trim() || ''
    const key = tripId ? `trip:${tripId}` : `solo:${record.id}`
    const list = lists.get(key)
    if (list) {
      list.push(record)
    } else {
      lists.set(key, [record])
      order.push(key)
    }
  }

  return order.map((key) => {
    const groupRecords = lists.get(key) ?? []
    const times = groupRecords.map((record) => new Date(record.recordedAt).getTime())
    const newest = Math.max(...times)
    const oldest = Math.min(...times)
    const species: string[] = []
    const seenSpecies = new Set<string>()
    let catchCount = 0
    let locationName: string | null = null
    for (const record of groupRecords) {
      if (!isBlankRecord(record)) catchCount += catchCountOf(record)
      const name = record.fishSpecies?.trim()
      if (name && !seenSpecies.has(name)) {
        seenSpecies.add(name)
        species.push(name)
      }
      if (!locationName && record.locationName?.trim()) {
        locationName = record.locationName.trim()
      }
    }
    const kind: RecordKind =
      groupRecords.every((record) => isBlankRecord(record)) && groupRecords.length > 0
        ? 'blank'
        : 'catch'
    return {
      key,
      tripId: groupRecords[0]?.tripId?.trim() || null,
      kind,
      records: groupRecords,
      startedAt: new Date(oldest).toISOString(),
      endedAt: new Date(newest).toISOString(),
      locationName,
      catchCount,
      speciesLabels: species,
    }
  })
}

export function tripShowsHeader(group: TripGroup): boolean {
  return group.records.length > 1
}

export { ACTIVE_TRIP_KEY }
