import type { FishingRecord } from '../types/record'
import { getAllRecords, putRecord } from './storage'

/** 開発用サンプル記録（固定 ID で再投入しても重複しない） */
const DEV_SEED_RECORDS: FishingRecord[] = [
  {
    id: 'seed-001',
    recordedAt: daysAgo(0, 6, 30),
    latitude: 35.3167,
    longitude: 139.4833,
    temperature: 18.2,
    tideLevel: 142,
    tideHarbor: '江の島',
    fishSpecies: 'アジ',
  },
  {
    id: 'seed-002',
    recordedAt: daysAgo(0, 17, 15),
    latitude: 35.4437,
    longitude: 139.638,
    temperature: 17.8,
    tideLevel: 98,
    tideHarbor: '横浜',
    fishSpecies: 'メバル',
  },
  {
    id: 'seed-003',
    recordedAt: daysAgo(1, 5, 45),
    latitude: 35.734,
    longitude: 140.826,
    temperature: 16.5,
    tideLevel: 185,
    tideHarbor: '銚子',
    fishSpecies: 'カサゴ',
  },
  {
    id: 'seed-004',
    recordedAt: daysAgo(1, 18, 20),
    latitude: 35.152,
    longitude: 139.618,
    temperature: 19.1,
    tideLevel: 76,
    tideHarbor: '小田原',
    fishSpecies: null,
  },
  {
    id: 'seed-005',
    recordedAt: daysAgo(3, 7, 0),
    latitude: 35.521,
    longitude: 139.825,
    temperature: 15.9,
    tideLevel: 210,
    tideHarbor: '東京',
    fishSpecies: 'シーバス',
  },
  {
    id: 'seed-006',
    recordedAt: daysAgo(5, 6, 10),
    latitude: 34.682,
    longitude: 135.195,
    temperature: 20.4,
    tideLevel: null,
    tideHarbor: null,
    fishSpecies: 'ヒラメ',
  },
  {
    id: 'seed-007',
    recordedAt: daysAgo(5, 16, 40),
    latitude: 35.3167,
    longitude: 139.4833,
    temperature: 21.0,
    tideLevel: 55,
    tideHarbor: '江の島',
    fishSpecies: 'サバ',
  },
  {
    id: 'seed-008',
    recordedAt: daysAgo(7, 8, 25),
    latitude: 35.4437,
    longitude: 139.638,
    temperature: 14.2,
    tideLevel: 168,
    tideHarbor: '横浜',
    fishSpecies: 'カレイ',
  },
  {
    id: 'seed-009',
    recordedAt: daysAgo(10, 17, 50),
    latitude: 35.734,
    longitude: 140.826,
    temperature: 13.8,
    tideLevel: 92,
    tideHarbor: '銚子',
    fishSpecies: 'マゴチ',
  },
  {
    id: 'seed-010',
    recordedAt: daysAgo(14, 6, 5),
    latitude: 35.152,
    longitude: 139.618,
    temperature: 12.6,
    tideLevel: 134,
    tideHarbor: '小田原',
    fishSpecies: 'アジ',
  },
]

function daysAgo(days: number, hour: number, minute: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

/** 開発環境のみ: 記録が空のときサンプルデータを投入 */
export async function seedDevRecordsIfEmpty(): Promise<number> {
  if (!import.meta.env.DEV) return 0

  const existing = await getAllRecords()
  if (existing.length > 0) return 0

  for (const record of DEV_SEED_RECORDS) {
    await putRecord(record)
  }
  return DEV_SEED_RECORDS.length
}
