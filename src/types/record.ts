import type { TackleFields } from './tackle'

/** ユーザーが手動修正した項目。魚種・体長・重さ・匹数は対象外。 */
export type EditedField = 'recordedAt' | 'location'

/** catch = 釣果。blank = ボウズ（釣行はしたが釣れなかった） */
export type RecordKind = 'catch' | 'blank'

export function normalizeRecordKind(value: unknown): RecordKind {
  return value === 'blank' ? 'blank' : 'catch'
}

export function isBlankRecord(record: { kind?: RecordKind | string | null }): boolean {
  return record.kind === 'blank'
}

export function recordCatchLabel(record: {
  kind?: RecordKind | string | null
  fishSpecies?: string | null
}): string {
  if (isBlankRecord(record)) return 'ボウズ'
  return record.fishSpecies?.trim() || '（魚種なし）'
}

/** 釣り記録1件 */
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
  /** 匹数。未入力は null（図鑑集計では 1） */
  fishCount: number | null
  fishSizeCm: number | null
  fishWeightG: number | null
  /** 記録時点のタックル（スナップショット） */
  tackle: TackleFields | null
  photoKey: string | null
  editedFields: EditedField[]
  /** 同じ釣行に属する記録をまとめる。旧記録は null */
  tripId: string | null
  kind: RecordKind
  updatedAt?: string | null
}

/** 新規保存時に渡す入力（id / recordedAt は storage 側で付与可） */
export type NewFishingRecord = Omit<FishingRecord, 'id' | 'recordedAt'> & {
  id?: string
  recordedAt?: string
}

/** 記録フォーム入力 */
export type TripReuseConditions = Pick<
  FishingRecord,
  | 'latitude'
  | 'longitude'
  | 'locationName'
  | 'temperature'
  | 'weatherCode'
  | 'windSpeedMs'
  | 'tideLevel'
  | 'tideHarbor'
  | 'tideCycle'
  | 'moonPhase'
  | 'moonAge'
  | 'tideSlopeCmPerHour'
>

export interface RecordFormInput {
  fishSpecies: string | null
  fishCount: number | null
  fishSizeCm: number | null
  fishWeightG: number | null
  tackle: TackleFields | null
  photoBlob: Blob | null
  kind?: RecordKind
  tripId?: string | null
  reuseConditions?: TripReuseConditions | null
}
