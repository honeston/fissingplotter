import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { FishingRecord, NewFishingRecord } from '../types/record'

interface FissingDB extends DBSchema {
  records: {
    key: string
    value: FishingRecord
    indexes: { 'by-recordedAt': string }
  }
}

const DB_NAME = 'fissingplotter'
const DB_VERSION = 1
const STORE = 'records'

let dbPromise: Promise<IDBPDatabase<FissingDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<FissingDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('by-recordedAt', 'recordedAt')
      },
    })
  }
  return dbPromise
}

function buildRecord(input: NewFishingRecord): FishingRecord {
  return {
    id: input.id ?? crypto.randomUUID(),
    recordedAt: input.recordedAt ?? new Date().toISOString(),
    latitude: input.latitude,
    longitude: input.longitude,
    temperature: input.temperature,
    tideLevel: input.tideLevel,
    tideHarbor: input.tideHarbor,
    fishSpecies: input.fishSpecies,
  }
}

/** 同期用: サーバーから取得した記録をそのまま保存 */
export async function putRecord(record: FishingRecord): Promise<void> {
  const db = await getDb()
  await db.put(STORE, record)
}

export async function addRecord(input: NewFishingRecord): Promise<FishingRecord> {
  const record = buildRecord(input)
  await putRecord(record)
  return record
}

/** 新しい順で全件取得 */
export async function getAllRecords(): Promise<FishingRecord[]> {
  const db = await getDb()
  const records = await db.getAllFromIndex(STORE, 'by-recordedAt')
  return records.reverse()
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, id)
}

/** バックアップ用 JSON 文字列 */
export async function exportRecordsJson(): Promise<string> {
  const records = await getAllRecords()
  return JSON.stringify(records, null, 2)
}
