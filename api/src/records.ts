import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'

const TABLE_NAME = process.env.TABLE_NAME ?? ''

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}))

export interface FishingRecord {
  id: string
  recordedAt: string
  latitude: number
  longitude: number
  temperature: number | null
  tideLevel: number | null
  tideHarbor: string | null
  fishSpecies: string | null
}

function sortKey(recordedAt: string, id: string): string {
  return `${recordedAt}#${id}`
}

function validateRecord(input: unknown): FishingRecord {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid record body')
  }
  const r = input as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id) throw new Error('Invalid id')
  if (typeof r.recordedAt !== 'string' || !r.recordedAt) throw new Error('Invalid recordedAt')
  if (typeof r.latitude !== 'number') throw new Error('Invalid latitude')
  if (typeof r.longitude !== 'number') throw new Error('Invalid longitude')

  return {
    id: r.id,
    recordedAt: r.recordedAt,
    latitude: r.latitude,
    longitude: r.longitude,
    temperature: typeof r.temperature === 'number' ? r.temperature : null,
    tideLevel: typeof r.tideLevel === 'number' ? r.tideLevel : null,
    tideHarbor: typeof r.tideHarbor === 'string' ? r.tideHarbor : null,
    fishSpecies: typeof r.fishSpecies === 'string' ? r.fishSpecies : null,
  }
}

export async function listRecords(userId: string, since?: string): Promise<FishingRecord[]> {
  const result = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ScanIndexForward: false,
    }),
  )

  let records = (result.Items ?? []).map(storedToRecord)
  if (since) {
    records = records.filter((r) => r.recordedAt > since)
  }
  return records
}

export async function upsertRecord(userId: string, input: unknown): Promise<FishingRecord> {
  const record = validateRecord(input)
  const now = new Date().toISOString()

  await doc.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        userId,
        sortKey: sortKey(record.recordedAt, record.id),
        id: record.id,
        recordedAt: record.recordedAt,
        latitude: record.latitude,
        longitude: record.longitude,
        temperature: record.temperature,
        tideLevel: record.tideLevel,
        tideHarbor: record.tideHarbor,
        fishSpecies: record.fishSpecies,
        updatedAt: now,
      },
    }),
  )

  return record
}

export async function deleteRecord(userId: string, id: string): Promise<void> {
  const result = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'by-id',
      KeyConditionExpression: 'userId = :userId AND id = :id',
      ExpressionAttributeValues: { ':userId': userId, ':id': id },
      Limit: 1,
    }),
  )

  const item = result.Items?.[0]
  if (!item || typeof item.sortKey !== 'string') {
    return
  }

  await doc.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { userId, sortKey: item.sortKey },
    }),
  )
}

function storedToRecord(item: Record<string, unknown>): FishingRecord {
  return {
    id: String(item.id),
    recordedAt: String(item.recordedAt),
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
    temperature: item.temperature == null ? null : Number(item.temperature),
    tideLevel: item.tideLevel == null ? null : Number(item.tideLevel),
    tideHarbor: item.tideHarbor == null ? null : String(item.tideHarbor),
    fishSpecies: item.fishSpecies == null ? null : String(item.fishSpecies),
  }
}
