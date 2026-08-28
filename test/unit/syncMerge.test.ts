import { describe, expect, it } from 'vitest'
import { mergeSyncState } from '../../src/lib/syncMerge'
import { sampleRecord } from './recordFixture'

const id = 'rec-1'
const localRecord = sampleRecord({
  id,
  recordedAt: '2026-08-01T00:00:00.000Z',
  fishSpecies: 'アジ',
})
const remoteRecord = sampleRecord({
  id,
  recordedAt: '2026-08-01T00:00:00.000Z',
  fishSpecies: 'サバ',
  updatedAt: '2026-08-02T00:00:00.000Z',
})

describe('UNIT-13 同期マージ', () => {
  it('UNIT-13a クラウド deleted の id は端末から消し POST しない', () => {
    const result = mergeSyncState({
      local: [{ record: localRecord, dirty: true }],
      pendingDeletes: [],
      remoteRecords: [],
      remoteDeleted: [{ id, deletedAt: '2026-08-03T00:00:00.000Z' }],
    })
    expect(result.records.find((r) => r.id === id)).toBeUndefined()
    expect(result.postIds).toEqual([])
    expect(result.deleteIds).toEqual([])
  })

  it('UNIT-13b クラウドに無い端末の件は残す。未送信なら POST', () => {
    const result = mergeSyncState({
      local: [{ record: localRecord, dirty: true }],
      pendingDeletes: [],
      remoteRecords: [],
      remoteDeleted: [],
    })
    expect(result.records.map((r) => r.id)).toEqual([id])
    expect(result.postIds).toEqual([id])
  })

  it('UNIT-13c クラウドにだけある id は端末へ追加。POST しない', () => {
    const result = mergeSyncState({
      local: [],
      pendingDeletes: [],
      remoteRecords: [remoteRecord],
      remoteDeleted: [],
    })
    expect(result.records.map((r) => r.id)).toEqual([id])
    expect(result.records[0].fishSpecies).toBe('サバ')
    expect(result.postIds).toEqual([])
  })

  it('UNIT-13d 両方にあり端末が未送信なら端末を残して POST', () => {
    const result = mergeSyncState({
      local: [{ record: localRecord, dirty: true }],
      pendingDeletes: [],
      remoteRecords: [remoteRecord],
      remoteDeleted: [],
    })
    expect(result.records[0].fishSpecies).toBe('アジ')
    expect(result.postIds).toEqual([id])
  })

  it('UNIT-13e 両方にあり端末が送信済みならクラウドで更新。POST しない', () => {
    const result = mergeSyncState({
      local: [{ record: localRecord, dirty: false }],
      pendingDeletes: [],
      remoteRecords: [remoteRecord],
      remoteDeleted: [],
    })
    expect(result.records[0].fishSpecies).toBe('サバ')
    expect(result.postIds).toEqual([])
  })

  it('UNIT-13f 端末の削除ログは DELETE 対象。POST しない', () => {
    const result = mergeSyncState({
      local: [],
      pendingDeletes: [id],
      remoteRecords: [remoteRecord],
      remoteDeleted: [],
    })
    expect(result.records.find((r) => r.id === id)).toBeUndefined()
    expect(result.postIds).toEqual([])
    expect(result.deleteIds).toEqual([id])
  })

  it('UNIT-13g 両方未送信相当で値が違っても updatedAt では選ばず端末を残して POST', () => {
    const result = mergeSyncState({
      local: [{ record: localRecord, dirty: true }],
      pendingDeletes: [],
      remoteRecords: [remoteRecord],
      remoteDeleted: [],
    })
    expect(result.records[0]).toEqual(localRecord)
    expect(result.postIds).toEqual([id])
  })

  it('UNIT-13h 未送信編集と端末削除ログが同時なら削除が勝つ', () => {
    const result = mergeSyncState({
      local: [{ record: localRecord, dirty: true }],
      pendingDeletes: [id],
      remoteRecords: [remoteRecord],
      remoteDeleted: [],
    })
    expect(result.records.find((r) => r.id === id)).toBeUndefined()
    expect(result.postIds).toEqual([])
    expect(result.deleteIds).toEqual([id])
  })
})
