import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { FishingRecord, NewFishingRecord } from '../types/record'
import { getSunTimes } from './sun'

interface FissingDB extends DBSchema {
  records: {
    key: string
    value: FishingRecord
    indexes: { 'by-recordedAt': string }
  }
  photoBlobs: {
    key: string
    value: Blob
  }
}

const DB_NAME = 'fissingplotter'
const DB_VERSION = 2
const STORE = 'records'
const PHOTO_STORE = 'photoBlobs'

let dbPromise: Promise<IDBPDatabase<FissingDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<FissingDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' })
          store.createIndex('by-recordedAt', 'recordedAt')
        }
        if (oldVersion < 2) {
          db.createObjectStore(PHOTO_STORE)
        }
      },
    })
  }
  return dbPromise
}

function fillSunTimes(record: FishingRecord): FishingRecord {
  if (
    record.sunriseAt &&
    record.sunsetAt &&
    record.dawnAt &&
    record.duskAt
  ) {
    return record
  }
  if (record.latitude == null || record.longitude == null) return record
  const sun = getSunTimes(new Date(record.recordedAt), record.latitude, record.longitude)
  if (!sun) return record
  return {
    ...record,
    dawnAt: record.dawnAt ?? sun.dawnAt,
    sunriseAt: record.sunriseAt ?? sun.sunriseAt,
    sunsetAt: record.sunsetAt ?? sun.sunsetAt,
    duskAt: record.duskAt ?? sun.duskAt,
  }
}

function normalizeRecord(record: FishingRecord): FishingRecord {
  const latitude = record.latitude ?? null
  const longitude = record.longitude ?? null
  return fillSunTimes({
    ...record,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    locationName: record.locationName ?? null,
    weatherCode: record.weatherCode ?? null,
    windSpeedMs: record.windSpeedMs ?? null,
    dawnAt: record.dawnAt ?? null,
    sunriseAt: record.sunriseAt ?? null,
    sunsetAt: record.sunsetAt ?? null,
    duskAt: record.duskAt ?? null,
    tideCycle: record.tideCycle ?? null,
    moonPhase: record.moonPhase ?? null,
    moonAge: record.moonAge ?? null,
    tideSlopeCmPerHour: record.tideSlopeCmPerHour ?? null,
    fishSizeCm: record.fishSizeCm ?? null,
    photoKey: record.photoKey ?? null,
  })
}

function buildRecord(input: NewFishingRecord): FishingRecord {
  return {
    id: input.id ?? crypto.randomUUID(),
    recordedAt: input.recordedAt ?? new Date().toISOString(),
    latitude: input.latitude,
    longitude: input.longitude,
    locationName: input.locationName ?? null,
    temperature: input.temperature,
    weatherCode: input.weatherCode ?? null,
    windSpeedMs: input.windSpeedMs ?? null,
    dawnAt: input.dawnAt ?? null,
    sunriseAt: input.sunriseAt ?? null,
    sunsetAt: input.sunsetAt ?? null,
    duskAt: input.duskAt ?? null,
    tideLevel: input.tideLevel,
    tideHarbor: input.tideHarbor,
    tideCycle: input.tideCycle ?? null,
    moonPhase: input.moonPhase ?? null,
    moonAge: input.moonAge ?? null,
    tideSlopeCmPerHour: input.tideSlopeCmPerHour ?? null,
    fishSpecies: input.fishSpecies,
    fishSizeCm: input.fishSizeCm ?? null,
    photoKey: input.photoKey ?? null,
  }
}

/** 同期用: サーバーから取得した記録をそのまま保存 */
export async function putRecord(record: FishingRecord): Promise<void> {
  const db = await getDb()
  await db.put(STORE, normalizeRecord(record))
}

export async function addRecord(input: NewFishingRecord): Promise<FishingRecord> {
  const record = buildRecord(input)
  await putRecord(record)
  return record
}

/** 新しい順で全件取得。日出没が無い記録は座標から補完して保存する。 */
export async function getAllRecords(): Promise<FishingRecord[]> {
  const db = await getDb()
  const records = await db.getAllFromIndex(STORE, 'by-recordedAt')
  const normalized = records.reverse().map(normalizeRecord)

  await Promise.all(
    normalized.map(async (record, index) => {
      const raw = records[records.length - 1 - index]
      if (
        record.sunriseAt !== (raw.sunriseAt ?? null) ||
        record.sunsetAt !== (raw.sunsetAt ?? null) ||
        record.dawnAt !== (raw.dawnAt ?? null) ||
        record.duskAt !== (raw.duskAt ?? null)
      ) {
        await db.put(STORE, record)
      }
    }),
  )

  return normalized
}

export async function getRecord(id: string): Promise<FishingRecord | undefined> {
  const db = await getDb()
  const record = await db.get(STORE, id)
  return record ? normalizeRecord(record) : undefined
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, id)
  await db.delete(PHOTO_STORE, id)
}

export async function savePhotoBlob(recordId: string, blob: Blob): Promise<void> {
  const db = await getDb()
  await db.put(PHOTO_STORE, blob, recordId)
}

export async function getPhotoBlob(recordId: string): Promise<Blob | undefined> {
  const db = await getDb()
  return db.get(PHOTO_STORE, recordId)
}

export async function deletePhotoBlob(recordId: string): Promise<void> {
  const db = await getDb()
  await db.delete(PHOTO_STORE, recordId)
}
