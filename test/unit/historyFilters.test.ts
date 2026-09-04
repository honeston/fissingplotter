import { describe, expect, it } from 'vitest'
import {
  EMPTY_HISTORY_FILTERS,
  applyHistoryFiltersToSearchParams,
  filterRecordsByHistory,
  hasActiveHistoryFilters,
  historyFiltersFromSearchParams,
} from '../../src/lib/historyFilters'
import { sampleRecord } from './recordFixture'

describe('履歴フィルタ', () => {
  const aji = sampleRecord({
    id: 'aji',
    recordedAt: '2026-09-04T07:00:00.000Z',
    fishSpecies: 'アジ',
    locationName: '神奈川県藤沢市片瀬',
    tackle: {
      name: '',
      rod: '',
      reel: '',
      line: '',
      lureOrBaitKind: 'lure',
      lureOrBait: 'メタルジグ',
      rig: '',
    },
  })
  const saba = sampleRecord({
    id: 'saba',
    recordedAt: '2026-09-04T08:00:00.000Z',
    fishSpecies: 'サバ',
    locationName: '神奈川県横浜市中区',
    tackle: {
      name: '',
      rod: '',
      reel: '',
      line: '',
      lureOrBaitKind: 'lure',
      lureOrBait: 'ミノー',
      rig: '',
    },
  })
  const blank = sampleRecord({
    id: 'blank',
    recordedAt: '2026-09-04T16:00:00.000Z',
    kind: 'blank',
    locationName: '神奈川県横浜市中区',
  })

  it('魚種・場所・ルアー・ボウズで絞る', () => {
    const all = [aji, saba, blank]
    expect(filterRecordsByHistory(all, EMPTY_HISTORY_FILTERS).map((r) => r.id)).toEqual([
      'aji',
      'saba',
      'blank',
    ])
    expect(
      filterRecordsByHistory(all, { ...EMPTY_HISTORY_FILTERS, species: 'アジ' }).map((r) => r.id),
    ).toEqual(['aji'])
    expect(
      filterRecordsByHistory(all, { ...EMPTY_HISTORY_FILTERS, place: '横浜' }).map((r) => r.id),
    ).toEqual(['saba', 'blank'])
    expect(
      filterRecordsByHistory(all, { ...EMPTY_HISTORY_FILTERS, lure: 'ジグ' }).map((r) => r.id),
    ).toEqual(['aji'])
    expect(
      filterRecordsByHistory(all, { ...EMPTY_HISTORY_FILTERS, result: 'blank' }).map((r) => r.id),
    ).toEqual(['blank'])
    expect(
      filterRecordsByHistory(all, { ...EMPTY_HISTORY_FILTERS, result: 'catch' }).map((r) => r.id),
    ).toEqual(['aji', 'saba'])
  })

  it('クエリとフィルタの往復。空は付けない', () => {
    const params = applyHistoryFiltersToSearchParams(new URLSearchParams('from=2026-09-01'), {
      species: 'アジ',
      place: '',
      lure: 'ミノー',
      result: 'blank',
    })
    expect(params.get('from')).toBe('2026-09-01')
    expect(params.get('species')).toBe('アジ')
    expect(params.get('lure')).toBe('ミノー')
    expect(params.get('result')).toBe('blank')
    expect(params.get('place')).toBeNull()
    expect(historyFiltersFromSearchParams(params)).toEqual({
      species: 'アジ',
      place: '',
      lure: 'ミノー',
      result: 'blank',
    })
    expect(hasActiveHistoryFilters(EMPTY_HISTORY_FILTERS)).toBe(false)
  })
})
