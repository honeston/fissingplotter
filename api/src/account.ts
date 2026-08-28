import {
  AdminDeleteUserCommand,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider'
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb'
import { createCognitoClient, createDynamoClient } from './awsClients.js'
import { deleteAllPhotosForUser } from './photos.js'
import { deleteAllRecordsForUser } from './records.js'

function deletionsTable(): string {
  return process.env.ACCOUNT_DELETIONS_TABLE ?? ''
}

function userPoolId(): string {
  return process.env.USER_POOL_ID ?? ''
}

function retentionDays(): number {
  const n = Number(process.env.RETENTION_DAYS ?? '7')
  return Number.isFinite(n) ? n : 7
}

const doc = createDynamoClient()
const cognito = createCognitoClient()

export async function isAccountDeleted(userId: string): Promise<boolean> {
  const table = deletionsTable()
  if (!table) return false
  const result = await doc.send(
    new GetCommand({
      TableName: table,
      Key: { userId },
    }),
  )
  return Boolean(result.Item)
}

async function adminDeleteCognitoUser(username: string): Promise<void> {
  const poolId = userPoolId()
  if (!poolId || !username) return
  try {
    await cognito.send(
      new AdminDeleteUserCommand({
        UserPoolId: poolId,
        Username: username,
      }),
    )
  } catch (err) {
    if (err instanceof UserNotFoundException) return
    const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : ''
    if (name === 'UserNotFoundException') return
    throw err
  }
}

/** 論理削除キュー登録 → Cognito ユーザー削除 */
export async function markAccountDeleted(userId: string, username: string): Promise<void> {
  const table = deletionsTable()
  if (!table) {
    throw new Error('ACCOUNT_DELETIONS_TABLE is not configured')
  }
  if (!username) {
    throw new Error('Invalid username')
  }

  const deletedAt = new Date().toISOString()
  await doc.send(
    new PutCommand({
      TableName: table,
      Item: {
        userId,
        deletedAt,
        username,
      },
    }),
  )

  await adminDeleteCognitoUser(username)
}

export async function purgeExpiredAccounts(): Promise<{ purged: number }> {
  const table = deletionsTable()
  if (!table) {
    throw new Error('ACCOUNT_DELETIONS_TABLE is not configured')
  }

  const retentionMs = retentionDays() * 24 * 60 * 60 * 1000
  const cutoff = new Date(Date.now() - retentionMs).toISOString()

  let purged = 0
  let exclusiveStartKey: Record<string, unknown> | undefined

  do {
    const page = await doc.send(
      new ScanCommand({
        TableName: table,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    )

    for (const item of page.Items ?? []) {
      const userId = typeof item.userId === 'string' ? item.userId : null
      const deletedAt = typeof item.deletedAt === 'string' ? item.deletedAt : null
      const username = typeof item.username === 'string' ? item.username : ''
      if (!userId || !deletedAt || deletedAt > cutoff) continue

      await deleteAllRecordsForUser(userId)
      await deleteAllPhotosForUser(userId)

      if (username) {
        try {
          await adminDeleteCognitoUser(username)
        } catch (err) {
          console.error('Cognito retry delete failed', { userId, err })
        }
      }

      await doc.send(
        new DeleteCommand({
          TableName: table,
          Key: { userId },
        }),
      )
      purged += 1
    }

    exclusiveStartKey = page.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (exclusiveStartKey)

  return { purged }
}
