/** ユーザーが手動修正した項目。魚種・体長・重さは対象外。 */
export type EditedField = 'recordedAt' | 'location'

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
  fishSizeCm: number | null
  fishWeightG: number | null
  photoKey: string | null
  editedFields: EditedField[]
  updatedAt?: string | null
}

/** 新規保存時に渡す入力（id / recordedAt は storage 側で付与可） */
export type NewFishingRecord = Omit<FishingRecord, 'id' | 'recordedAt'> & {
  id?: string
  recordedAt?: string
}

/** 記録フォーム入力 */
export interface RecordFormInput {
  fishSpecies: string | null
  fishSizeCm: number | null
  fishWeightG: number | null
  photoBlob: Blob | null
}
