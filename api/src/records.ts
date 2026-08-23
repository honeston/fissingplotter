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
  locationName: string | null
  temperature: number | null
  weatherCode: number | null
  windSpeedMs: number | null
  dawnAt: string | null
  sunriseAt: string | null
  sunsetAt: string | null
  duskAt: string | null
  tideLevel: number | null
  tideHarbor: string | null
  tideCycle: string | null
  moonPhase: string | null
  moonAge: number | null
  tideSlopeCmPerHour: number | null
  fishSpecies: string | null
  fishSizeCm: number | null
  fishWeightG: number | null
  tackle: TackleFields | null
  photoKey: string | null
  editedFields: EditedField[]
  updatedAt?: string | null
}

type EditedField = 'recordedAt' | 'location'

export type TackleFields = {
  name: string
  rod: string
  reel: string
  line: string
  lureOrBait: string
  rig: string
}

function sortKey(recordedAt: string, id: string): string {
  return `${recordedAt}#${id}`
}

function parseNonNegativeNumber(value: unknown, field: string): number | null {
  if (value == null || value === '') return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${field}`)
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

const ALLOWED_EDITED_FIELDS = new Set(['recordedAt', 'location'])

function parseEditedFields(value: unknown): EditedField[] {
  if (!Array.isArray(value)) return []
  const unique = new Set<EditedField>()
  for (const item of value) {
    if (typeof item === 'string' && ALLOWED_EDITED_FIELDS.has(item)) {
      unique.add(item as EditedField)
    }
  }
  return [...unique]
}

function parseTackleFields(value: unknown): TackleFields | null {
  if (value == null) return null
  if (typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const fields: TackleFields = {
    name: typeof v.name === 'string' ? v.name.trim() : '',
    rod: typeof v.rod === 'string' ? v.rod.trim() : '',
    reel: typeof v.reel === 'string' ? v.reel.trim() : '',
    line: typeof v.line === 'string' ? v.line.trim() : '',
    lureOrBait: typeof v.lureOrBait === 'string' ? v.lureOrBait.trim() : '',
    rig: typeof v.rig === 'string' ? v.rig.trim() : '',
  }
  const hasContent = Boolean(
    fields.name ||
      fields.rod ||
      fields.reel ||
      fields.line ||
      fields.lureOrBait ||
      fields.rig,
  )
  return hasContent ? fields : null
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
    locationName: optionalString(r.locationName),
    temperature: optionalNumber(r.temperature),
    weatherCode: optionalNumber(r.weatherCode),
    windSpeedMs: optionalNumber(r.windSpeedMs),
    dawnAt: optionalString(r.dawnAt),
    sunriseAt: optionalString(r.sunriseAt),
    sunsetAt: optionalString(r.sunsetAt),
    duskAt: optionalString(r.duskAt),
    tideLevel: optionalNumber(r.tideLevel),
    tideHarbor: optionalString(r.tideHarbor),
    tideCycle: optionalString(r.tideCycle),
    moonPhase: optionalString(r.moonPhase),
    moonAge: optionalNumber(r.moonAge),
    tideSlopeCmPerHour: optionalNumber(r.tideSlopeCmPerHour),
    fishSpecies: optionalString(r.fishSpecies),
    fishSizeCm: parseNonNegativeNumber(r.fishSizeCm, 'fishSizeCm'),
    fishWeightG: parseNonNegativeNumber(r.fishWeightG, 'fishWeightG'),
    tackle: parseTackleFields(r.tackle),
    photoKey: typeof r.photoKey === 'string' ? r.photoKey : null,
    editedFields: parseEditedFields(r.editedFields),
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
    records = records.filter((r) => (r.updatedAt ?? r.recordedAt) > since)
  }
  return records
}

async function findItemById(userId: string, id: string) {
  const result = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'by-id',
      KeyConditionExpression: 'userId = :userId AND id = :id',
      ExpressionAttributeValues: { ':userId': userId, ':id': id },
      Limit: 1,
    }),
  )
  return result.Items?.[0]
}

export async function upsertRecord(userId: string, input: unknown): Promise<FishingRecord> {
  const record = validateRecord(input)
  const now = new Date().toISOString()
  const nextSortKey = sortKey(record.recordedAt, record.id)
  const existing = await findItemById(userId, record.id)

  if (existing && typeof existing.sortKey === 'string' && existing.sortKey !== nextSortKey) {
    await doc.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { userId, sortKey: existing.sortKey },
      }),
    )
  }

  await doc.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        userId,
        sortKey: nextSortKey,
        id: record.id,
        recordedAt: record.recordedAt,
        latitude: record.latitude,
        longitude: record.longitude,
        locationName: record.locationName,
        temperature: record.temperature,
        weatherCode: record.weatherCode,
        windSpeedMs: record.windSpeedMs,
        dawnAt: record.dawnAt,
        sunriseAt: record.sunriseAt,
        sunsetAt: record.sunsetAt,
        duskAt: record.duskAt,
        tideLevel: record.tideLevel,
        tideHarbor: record.tideHarbor,
        tideCycle: record.tideCycle,
        moonPhase: record.moonPhase,
        moonAge: record.moonAge,
        tideSlopeCmPerHour: record.tideSlopeCmPerHour,
        fishSpecies: record.fishSpecies,
        fishSizeCm: record.fishSizeCm,
        fishWeightG: record.fishWeightG,
        tackle: record.tackle,
        photoKey: record.photoKey,
        editedFields: record.editedFields,
        updatedAt: now,
      },
    }),
  )

  return { ...record, updatedAt: now }
}

export async function deleteRecord(userId: string, id: string): Promise<void> {
  const item = await findItemById(userId, id)
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
  return {
    id: String(item.id),
    recordedAt: String(item.recordedAt),
    latitude: item.latitude == null || item.latitude === '' ? null : Number(item.latitude),
    longitude:
      item.longitude == null || item.longitude === '' ? null : Number(item.longitude),
    locationName: storedString(item.locationName),
    temperature: storedNumber(item.temperature),
    weatherCode: storedNumber(item.weatherCode),
    windSpeedMs: storedNumber(item.windSpeedMs),
    dawnAt: storedString(item.dawnAt),
    sunriseAt: storedString(item.sunriseAt),
    sunsetAt: storedString(item.sunsetAt),
    duskAt: storedString(item.duskAt),
    tideLevel: storedNumber(item.tideLevel),
    tideHarbor: storedString(item.tideHarbor),
    tideCycle: storedString(item.tideCycle),
    moonPhase: storedString(item.moonPhase),
    moonAge: storedNumber(item.moonAge),
    tideSlopeCmPerHour: storedNumber(item.tideSlopeCmPerHour),
    fishSpecies: storedString(item.fishSpecies),
    fishSizeCm: storedNumber(item.fishSizeCm),
    fishWeightG: storedNumber(item.fishWeightG),
    tackle: parseTackleFields(item.tackle),
    photoKey: item.photoKey == null ? null : String(item.photoKey),
    editedFields: parseEditedFields(item.editedFields),
    updatedAt: storedString(item.updatedAt),
  }
}
