import type { FishingRecord } from '../types/record'

export type RecordDeletion = {
  id: string
  deletedAt: string
}

export type LocalSyncRecord = {
  record: FishingRecord
  dirty: boolean
}

export type SyncMergeInput = {
  local: LocalSyncRecord[]
  pendingDeletes: string[]
  remoteRecords: FishingRecord[]
  remoteDeleted: RecordDeletion[]
}

export type SyncMergeResult = {
  records: FishingRecord[]
  postIds: string[]
  deleteIds: string[]
}

/** 同期マージ。GET に無いことは消さない。削除は削除ログと端末の未送信削除だけ。 */
export function mergeSyncState(input: SyncMergeInput): SyncMergeResult {
  const remoteDeletedIds = new Set(input.remoteDeleted.map((d) => d.id))
  const pendingDeleteIds = new Set(input.pendingDeletes)
  const dropIds = new Set<string>([...remoteDeletedIds, ...pendingDeleteIds])

  const remoteById = new Map(input.remoteRecords.map((r) => [r.id, r]))
  const records: FishingRecord[] = []
  const postIds: string[] = []
  const seen = new Set<string>()

  for (const item of input.local) {
    const id = item.record.id
    seen.add(id)
    if (dropIds.has(id)) continue

    const remote = remoteById.get(id)
    if (remote) {
      if (item.dirty) {
        records.push(item.record)
        postIds.push(id)
      } else {
        records.push(remote)
      }
    } else {
      records.push(item.record)
      if (item.dirty) postIds.push(id)
    }
  }

  for (const remote of input.remoteRecords) {
    if (seen.has(remote.id) || dropIds.has(remote.id)) continue
    records.push(remote)
  }

  const deleteIds = input.pendingDeletes.filter((id) => !remoteDeletedIds.has(id))

  return { records, postIds, deleteIds }
}
