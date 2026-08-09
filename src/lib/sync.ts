import type { FishingRecord, NewFishingRecord } from '../types/record'
import * as api from './api'
import { isCloudSyncEnabled } from './config'
import * as local from './storage'

const MIGRATION_KEY_PREFIX = 'fissingplotter-migrated-'
const LAST_SYNC_KEY = 'fissingplotter-last-sync'

function migrationKey(userId: string): string {
  return `${MIGRATION_KEY_PREFIX}${userId}`
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

/** 初回ログイン時: ローカル IndexedDB の記録をサーバーへ一括アップロード */
export async function migrateLocalRecordsToServer(userId: string): Promise<number> {
  if (!isCloudSyncEnabled() || !isOnline()) return 0
  if (localStorage.getItem(migrationKey(userId))) return 0

  const records = await local.getAllRecords()
  for (const record of records) {
    await api.postRecord(record)
  }

  localStorage.setItem(migrationKey(userId), new Date().toISOString())
  return records.length
}

/** サーバーから差分取得して IndexedDB にマージ */
export async function syncFromServer(): Promise<void> {
  if (!isCloudSyncEnabled() || !isOnline()) return

  const since = localStorage.getItem(LAST_SYNC_KEY) ?? undefined
  const remote = await api.fetchRecords(since)

  for (const record of remote) {
    await local.putRecord(record)
  }

  if (remote.length > 0) {
    const latest = remote.reduce((a, b) => (a.recordedAt > b.recordedAt ? a : b))
    localStorage.setItem(LAST_SYNC_KEY, latest.recordedAt)
  } else if (!since) {
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
  }
}

/** ログイン後の初期同期（移行 + サーバーから取得） */
export async function initialSync(userId: string): Promise<{ migrated: number }> {
  const migrated = await migrateLocalRecordsToServer(userId)
  await syncFromServer()
  return { migrated }
}

export async function addRecord(input: NewFishingRecord): Promise<FishingRecord> {
  const record = await local.addRecord(input)

  if (isCloudSyncEnabled() && isOnline()) {
    try {
      await api.postRecord(record)
    } catch {
      // オフライン/一時障害時はローカル保存のみ（後で syncFromServer と手動再同期）
    }
  }

  return record
}

export async function getAllRecords(): Promise<FishingRecord[]> {
  return local.getAllRecords()
}

export async function deleteRecord(id: string): Promise<void> {
  await local.deleteRecord(id)

  if (isCloudSyncEnabled() && isOnline()) {
    try {
      await api.deleteRemoteRecord(id)
    } catch {
      // ローカル削除は完了。サーバー側は次回同期で不整合の可能性あり（釣りログ用途では許容）
    }
  }
}

export { exportRecordsJson } from './storage'
