import type { FishingRecord, NewFishingRecord } from '../types/record'
import * as api from './api'
import { isCloudSyncEnabled } from './config'
import * as local from './storage'
import { mergeSyncState } from './syncMerge'

const LAST_SYNC_KEY = 'fissingplotter-last-sync'

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

let syncLock: Promise<unknown> = Promise.resolve()

function withSyncLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = syncLock.then(fn, fn)
  syncLock = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

async function dropLocalRecord(id: string): Promise<void> {
  await local.deleteRecord(id)
  await local.clearDirty(id)
}

async function dropIfDeleted(id: string, err: unknown): Promise<boolean> {
  if (!(err instanceof api.RecordDeletedApiError)) return false
  await dropLocalRecord(id)
  await local.removePendingDelete(id)
  return true
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

async function postOrDrop(record: FishingRecord): Promise<FishingRecord | null> {
  try {
    const saved = await api.postRecord(record)
    await local.putRecord(saved)
    await local.clearDirty(saved.id)
    return saved
  } catch (err) {
    if (await dropIfDeleted(record.id, err)) return null
    throw err
  }
}

/** 未アップロードの写真を S3 へ同期 */
export async function uploadPendingPhotos(): Promise<number> {
  if (!isCloudSyncEnabled() || !isOnline()) return 0

  const pendingDeletes = new Set(await local.listPendingDeletes())
  const records = await local.getAllRecords()
  let uploaded = 0

  for (const record of records) {
    if (pendingDeletes.has(record.id)) continue
    if (record.photoKey) continue
    const blob = await local.getPhotoBlob(record.id)
    if (!blob) continue

    try {
      const updated = await uploadPhotoForRecord(record, blob)
      const saved = await postOrDrop(updated)
      if (saved) uploaded += 1
    } catch {
      // 次回再試行
    }
  }

  return uploaded
}

async function flushPendingDeletes(): Promise<void> {
  const ids = await local.listPendingDeletes()
  for (const id of ids) {
    try {
      await api.deleteRemoteRecord(id)
      await local.removePendingDelete(id)
    } catch {
      // 次回再試行
    }
  }
}

async function syncWithServerUnlocked(): Promise<number> {
  if (!isCloudSyncEnabled() || !isOnline()) return 0

  await flushPendingDeletes()

  const since = localStorage.getItem(LAST_SYNC_KEY) ?? undefined
  const remote = await api.fetchRecords(since)
  const localRecords = await local.getAllRecords()
  const pendingDeletes = await local.listPendingDeletes()
  const localState = await Promise.all(
    localRecords.map(async (record) => ({
      record,
      dirty: await local.isRecordDirty(record),
    })),
  )

  const merged = mergeSyncState({
    local: localState,
    pendingDeletes,
    remoteRecords: remote.records,
    remoteDeleted: remote.deleted,
  })

  const keepIds = new Set(merged.records.map((r) => r.id))
  for (const record of localRecords) {
    if (!keepIds.has(record.id)) {
      await dropLocalRecord(record.id)
    }
  }
  for (const id of remote.deleted.map((d) => d.id)) {
    await local.removePendingDelete(id)
  }

  const postIdSet = new Set(merged.postIds)
  for (const record of merged.records) {
    await local.putRecord(record)
    if (!postIdSet.has(record.id)) {
      await local.clearDirty(record.id)
    }
  }

  let posted = 0
  const byId = new Map(merged.records.map((r) => [r.id, r]))
  for (const id of merged.postIds) {
    const record = byId.get(id)
    if (!record) continue
    try {
      const saved = await postOrDrop(record)
      if (saved) posted += 1
    } catch {
      // 未送信のまま残す
    }
  }

  for (const id of merged.deleteIds) {
    try {
      await api.deleteRemoteRecord(id)
      await local.removePendingDelete(id)
    } catch {
      // 次回再試行
    }
  }

  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
  await uploadPendingPhotos()
  return posted
}

/** ログイン直後・履歴・オンライン復帰。削除ログを適用してから未送信を送る。 */
export async function syncWithServer(): Promise<number> {
  return withSyncLock(syncWithServerUnlocked)
}

/** @deprecated syncWithServer と同じ */
export async function syncFromServer(): Promise<void> {
  await syncWithServer()
}

/** ログイン後の初期同期 */
export async function initialSync(): Promise<{ migrated: number }> {
  const migrated = await syncWithServer()
  return { migrated }
}

async function persistRecord(
  record: FishingRecord,
  photoBlob?: Blob | null,
): Promise<FishingRecord> {
  let next = record
  if (isCloudSyncEnabled()) {
    await local.markDirty(next.id)
  }

  if (photoBlob) {
    await local.savePhotoBlob(next.id, photoBlob)
  }

  if (isCloudSyncEnabled() && isOnline()) {
    if (photoBlob) {
      try {
        next = await uploadPhotoForRecord(next, photoBlob)
      } catch {
        // ローカル保存済み。uploadPendingPhotos で後から再試行
      }
    }
    try {
      const saved = await postOrDrop(next)
      if (!saved) {
        throw new api.RecordDeletedApiError()
      }
      return saved
    } catch (err) {
      if (err instanceof api.RecordDeletedApiError) throw err
      // オフライン/一時障害時はローカル保存のみ
    }
  }

  return next
}

export async function addRecord(
  input: NewFishingRecord,
  photoBlob?: Blob | null,
): Promise<FishingRecord> {
  const record = await local.addRecord(input)
  return persistRecord(record, photoBlob)
}

export async function updateRecord(
  record: FishingRecord,
  photoBlob?: Blob | null,
): Promise<FishingRecord> {
  const saved = await local.updateStoredRecord(record)
  return persistRecord(saved, photoBlob)
}

export async function getAllRecords(): Promise<FishingRecord[]> {
  return local.getAllRecords()
}

export async function deleteRecord(id: string): Promise<void> {
  await local.deleteRecord(id)
  await local.clearDirty(id)

  if (!isCloudSyncEnabled()) return

  await local.addPendingDelete(id)

  if (isOnline()) {
    try {
      await api.deleteRemoteRecord(id)
      await local.removePendingDelete(id)
    } catch {
      // 端末の削除ログに残し、次回同期で送る
    }
  }
}
