import { HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { describe, expect, it } from 'vitest'
import { createS3Client } from '../src/awsClients.js'
import {
  countItemsById,
  deleteRecord,
  getRecords,
  invoke,
  jsonOf,
  newUserId,
  postRecord,
  requiredRecord,
  statusOf,
  waitUntilIndexed,
  type ListPayload,
} from './http.js'

const MEDIA_BUCKET = process.env.MEDIA_BUCKET_NAME ?? 'fissingplotter-media-local'
const s3 = createS3Client()

describe('INT-03 記録一覧', () => {
  it('INT-03a ユーザー A が 2 件 POST したあと GET: 2 件・新しい順・deleted は []', async () => {
    const userA = newUserId('03a')
    const older = requiredRecord({
      id: crypto.randomUUID(),
      recordedAt: '2026-08-01T00:00:00.000Z',
    })
    const newer = requiredRecord({
      id: crypto.randomUUID(),
      recordedAt: '2026-08-02T00:00:00.000Z',
    })

    expect(statusOf(await postRecord(userA, older))).toBe(201)
    expect(statusOf(await postRecord(userA, newer))).toBe(201)

    const res = await getRecords(userA)
    expect(statusOf(res)).toBe(200)
    const body = jsonOf<ListPayload>(res)
    expect(body.deleted).toEqual([])
    expect(body.records.map((r) => r.id)).toEqual([newer.id, older.id])
  })

  it('INT-03b ユーザー B で GET: A の件も削除ログも含まれない', async () => {
    const userA = newUserId('03b-a')
    const userB = newUserId('03b-b')
    const keep = requiredRecord({
      id: crypto.randomUUID(),
      recordedAt: '2026-08-03T00:00:00.000Z',
    })
    const removed = requiredRecord({
      id: crypto.randomUUID(),
      recordedAt: '2026-08-04T00:00:00.000Z',
    })

    expect(statusOf(await postRecord(userA, keep))).toBe(201)
    expect(statusOf(await postRecord(userA, removed))).toBe(201)
    await waitUntilIndexed(userA, removed.id)
    expect(statusOf(await deleteRecord(userA, removed.id))).toBe(204)

    const res = await getRecords(userB)
    expect(statusOf(res)).toBe(200)
    const body = jsonOf<ListPayload>(res)
    expect(body.records).toEqual([])
    expect(body.deleted).toEqual([])
  })

  it('INT-03c ?since= を最新より後: records 0 件・deleted 0 件', async () => {
    const user = newUserId('03c')
    expect(
      statusOf(
        await postRecord(
          user,
          requiredRecord({ id: crypto.randomUUID(), recordedAt: '2026-08-05T00:00:00.000Z' }),
        ),
      ),
    ).toBe(201)

    const res = await getRecords(user, '2099-01-01T00:00:00.000Z')
    expect(statusOf(res)).toBe(200)
    const body = jsonOf<ListPayload>(res)
    expect(body.records).toEqual([])
    expect(body.deleted).toEqual([])
  })

  it('INT-03d ?since= を古い時刻: 新しい方だけ', async () => {
    const user = newUserId('03d')
    const first = requiredRecord({
      id: crypto.randomUUID(),
      recordedAt: '2026-08-06T00:00:00.000Z',
    })
    const second = requiredRecord({
      id: crypto.randomUUID(),
      recordedAt: '2026-08-07T00:00:00.000Z',
    })

    const firstRes = await postRecord(user, first)
    expect(statusOf(firstRes)).toBe(201)
    const firstUpdatedAt = jsonOf<{ record: { updatedAt: string } }>(firstRes).record.updatedAt
    await new Promise((r) => setTimeout(r, 20))
    expect(statusOf(await postRecord(user, second))).toBe(201)

    const res = await getRecords(user, firstUpdatedAt)
    expect(statusOf(res)).toBe(200)
    const body = jsonOf<ListPayload>(res)
    expect(body.records.map((r) => r.id)).toEqual([second.id])
    expect(body.deleted).toEqual([])
  })

  it('INT-03e DELETE したあと GET: 生存件に無い・deleted に id と deletedAt', async () => {
    const user = newUserId('03e')
    const record = requiredRecord({
      id: crypto.randomUUID(),
      recordedAt: '2026-08-08T00:00:00.000Z',
    })
    expect(statusOf(await postRecord(user, record))).toBe(201)
    await waitUntilIndexed(user, record.id)
    expect(statusOf(await deleteRecord(user, record.id))).toBe(204)

    const res = await getRecords(user)
    expect(statusOf(res)).toBe(200)
    const body = jsonOf<ListPayload>(res)
    expect(body.records.find((r) => r.id === record.id)).toBeUndefined()
    expect(body.deleted).toHaveLength(1)
    expect(body.deleted[0].id).toBe(record.id)
    expect(body.deleted[0].deletedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

describe('INT-04 記録作成更新', () => {
  it('INT-04a 必須だけの POST: 201・updatedAt あり・POST した updatedAt は使わない', async () => {
    const user = newUserId('04a')
    const clientUpdatedAt = '2000-01-01T00:00:00.000Z'
    const res = await postRecord(
      user,
      requiredRecord({
        id: crypto.randomUUID(),
        recordedAt: '2026-08-09T00:00:00.000Z',
        updatedAt: clientUpdatedAt,
      }),
    )
    expect(statusOf(res)).toBe(201)
    const body = jsonOf<{ record: { updatedAt: string } }>(res)
    expect(body.record.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(body.record.updatedAt).not.toBe(clientUpdatedAt)
  })

  it('INT-04b 同じ id で魚種を変えて POST: 201・GET は 1 件・魚種は後者', async () => {
    const user = newUserId('04b')
    const id = crypto.randomUUID()
    const recordedAt = '2026-08-10T00:00:00.000Z'
    expect(
      statusOf(await postRecord(user, requiredRecord({ id, recordedAt, fishSpecies: 'アジ' }))),
    ).toBe(201)
    await waitUntilIndexed(user, id)
    expect(
      statusOf(await postRecord(user, requiredRecord({ id, recordedAt, fishSpecies: 'サバ' }))),
    ).toBe(201)

    const res = await getRecords(user)
    expect(statusOf(res)).toBe(200)
    const body = jsonOf<ListPayload>(res)
    expect(body.records).toHaveLength(1)
    expect(body.records[0].id).toBe(id)
    expect(body.records[0].fishSpecies).toBe('サバ')
  })

  it('INT-04c 本文なし: 400 Missing body', async () => {
    const res = await invoke({ method: 'POST', path: '/records', sub: newUserId('04c') })
    expect(statusOf(res)).toBe(400)
    expect(jsonOf<{ error: string }>(res).error).toBe('Missing body')
  })

  it('INT-04d id なし: 400 Invalid id', async () => {
    const res = await postRecord(newUserId('04d'), {
      recordedAt: '2026-08-11T00:00:00.000Z',
    } as never)
    expect(statusOf(res)).toBe(400)
    expect(jsonOf<{ error: string }>(res).error).toBe('Invalid id')
  })

  it('INT-04e 緯度だけ: 400 Invalid coordinates', async () => {
    const res = await postRecord(
      newUserId('04e'),
      requiredRecord({
        id: crypto.randomUUID(),
        recordedAt: '2026-08-12T00:00:00.000Z',
        latitude: 35.45,
      }),
    )
    expect(statusOf(res)).toBe(400)
    expect(jsonOf<{ error: string }>(res).error).toBe('Invalid coordinates')
  })

  it('INT-04f recordedAt を変えて POST: 一覧は新時刻・旧ソートキーの幽霊行がない', async () => {
    const user = newUserId('04f')
    const id = crypto.randomUUID()
    expect(
      statusOf(
        await postRecord(
          user,
          requiredRecord({ id, recordedAt: '2026-08-01T00:00:00.000Z' }),
        ),
      ),
    ).toBe(201)
    await waitUntilIndexed(user, id)
    expect(
      statusOf(
        await postRecord(
          user,
          requiredRecord({ id, recordedAt: '2026-08-20T00:00:00.000Z' }),
        ),
      ),
    ).toBe(201)

    const res = await getRecords(user)
    expect(statusOf(res)).toBe(200)
    const body = jsonOf<ListPayload>(res)
    expect(body.records).toHaveLength(1)
    expect(body.records[0].id).toBe(id)
    expect(body.records[0].recordedAt).toBe('2026-08-20T00:00:00.000Z')
    expect(await countItemsById(user, id)).toBe(1)
  })

  it('INT-04g DELETE した id を POST: 409 Record deleted・GET の生存件に戻らない', async () => {
    const user = newUserId('04g')
    const record = requiredRecord({
      id: crypto.randomUUID(),
      recordedAt: '2026-08-13T00:00:00.000Z',
    })
    expect(statusOf(await postRecord(user, record))).toBe(201)
    await waitUntilIndexed(user, record.id)
    expect(statusOf(await deleteRecord(user, record.id))).toBe(204)

    const res = await postRecord(user, record)
    expect(statusOf(res)).toBe(409)
    expect(jsonOf<{ error: string }>(res).error).toBe('Record deleted')

    const listed = jsonOf<ListPayload>(await getRecords(user))
    expect(listed.records.find((r) => r.id === record.id)).toBeUndefined()
    expect(listed.deleted.some((d) => d.id === record.id)).toBe(true)
  })
})

describe('INT-05 記録削除', () => {
  it('INT-05a 自分の id を DELETE: 204・生存件に出ない・deleted に出る', async () => {
    const user = newUserId('05a')
    const record = requiredRecord({
      id: crypto.randomUUID(),
      recordedAt: '2026-08-14T00:00:00.000Z',
    })
    expect(statusOf(await postRecord(user, record))).toBe(201)
    await waitUntilIndexed(user, record.id)
    expect(statusOf(await deleteRecord(user, record.id))).toBe(204)

    const body = jsonOf<ListPayload>(await getRecords(user))
    expect(body.records.find((r) => r.id === record.id)).toBeUndefined()
    expect(body.deleted.some((d) => d.id === record.id)).toBe(true)
  })

  it('INT-05b 無い id: 204・deleted にその id がある', async () => {
    const user = newUserId('05b')
    const missingId = crypto.randomUUID()
    expect(statusOf(await deleteRecord(user, missingId))).toBe(204)

    const body = jsonOf<ListPayload>(await getRecords(user))
    expect(body.records).toEqual([])
    expect(body.deleted.map((d) => d.id)).toEqual([missingId])
  })

  it('INT-05c B のトークンで A の id を DELETE: A の件は残る・A の削除ログにも載らない', async () => {
    const userA = newUserId('05c-a')
    const userB = newUserId('05c-b')
    const record = requiredRecord({
      id: crypto.randomUUID(),
      recordedAt: '2026-08-15T00:00:00.000Z',
    })
    expect(statusOf(await postRecord(userA, record))).toBe(201)
    await waitUntilIndexed(userA, record.id)
    expect(statusOf(await deleteRecord(userB, record.id))).toBe(204)

    const a = jsonOf<ListPayload>(await getRecords(userA))
    expect(a.records.map((r) => r.id)).toEqual([record.id])
    expect(a.deleted).toEqual([])

    const b = jsonOf<ListPayload>(await getRecords(userB))
    expect(b.records).toEqual([])
    expect(b.deleted.map((d) => d.id)).toEqual([record.id])
  })

  it('INT-05d photoKey 付きを DELETE: 記録なし・S3 オブジェクトなし・deleted に id', async () => {
    const user = newUserId('05d')
    const id = crypto.randomUUID()
    const photoKey = `${user}/${id}.jpg`
    const record = requiredRecord({
      id,
      recordedAt: '2026-08-16T00:00:00.000Z',
      photoKey,
    })
    expect(statusOf(await postRecord(user, record))).toBe(201)
    await s3.send(
      new PutObjectCommand({
        Bucket: MEDIA_BUCKET,
        Key: photoKey,
        Body: Buffer.from('fake-jpeg'),
        ContentType: 'image/jpeg',
      }),
    )
    await waitUntilIndexed(user, id)
    expect(statusOf(await deleteRecord(user, id))).toBe(204)

    const body = jsonOf<ListPayload>(await getRecords(user))
    expect(body.records.find((r) => r.id === id)).toBeUndefined()
    expect(body.deleted.some((d) => d.id === id)).toBe(true)

    await expect(
      s3.send(new HeadObjectCommand({ Bucket: MEDIA_BUCKET, Key: photoKey })),
    ).rejects.toMatchObject({ $metadata: { httpStatusCode: 404 } })
  })

  it('INT-05e 同じ id を再 DELETE: 204・deletedAt は変わらない', async () => {
    const user = newUserId('05e')
    const record = requiredRecord({
      id: crypto.randomUUID(),
      recordedAt: '2026-08-17T00:00:00.000Z',
    })
    expect(statusOf(await postRecord(user, record))).toBe(201)
    await waitUntilIndexed(user, record.id)
    expect(statusOf(await deleteRecord(user, record.id))).toBe(204)

    const first = jsonOf<ListPayload>(await getRecords(user)).deleted.find((d) => d.id === record.id)
    expect(first).toBeDefined()
    await new Promise((r) => setTimeout(r, 30))
    expect(statusOf(await deleteRecord(user, record.id))).toBe(204)

    const second = jsonOf<ListPayload>(await getRecords(user)).deleted.find((d) => d.id === record.id)
    expect(second?.deletedAt).toBe(first?.deletedAt)
  })

  it('INT-05f DELETE 後、?since= を deletedAt より後: その id は deleted に出ない', async () => {
    const user = newUserId('05f')
    const record = requiredRecord({
      id: crypto.randomUUID(),
      recordedAt: '2026-08-18T00:00:00.000Z',
    })
    expect(statusOf(await postRecord(user, record))).toBe(201)
    await waitUntilIndexed(user, record.id)
    expect(statusOf(await deleteRecord(user, record.id))).toBe(204)

    const deletedAt = jsonOf<ListPayload>(await getRecords(user)).deleted.find(
      (d) => d.id === record.id,
    )?.deletedAt
    expect(deletedAt).toBeDefined()

    const res = await getRecords(user, deletedAt)
    expect(statusOf(res)).toBe(200)
    const body = jsonOf<ListPayload>(res)
    expect(body.deleted.find((d) => d.id === record.id)).toBeUndefined()
  })
})
