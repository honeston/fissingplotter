import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import {
  isBlankRecord,
  normalizeRecordKind,
  type FishingRecord,
  type NewFishingRecord,
} from '../types/record'
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
  pendingDeletes: {
    key: string
    value: { id: string }
  }
  pendingUpserts: {
    key: string
    value: { id: string }
  }
}

const DB_NAME = 'fissingplotter'
const DB_VERSION = 4
const STORE = 'records'
const PHOTO_STORE = 'photoBlobs'
const TACKLE_STORE = 'tackles'
const PENDING_DELETES_STORE = 'pendingDeletes'
const PENDING_UPSERTS_STORE = 'pendingUpserts'

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
        if (oldVersion < 4) {
          db.createObjectStore(PENDING_DELETES_STORE, { keyPath: 'id' })
          db.createObjectStore(PENDING_UPSERTS_STORE, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

function normalizeFishCount(value: number | null | undefined): number | null {
  if (value == null) return null
  if (!Number.isInteger(value) || value < 1) return null
  return value
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
  const normalized = fillSunTimes({
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
    fishCount: normalizeFishCount(record.fishCount),
    fishSizeCm: record.fishSizeCm ?? null,
    fishWeightG: record.fishWeightG ?? null,
    tackle: normalizeTackleFields(record.tackle),
    photoKey: record.photoKey ?? null,
    editedFields: normalizeEditedFields(record.editedFields),
    tripId: record.tripId?.trim() || null,
    kind: normalizeRecordKind(record.kind),
    updatedAt: record.updatedAt ?? null,
  })
  if (!isBlankRecord(normalized)) return normalized
  return {
    ...normalized,
    fishSpecies: null,
    fishCount: null,
    fishSizeCm: null,
    fishWeightG: null,
  }
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
    fishCount: normalizeFishCount(input.fishCount),
    fishSizeCm: input.fishSizeCm ?? null,
    fishWeightG: input.fishWeightG ?? null,
    tackle: normalizeTackleFields(input.tackle),
    photoKey: input.photoKey ?? null,
    editedFields: normalizeEditedFields(input.editedFields),
    tripId: input.tripId?.trim() || null,
    kind: normalizeRecordKind(input.kind),
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

export async function markDirty(id: string): Promise<void> {
  const db = await getDb()
  await db.put(PENDING_UPSERTS_STORE, { id })
}

export async function clearDirty(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(PENDING_UPSERTS_STORE, id)
}

export async function isRecordDirty(record: FishingRecord): Promise<boolean> {
  const db = await getDb()
  const pending = await db.get(PENDING_UPSERTS_STORE, record.id)
  if (pending) return true
  return !record.updatedAt
}

export async function addPendingDelete(id: string): Promise<void> {
  const db = await getDb()
  await db.put(PENDING_DELETES_STORE, { id })
  await db.delete(PENDING_UPSERTS_STORE, id)
}

export async function removePendingDelete(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(PENDING_DELETES_STORE, id)
}

export async function listPendingDeletes(): Promise<string[]> {
  const db = await getDb()
  const rows = await db.getAll(PENDING_DELETES_STORE)
  return rows.map((row) => row.id)
}

export async function savePhotoBlob(recordId: string, blob: Blob): Promise<void> {
  const db = await getDb()
  await db.put(PHOTO_STORE, blob, recordId)
}

export async function getPhotoBlob(recordId: string): Promise<Blob | undefined> {
  const db = await getDb()
  return db.get(PHOTO_STORE, recordId)
}

/** 端末に写真 Blob がある記録 ID */
export async function listPhotoRecordIds(): Promise<string[]> {
  const db = await getDb()
  const keys = await db.getAllKeys(PHOTO_STORE)
  return keys.map(String)
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
    lureOrBaitKind: 'lure' as const,
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

/** 退会時: IndexedDB と端末側のアカウント関連 localStorage をクリア */
export async function clearLocalUserData(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise
      db.close()
    } catch {
      // ignore
    }
    dbPromise = null
  }

  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error ?? new Error('Failed to delete IndexedDB'))
    req.onblocked = () => resolve()
  })

  const keysToRemove = [
    'fp.unitPrefs',
    'fp.keepTackle',
    'fp.tackleDraft',
    'fp.activeTrip',
    'fissingplotter-recent-species',
    'fissingplotter-last-sync',
  ]
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('fissingplotter-migrated-')) {
      keysToRemove.push(key)
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key)
  }
}
