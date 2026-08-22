import type { FishingRecord } from '../types/record'
import { putRecord } from './storage'
import { getSunTimes } from './sun'

const nullExtras = {
  fishSizeCm: null as number | null,
  fishWeightG: null as number | null,
  photoKey: null as string | null,
}

type SeedBase = Omit<
  FishingRecord,
  'recordedAt' | 'dawnAt' | 'sunriseAt' | 'sunsetAt' | 'duskAt' | 'editedFields'
>

type SunOffset =
  | { at: 'sunrise'; minutes: number }
  | { at: 'sunset'; minutes: number }
  | { at: 'day' }
  | { at: 'night' }

function addMinutes(iso: string, minutes: number): Date {
  return new Date(new Date(iso).getTime() + minutes * 60_000)
}

function stampSun(base: SeedBase, daysAgoCount: number, offset: SunOffset): FishingRecord {
  const noon = new Date()
  noon.setDate(noon.getDate() - daysAgoCount)
  noon.setHours(12, 0, 0, 0)

  const latitude = base.latitude ?? 35.68
  const longitude = base.longitude ?? 139.76
  const sun = getSunTimes(noon, latitude, longitude)

  let recordedAt = noon
  if (sun) {
    if (offset.at === 'sunrise') recordedAt = addMinutes(sun.sunriseAt, offset.minutes)
    else if (offset.at === 'sunset') recordedAt = addMinutes(sun.sunsetAt, offset.minutes)
    else if (offset.at === 'day') {
      recordedAt = new Date(
        (new Date(sun.sunriseAt).getTime() + new Date(sun.sunsetAt).getTime()) / 2,
      )
    } else {
      recordedAt = addMinutes(sun.sunsetAt, 4 * 60)
    }
  }

  const stamped = getSunTimes(recordedAt, latitude, longitude) ?? sun
  return {
    ...base,
    recordedAt: recordedAt.toISOString(),
    dawnAt: stamped?.dawnAt ?? null,
    sunriseAt: stamped?.sunriseAt ?? null,
    sunsetAt: stamped?.sunsetAt ?? null,
    duskAt: stamped?.duskAt ?? null,
    editedFields: [],
  }
}

