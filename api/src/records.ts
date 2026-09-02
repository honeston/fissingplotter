import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'
import { deletePhotoByKey } from './photos.js'
import { createDynamoClient } from './awsClients.js'

const TABLE_NAME = process.env.TABLE_NAME ?? ''

const doc = createDynamoClient()

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
  fishCount: number | null
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

export class RecordDeletedError extends Error {
  constructor() {
    super('Record deleted')
    this.name = 'RecordDeletedError'
  }
}

export type RecordDeletion = {
  id: string
  deletedAt: string
}

const DELETION_SORT_PREFIX = 'DELETED#'

function sortKey(recordedAt: string, id: string): string {
  return `${recordedAt}#${id}`
}

function deletionSortKey(id: string): string {
  return `${DELETION_SORT_PREFIX}${id}`
}

function isDeletionItem(item: Record<string, unknown>): boolean {
  if (item.itemType === 'deletion') return true
  return typeof item.sortKey === 'string' && item.sortKey.startsWith(DELETION_SORT_PREFIX)
}

function parseNonNegativeNumber(value: unknown, field: string): number | null {
  if (value == null || value === '') return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${field}`)
  }
  return value
}

function parsePositiveInteger(value: unknown, field: string): number | null {
  if (value == null || value === '') return null
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
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

function storedPositiveInteger(value: unknown): number | null {
  const n = storedNumber(value)
  if (n == null || !Number.isInteger(n) || n < 1) return null
  return n
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

export function validateRecord(input: unknown): FishingRecord {
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
    fishCount: parsePositiveInteger(r.fishCount, 'fishCount'),
    fishSizeCm: parseNonNegativeNumber(r.fishSizeCm, 'fishSizeCm'),
    fishWeightG: parseNonNegativeNumber(r.fishWeightG, 'fishWeightG'),
    tackle: parseTackleFields(r.tackle),
    photoKey: typeof r.photoKey === 'string' ? r.photoKey : null,
    editedFields: parseEditedFields(r.editedFields),
  }
}

async function queryAllItems(userId: string): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = []
  let exclusiveStartKey: Record<string, unknown> | undefined

  do {
    const result = await doc.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    )
    items.push(...((result.Items ?? []) as Record<string, unknown>[]))
    exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (exclusiveStartKey)

  return items
}

export async function listRecords(
  userId: string,
  since?: string,
): Promise<{ records: FishingRecord[]; deleted: RecordDeletion[] }> {
  const items = await queryAllItems(userId)

  let records = items.filter((item) => !isDeletionItem(item)).map(storedToRecord)
  let deleted = items
    .filter(isDeletionItem)
    .map(storedToDeletion)
    .filter((d) => d.id && d.deletedAt)

  if (since) {
    records = records.filter((r) => (r.updatedAt ?? r.recordedAt) > since)
    deleted = deleted.filter((d) => d.deletedAt > since)
  }

  records.sort((a, b) => {
    const keyA = `${a.recordedAt}#${a.id}`
    const keyB = `${b.recordedAt}#${b.id}`
    return keyB < keyA ? -1 : keyB > keyA ? 1 : 0
  })
  deleted.sort((a, b) => (b.deletedAt < a.deletedAt ? -1 : b.deletedAt > a.deletedAt ? 1 : 0))

  return { records, deleted }
}

async function findItemsById(userId: string, id: string): Promise<Record<string, unknown>[]> {
  const result = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'by-id',
      KeyConditionExpression: 'userId = :userId AND id = :id',
      ExpressionAttributeValues: { ':userId': userId, ':id': id },
    }),
  )
  return (result.Items ?? []) as Record<string, unknown>[]
}

export async function upsertRecord(userId: string, input: unknown): Promise<FishingRecord> {
  const record = validateRecord(input)
  const now = new Date().toISOString()
  const nextSortKey = sortKey(record.recordedAt, record.id)
  const items = await findItemsById(userId, record.id)
  if (items.some(isDeletionItem)) {
    throw new RecordDeletedError()
  }
  const existing = items.find((item) => !isDeletionItem(item))

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
        fishCount: record.fishCount,
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

async function putDeletionLog(userId: string, id: string, deletedAt: string): Promise<void> {
  await doc.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        userId,
        sortKey: deletionSortKey(id),
        id,
        itemType: 'deletion',
        deletedAt,
      },
    }),
  )
}

export async function deleteRecord(userId: string, id: string): Promise<void> {
  const items = await findItemsById(userId, id)
  const existing = items.find((item) => !isDeletionItem(item))
  const deletion = items.find(isDeletionItem)

  if (!deletion) {
    await putDeletionLog(userId, id, new Date().toISOString())
  }

  if (!existing || typeof existing.sortKey !== 'string') {
    return
  }

  if (typeof existing.photoKey === 'string' && existing.photoKey) {
    try {
      await deletePhotoByKey(existing.photoKey)
    } catch {
      // 記録削除は続行
    }
  }

  await doc.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { userId, sortKey: existing.sortKey },
    }),
  )
}

/** アカウント物理削除用: 当該ユーザーの記録と削除ログを全件削除（写真はプレフィックス削除側でまとめて消す） */
export async function deleteAllRecordsForUser(userId: string): Promise<void> {
  let exclusiveStartKey: Record<string, unknown> | undefined

  do {
    const page = await doc.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        ProjectionExpression: 'userId, sortKey',
        ExclusiveStartKey: exclusiveStartKey,
      }),
    )

    for (const item of page.Items ?? []) {
      if (typeof item.sortKey !== 'string') continue
      await doc.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { userId, sortKey: item.sortKey },
        }),
      )
    }

    exclusiveStartKey = page.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (exclusiveStartKey)
}

function storedToDeletion(item: Record<string, unknown>): RecordDeletion {
  return {
    id: String(item.id),
    deletedAt: storedString(item.deletedAt) ?? '',
  }
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
    fishCount: storedPositiveInteger(item.fishCount),
    fishSizeCm: storedNumber(item.fishSizeCm),
    fishWeightG: storedNumber(item.fishWeightG),
    tackle: parseTackleFields(item.tackle),
    photoKey: item.photoKey == null ? null : String(item.photoKey),
    editedFields: parseEditedFields(item.editedFields),
    updatedAt: storedString(item.updatedAt),
  }
}
