import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'
import { deletePhotoByKey } from './photos.js'

const TABLE_NAME = process.env.TABLE_NAME ?? ''

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}))

export interface FishingRecord {
  id: string
  recordedAt: string
  latitude: number | null
  longitude: number | null
  temperature: number | null
  weatherCode: number | null
  tideLevel: number | null
  tideHarbor: string | null
  tideCycle: string | null
  moonPhase: string | null
  moonAge: number | null
  tideSlopeCmPerHour: number | null
  fishSpecies: string | null
  fishSizeCm: number | null
  photoKey: string | null
}

function sortKey(recordedAt: string, id: string): string {
  return `${recordedAt}#${id}`
}

function parseFishSizeCm(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error('Invalid fishSizeCm')
  }
  return value
}

function optionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function storedNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function storedString(value: unknown): string | null {
  return value == null ? null : String(value)
}

function validateRecord(input: unknown): FishingRecord {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid record body')
  }
  const r = input as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id) throw new Error('Invalid id')
  if (typeof r.recordedAt !== 'string' || !r.recordedAt) throw new Error('Invalid recordedAt')

  const latitude =
    r.latitude == null || r.latitude === '' ? null : Number(r.latitude)
  const longitude =
    r.longitude == null || r.longitude === '' ? null : Number(r.longitude)
  if (latitude != null && !Number.isFinite(latitude)) throw new Error('Invalid latitude')
  if (longitude != null && !Number.isFinite(longitude)) throw new Error('Invalid longitude')
  if ((latitude == null) !== (longitude == null)) {
    throw new Error('Invalid coordinates')
  }

  return {
    id: r.id,
    recordedAt: r.recordedAt,
    latitude,
    longitude,
    temperature: optionalNumber(r.temperature),
    weatherCode: optionalNumber(r.weatherCode),
    tideLevel: optionalNumber(r.tideLevel),
    tideHarbor: optionalString(r.tideHarbor),
    tideCycle: optionalString(r.tideCycle),
    moonPhase: optionalString(r.moonPhase),
    moonAge: optionalNumber(r.moonAge),
    tideSlopeCmPerHour: optionalNumber(r.tideSlopeCmPerHour),
    fishSpecies: optionalString(r.fishSpecies),
    fishSizeCm: parseFishSizeCm(r.fishSizeCm),
    photoKey: typeof r.photoKey === 'string' ? r.photoKey : null,
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
        weatherCode: record.weatherCode,
        tideLevel: record.tideLevel,
        tideHarbor: record.tideHarbor,
        tideCycle: record.tideCycle,
        moonPhase: record.moonPhase,
        moonAge: record.moonAge,
        tideSlopeCmPerHour: record.tideSlopeCmPerHour,
        fishSpecies: record.fishSpecies,
        fishSizeCm: record.fishSizeCm,
        photoKey: record.photoKey,
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

  if (typeof item.photoKey === 'string' && item.photoKey) {
    try {
      await deletePhotoByKey(item.photoKey)
    } catch {
      // 記録削除は続行
    }
  }

  await doc.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { userId, sortKey: item.sortKey },
    }),
  )
}

function storedToRecord(item: Record<string, unknown>): FishingRecord {
  const fishSizeCm =
    item.fishSizeCm == null || item.fishSizeCm === ''
      ? null
      : Number(item.fishSizeCm)

  return {
    id: String(item.id),
    recordedAt: String(item.recordedAt),
    latitude: item.latitude == null || item.latitude === '' ? null : Number(item.latitude),
    longitude:
      item.longitude == null || item.longitude === '' ? null : Number(item.longitude),
    temperature: storedNumber(item.temperature),
    weatherCode: storedNumber(item.weatherCode),
    tideLevel: storedNumber(item.tideLevel),
    tideHarbor: storedString(item.tideHarbor),
    tideCycle: storedString(item.tideCycle),
    moonPhase: storedString(item.moonPhase),
    moonAge: storedNumber(item.moonAge),
    tideSlopeCmPerHour: storedNumber(item.tideSlopeCmPerHour),
    fishSpecies: storedString(item.fishSpecies),
    fishSizeCm: Number.isFinite(fishSizeCm) ? fishSizeCm : null,
    photoKey: item.photoKey == null ? null : String(item.photoKey),
  }
}
