import { beforeAll, describe, expect, it, vi } from 'vitest'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { createDynamoClient } from '../src/awsClients.js'
import { getRecords, invoke, jsonOf, newUserId, statusOf } from './http.js'

const { send } = vi.hoisted(() => ({ send: vi.fn(async () => undefined) }))

vi.mock('../src/awsClients.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/awsClients.js')>()
  return {
    ...actual,
    createCognitoClient: () => ({ send }),
  }
})

const ACCOUNT_DELETIONS_TABLE =
  process.env.ACCOUNT_DELETIONS_TABLE ?? 'fissingplotter-account-deletions'
const doc = createDynamoClient()

describe('INT-08 退会', () => {
  beforeAll(() => {
    process.env.USER_POOL_ID = 'ap-northeast-1_e2etest'
  })

  it('INT-08a DELETE /account は 204。キューに userId', async () => {
    send.mockResolvedValueOnce(undefined)
    const user = newUserId('08a')
    const email = `${user}@example.test`
    const res = await invoke({ method: 'DELETE', path: '/account', sub: user, email })
    expect(statusOf(res)).toBe(204)

    const queued = await doc.send(
      new GetCommand({ TableName: ACCOUNT_DELETIONS_TABLE, Key: { userId: user } }),
    )
    expect(queued.Item?.userId).toBe(user)
  })

  it('INT-08b 続けて GET /records は 403', async () => {
    send.mockResolvedValueOnce(undefined)
    const user = newUserId('08b')
    const email = `${user}@example.test`
    expect(
      statusOf(await invoke({ method: 'DELETE', path: '/account', sub: user, email })),
    ).toBe(204)
    const listed = await getRecords(user)
    expect(statusOf(listed)).toBe(403)
    expect(jsonOf<{ error: string }>(listed).error).toBe('Account deleted')
  })

  it('INT-08c Cognito ユーザー既に無しでも 204', async () => {
    const err = new Error('User not found')
    err.name = 'UserNotFoundException'
    send.mockRejectedValueOnce(err)

    const user = newUserId('08c')
    const email = `${user}@example.test`
    const res = await invoke({ method: 'DELETE', path: '/account', sub: user, email })
    expect(statusOf(res)).toBe(204)
  })
})
