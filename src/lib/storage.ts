import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { FishingRecord, NewFishingRecord } from '../types/record'
import type { MyTackle } from '../types/tackle'
import { normalizeTackleFields } from '../types/tackle'
import { normalizeEditedFields } from './editedFields'
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
  tackles: {
    key: string
    value: MyTackle
    indexes: { 'by-updatedAt': string }
  }
}

const DB_NAME = 'fissingplotter'
const DB_VERSION = 3
const STORE = 'records'
const PHOTO_STORE = 'photoBlobs'
const TACKLE_STORE = 'tackles'

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
        if (oldVersion < 3) {
          const tackles = db.createObjectStore(TACKLE_STORE, { keyPath: 'id' })
          tackles.createIndex('by-updatedAt', 'updatedAt')
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
    fishWeightG: record.fishWeightG ?? null,
    tackle: normalizeTackleFields(record.tackle),
    photoKey: record.photoKey ?? null,
    editedFields: normalizeEditedFields(record.editedFields),
    updatedAt: record.updatedAt ?? null,
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
    fishWeightG: input.fishWeightG ?? null,
    tackle: normalizeTackleFields(input.tackle),
    photoKey: input.photoKey ?? null,
    editedFields: normalizeEditedFields(input.editedFields),
    updatedAt: input.updatedAt ?? null,
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

export async function updateStoredRecord(record: FishingRecord): Promise<FishingRecord> {
  const next = normalizeRecord(record)
  await putRecord(next)
  return next
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

function normalizeMyTackle(tackle: MyTackle): MyTackle {
  const fields = normalizeTackleFields(tackle) ?? {
    name: '',
    rod: '',
    reel: '',
    line: '',
    lureOrBait: '',
    rig: '',
  }
  return {
    id: tackle.id,
    updatedAt: tackle.updatedAt || new Date().toISOString(),
    ...fields,
  }
}

/** 更新日時の新しい順 */
export async function listMyTackles(): Promise<MyTackle[]> {
  const db = await getDb()
  const list = await db.getAllFromIndex(TACKLE_STORE, 'by-updatedAt')
  return list.reverse().map(normalizeMyTackle)
}

export async function getMyTackle(id: string): Promise<MyTackle | undefined> {
  const db = await getDb()
  const tackle = await db.get(TACKLE_STORE, id)
  return tackle ? normalizeMyTackle(tackle) : undefined
}

export async function putMyTackle(tackle: MyTackle): Promise<MyTackle> {
  const next = normalizeMyTackle(tackle)
  const db = await getDb()
  await db.put(TACKLE_STORE, next)
  return next
}

export async function deleteMyTackle(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(TACKLE_STORE, id)
}
