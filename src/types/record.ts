/** 釣り記録1件 */
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

/** 新規保存時に渡す入力（id / recordedAt は storage 側で付与可） */
export type NewFishingRecord = Omit<FishingRecord, 'id' | 'recordedAt'> & {
  id?: string
  recordedAt?: string
}
