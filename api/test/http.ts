import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda'
import { createDynamoClient } from '../src/awsClients.js'
import { handler } from '../src/handler.js'

const TABLE_NAME = process.env.TABLE_NAME ?? 'fissingplotter-records'
const doc = createDynamoClient()

export type RecordBody = {
  id: string
  recordedAt: string
  latitude?: number | null
  longitude?: number | null
  fishSpecies?: string | null
  photoKey?: string | null
  updatedAt?: string | null
}

export type ListedRecord = {
  id: string
  recordedAt: string
  updatedAt?: string | null
  fishSpecies?: string | null
  photoKey?: string | null
}

export type ListedDeletion = {
  id: string
  deletedAt: string
}

export type ListPayload = {
  records: ListedRecord[]
  deleted: ListedDeletion[]
}

export function newUserId(label: string): string {
  return `int-${label}-${crypto.randomUUID()}`
}

export function jwtFor(sub: string, claims: Record<string, string> = {}): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ sub, ...claims })).toString('base64url')
  return `${header}.${payload}.sig`
}

export function requiredRecord(
  overrides: Partial<RecordBody> & Pick<RecordBody, 'id' | 'recordedAt'>,
): RecordBody {
  return { ...overrides }
}

type InvokeInput = {
  method: string
  path: string
  sub?: string
  email?: string
  body?: unknown
  query?: Record<string, string>
}

export async function invoke(input: InvokeInput): Promise<APIGatewayProxyResultV2> {
  const headers: Record<string, string> = {}
  if (input.sub) {
    headers.authorization = `Bearer ${jwtFor(input.sub, input.email ? { email: input.email } : {})}`
  }

  const event = {
    version: '2.0',
    routeKey: `${input.method} ${input.path}`,
    rawPath: input.path,
    headers,
    queryStringParameters: input.query,
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
    requestContext: {
      stage: '$default',
      http: { method: input.method, path: input.path },
    },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer

  return handler(event)
}

export function statusOf(res: APIGatewayProxyResultV2): number {
  if (typeof res === 'string') throw new Error(`Unexpected string result: ${res}`)
  if (res.statusCode == null) throw new Error('Missing statusCode')
  return res.statusCode
}

export function jsonOf<T>(res: APIGatewayProxyResultV2): T {
  if (typeof res === 'string') throw new Error(`Unexpected string result: ${res}`)
  if (res.body == null || res.body === '') {
    throw new Error(`Expected JSON body, got status ${res.statusCode}`)
  }
  return JSON.parse(res.body) as T
}

export async function postRecord(sub: string, body: RecordBody) {
  const res = await invoke({ method: 'POST', path: '/records', sub, body })
  return res
}

export async function getRecords(sub: string, since?: string) {
  const res = await invoke({
    method: 'GET',
    path: '/records',
    sub,
    query: since ? { since } : undefined,
  })
  return res
}

export async function deleteRecord(sub: string, id: string) {
  return invoke({ method: 'DELETE', path: `/records/${encodeURIComponent(id)}`, sub })
}

export async function waitUntilIndexed(userId: string, id: string): Promise<void> {
  for (let i = 0; i < 40; i++) {
    const result = await doc.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'by-id',
        KeyConditionExpression: 'userId = :userId AND id = :id',
        ExpressionAttributeValues: { ':userId': userId, ':id': id },
      }),
    )
    if ((result.Items ?? []).length > 0) return
    await new Promise((r) => setTimeout(r, 50))
  }
  throw new Error(`GSI by-id did not contain ${id} for ${userId}`)
}

export async function countItemsById(userId: string, id: string): Promise<number> {
  const result = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'by-id',
      KeyConditionExpression: 'userId = :userId AND id = :id',
      ExpressionAttributeValues: { ':userId': userId, ':id': id },
    }),
  )
  return (result.Items ?? []).length
}
