import { ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3'
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { purgeExpiredAccounts } from '../src/account.js'
import { createDynamoClient, createS3Client } from '../src/awsClients.js'
import {
  countItemsById,
  getRecords,
  jsonOf,
  newUserId,
  postRecord,
  requiredRecord,
  statusOf,
  waitUntilIndexed,
  type ListPayload,
} from './http.js'

const TABLE_NAME = process.env.TABLE_NAME ?? 'fissingplotter-records'
const ACCOUNT_DELETIONS_TABLE =
  process.env.ACCOUNT_DELETIONS_TABLE ?? 'fissingplotter-account-deletions'
const MEDIA_BUCKET = process.env.MEDIA_BUCKET_NAME ?? 'fissingplotter-media-local'
const doc = createDynamoClient()
const s3 = createS3Client()

describe('INT-09 物理削除バッチ', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('RETENTION_DAYS=0 相当で記録・削除ログ・S3・キュー行が消える', async () => {
    vi.stubEnv('RETENTION_DAYS', '0')
    const user = newUserId('09')
    const keep = requiredRecord({
      id: crypto.randomUUID(),
      recordedAt: '2026-08-01T00:00:00.000Z',
    })
    const removed = requiredRecord({
      id: crypto.randomUUID(),
      recordedAt: '2026-08-02T00:00:00.000Z',
    })
    expect(statusOf(await postRecord(user, keep))).toBe(201)
    expect(statusOf(await postRecord(user, removed))).toBe(201)
    await waitUntilIndexed(user, keep.id)
    await waitUntilIndexed(user, removed.id)

    const photoKey = `${user}/${keep.id}.jpg`
    await s3.send(
      new PutObjectCommand({
        Bucket: MEDIA_BUCKET,
        Key: photoKey,
        Body: Buffer.from('jpg'),
        ContentType: 'image/jpeg',
      }),
    )

    await doc.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          userId: user,
          sortKey: `DELETED#${removed.id}`,
          id: removed.id,
          itemType: 'deletion',
          deletedAt: '2026-08-03T00:00:00.000Z',
        },
      }),
    )

    await doc.send(
      new PutCommand({
        TableName: ACCOUNT_DELETIONS_TABLE,
        Item: {
          userId: user,
          deletedAt: '2000-01-01T00:00:00.000Z',
          username: `${user}@example.test`,
        },
      }),
    )

    const result = await purgeExpiredAccounts()
    expect(result.purged).toBeGreaterThanOrEqual(1)

    const listed = jsonOf<ListPayload>(await getRecords(user))
    expect(listed.records).toEqual([])
    expect(listed.deleted).toEqual([])
    expect(await countItemsById(user, keep.id)).toBe(0)
    expect(await countItemsById(user, removed.id)).toBe(0)

    const objects = await s3.send(
      new ListObjectsV2Command({ Bucket: MEDIA_BUCKET, Prefix: `${user}/` }),
    )
    expect(objects.Contents ?? []).toEqual([])

    const queue = await doc.send(
      new GetCommand({ TableName: ACCOUNT_DELETIONS_TABLE, Key: { userId: user } }),
    )
    expect(queue.Item).toBeUndefined()
  })
})