/** 開発用サンプル。日出±・日没±・日中・夜間が見えるよう時刻を置く。 */
const DEV_SEED_RECORDS: FishingRecord[] = [
  stampSun(
    {
      id: 'seed-001',
      latitude: 35.3167,
      longitude: 139.4833,
      locationName: '神奈川県藤沢市片瀬',
      temperature: 18.2,
      weatherCode: 1,
      windSpeedMs: 3.2,
      tideLevel: 142,
      tideHarbor: '江の島',
      tideCycle: '大潮',
      moonPhase: '新月',
      moonAge: 0.4,
      tideSlopeCmPerHour: 15.2,
      fishSpecies: 'アジ',
      fishSizeCm: 28,
      fishWeightG: 280,
      photoKey: null,
    },
    0,
    { at: 'sunrise', minutes: 40 },
  ),
  stampSun(
    {
      id: 'seed-002',
      latitude: 35.4437,
      longitude: 139.638,
      locationName: '神奈川県横浜市中区',
      temperature: 17.8,
      weatherCode: 3,
      windSpeedMs: 4.1,
      tideLevel: 98,
      tideHarbor: '横浜',
      tideCycle: '中潮',
      moonPhase: '三日月',
      moonAge: 3.1,
      tideSlopeCmPerHour: -12.0,
      fishSpecies: 'メバル',
      fishSizeCm: 22,
      fishWeightG: 180,
      photoKey: null,
    },
    0,
    { at: 'sunset', minutes: -70 },
  ),
  stampSun(
    {
      id: 'seed-003',
      latitude: 35.734,
      longitude: 140.826,
      locationName: '千葉県銚子市',
      temperature: 16.5,
      weatherCode: 61,
      windSpeedMs: 6.8,
      tideLevel: 185,
      tideHarbor: '銚子',
      tideCycle: '大潮',
      moonPhase: '満月',
      moonAge: 14.8,
      tideSlopeCmPerHour: 8.5,
      fishSpecies: 'カサゴ',
      fishSizeCm: 18,
      fishWeightG: 120,
      photoKey: null,
    },
    1,
    { at: 'sunrise', minutes: -35 },
  ),
  stampSun(
    {
      id: 'seed-004',
      latitude: 35.152,
      longitude: 139.618,
      locationName: '神奈川県小田原市',
      temperature: 19.1,
      weatherCode: 2,
      windSpeedMs: 2.4,
      tideLevel: 76,
      tideHarbor: '小田原',
      tideCycle: '小潮',
      moonPhase: '上弦',
      moonAge: 7.2,
      tideSlopeCmPerHour: 0.3,
      fishSpecies: null,
      ...nullExtras,
    },
    1,
    { at: 'sunset', minutes: 25 },
  ),
  stampSun(
    {
      id: 'seed-005',
      latitude: 35.521,
      longitude: 139.825,
      locationName: '東京都江戸川区',
      temperature: 15.9,
      weatherCode: 0,
      windSpeedMs: 1.6,
      tideLevel: 210,
      tideHarbor: '東京',
      tideCycle: '中潮',
      moonPhase: '十三夜',
      moonAge: 13.0,
      tideSlopeCmPerHour: -18.6,
      fishSpecies: 'シーバス',
      fishSizeCm: 65,
      fishWeightG: 2500,
      photoKey: null,
    },
    3,
    { at: 'day' },
  ),
  stampSun(
    {
      id: 'seed-006',
      latitude: 34.682,
      longitude: 135.195,
      locationName: '兵庫県神戸市',
      temperature: 20.4,
      weatherCode: 80,
      windSpeedMs: 5.5,
      tideLevel: null,
      tideHarbor: null,
      tideCycle: null,
      moonPhase: null,
      moonAge: null,
      tideSlopeCmPerHour: null,
      fishSpecies: 'ヒラメ',
      fishSizeCm: 42,
      fishWeightG: 900,
      photoKey: null,
    },
    5,
    { at: 'night' },
  ),
  stampSun(
    {
      id: 'seed-007',
      latitude: 35.3167,
      longitude: 139.4833,
      locationName: '神奈川県藤沢市片瀬',
      temperature: 21.0,
      weatherCode: 1,
      windSpeedMs: 2.9,
      tideLevel: 55,
      tideHarbor: '江の島',
      tideCycle: '長潮',
      moonPhase: '下弦',
      moonAge: 22.5,
      tideSlopeCmPerHour: 6.0,
      fishSpecies: 'サバ',
      fishSizeCm: 35,
      fishWeightG: 500,
      photoKey: null,
    },
    5,
    { at: 'sunrise', minutes: 90 },
  ),
  stampSun(
    {
      id: 'seed-008',
      latitude: 35.4437,
      longitude: 139.638,
      locationName: '神奈川県横浜市中区',
      temperature: 14.2,
      weatherCode: 45,
      windSpeedMs: 0.8,
      tideLevel: 168,
      tideHarbor: '横浜',
      tideCycle: '大潮',
      moonPhase: '新月',
      moonAge: 1.2,
      tideSlopeCmPerHour: 22.0,
      fishSpecies: 'カレイ',
      fishSizeCm: 30,
      fishWeightG: 320,
      photoKey: null,
    },
    7,
    { at: 'day' },
  ),
  stampSun(
    {
      id: 'seed-009',
      latitude: 35.734,
      longitude: 140.826,
      locationName: '千葉県銚子市',
      temperature: 13.8,
      weatherCode: 3,
      windSpeedMs: 7.2,
      tideLevel: 92,
      tideHarbor: '銚子',
      tideCycle: '中潮',
      moonPhase: '二十六夜',
      moonAge: 26.1,
      tideSlopeCmPerHour: -4.5,
      fishSpecies: 'マゴチ',
      fishSizeCm: 55,
      fishWeightG: 1800,
      photoKey: null,
    },
    10,
    { at: 'sunset', minutes: -110 },
  ),
  stampSun(
    {
      id: 'seed-010',
      latitude: 35.152,
      longitude: 139.618,
      locationName: '神奈川県小田原市',
      temperature: 12.6,
      weatherCode: 71,
      windSpeedMs: 3.7,
      tideLevel: 134,
      tideHarbor: '小田原',
      tideCycle: '小潮',
      moonPhase: '上弦',
      moonAge: 8.0,
      tideSlopeCmPerHour: 1.8,
      fishSpecies: 'アジ',
      fishSizeCm: 26,
      fishWeightG: 240,
      photoKey: null,
    },
    14,
    { at: 'night' },
  ),
]

/** 開発環境: サンプル記録を上書き投入し、日出没の表示パターンを確認できるようにする */
export async function seedDevRecordsIfEmpty(): Promise<number> {
  if (!import.meta.env.DEV) return 0

  for (const record of DEV_SEED_RECORDS) {
    await putRecord(record)
  }
  return DEV_SEED_RECORDS.length
}
