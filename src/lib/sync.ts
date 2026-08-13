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

async function uploadPhotoForRecord(
  record: FishingRecord,
  photoBlob: Blob,
): Promise<FishingRecord> {
  const { uploadUrl, photoKey } = await api.presignPhotoUpload(record.id)
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: photoBlob,
    headers: { 'Content-Type': 'image/jpeg' },
  })
  if (!res.ok) {
    throw new Error(`写真のアップロードに失敗しました (${res.status})`)
  }
  const updated = { ...record, photoKey }
  await local.putRecord(updated)
  return updated
}

/** 未アップロードの写真を S3 へ同期 */
export async function uploadPendingPhotos(): Promise<number> {
  if (!isCloudSyncEnabled() || !isOnline()) return 0

  const records = await local.getAllRecords()
  let uploaded = 0

  for (const record of records) {
    if (record.photoKey) continue
    const blob = await local.getPhotoBlob(record.id)
    if (!blob) continue

    try {
      const updated = await uploadPhotoForRecord(record, blob)
      await api.postRecord(updated)
      uploaded += 1
    } catch {
      // 次回再試行
    }
  }

  return uploaded
}

/** 初回ログイン時: ローカル IndexedDB の記録をサーバーへ一括アップロード */
export async function migrateLocalRecordsToServer(userId: string): Promise<number> {
  if (!isCloudSyncEnabled() || !isOnline()) return 0
  if (localStorage.getItem(migrationKey(userId))) return 0

  await uploadPendingPhotos()

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
  await uploadPendingPhotos()
  await syncFromServer()
  return { migrated }
}

export async function addRecord(
  input: NewFishingRecord,
  photoBlob?: Blob | null,
): Promise<FishingRecord> {
  let record = await local.addRecord(input)

  if (photoBlob) {
    await local.savePhotoBlob(record.id, photoBlob)
  }

  if (isCloudSyncEnabled() && isOnline()) {
    if (photoBlob) {
      try {
        record = await uploadPhotoForRecord(record, photoBlob)
      } catch {
        // ローカル保存済み。uploadPendingPhotos で後から再試行
      }
    }
    try {
      await api.postRecord(record)
    } catch {
      // オフライン/一時障害時はローカル保存のみ
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
      // ローカル削除は完了
    }
  }
}

export { exportRecordsJson } from './storage'
