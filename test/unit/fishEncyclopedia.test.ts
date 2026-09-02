import { describe, expect, it } from 'vitest'
import {
  buildSpeciesStats,
  encyclopediaTotals,
  filterSpeciesStats,
  pickCoverRecord,
} from '../../src/lib/fishEncyclopedia'
import { recordDateKey } from '../../src/lib/dates'
import { sampleRecord } from './recordFixture'

describe('UNIT-05 魚種図鑑集計', () => {
  it('UNIT-05a 魚種なしは除外。アジは匹数 2、最大サイズは大きい方', () => {
    const stats = buildSpeciesStats([
      sampleRecord({
        id: 'a1',
        recordedAt: '2026-08-01T00:00:00.000Z',
        fishSpecies: 'アジ',
        fishSizeCm: 20,
        fishWeightG: 80,
      }),
      sampleRecord({
        id: 'a2',
        recordedAt: '2026-08-02T00:00:00.000Z',
        fishSpecies: 'アジ',
        fishSizeCm: 28,
        fishWeightG: 120,
      }),
      sampleRecord({
        id: 'none',
        recordedAt: '2026-08-03T00:00:00.000Z',
        fishSpecies: null,
        fishSizeCm: 99,
      }),
    ])

    expect(stats).toHaveLength(1)
    expect(stats[0].species).toBe('アジ')
    expect(stats[0].count).toBe(2)
    expect(stats[0].maxSizeCm).toBe(28)
    expect(stats[0].maxWeightG).toBe(120)
    expect(stats[0].bestCatchDateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('UNIT-05b 代表画像は写真付きのうち最大サイズ。なければ新しい方', () => {
    const smallWithPhoto = sampleRecord({
      id: 'small',
      recordedAt: '2026-08-01T00:00:00.000Z',
      fishSpecies: 'アジ',
      fishSizeCm: 20,
      photoKey: 'user/small.jpg',
    })
    const largeNoPhoto = sampleRecord({
      id: 'large',
      recordedAt: '2026-08-02T00:00:00.000Z',
      fishSpecies: 'アジ',
      fishSizeCm: 28,
    })
    const localBlob = sampleRecord({
      id: 'blob',
      recordedAt: '2026-08-03T00:00:00.000Z',
      fishSpecies: 'アジ',
      fishSizeCm: 24,
    })
    const newerSameSize = sampleRecord({
      id: 'newer',
      recordedAt: '2026-08-04T00:00:00.000Z',
      fishSpecies: 'アジ',
      fishSizeCm: 24,
      photoKey: 'user/newer.jpg',
    })

    expect(pickCoverRecord([smallWithPhoto, largeNoPhoto], new Set())).toBe(smallWithPhoto)
    expect(pickCoverRecord([smallWithPhoto, localBlob], new Set(['blob']))).toBe(localBlob)
    expect(pickCoverRecord([localBlob, newerSameSize], new Set(['blob']))).toBe(newerSameSize)
    expect(pickCoverRecord([largeNoPhoto], new Set())).toBeNull()
  })

  it('UNIT-05c 魚種合計と釣果合計。魚種なしは含めない', () => {
    const stats = buildSpeciesStats([
      sampleRecord({ id: 'a1', fishSpecies: 'アジ' }),
      sampleRecord({ id: 'a2', fishSpecies: 'アジ' }),
      sampleRecord({ id: 'm1', fishSpecies: 'メバル' }),
      sampleRecord({ id: 'none', fishSpecies: null }),
    ])

    expect(encyclopediaTotals(stats)).toEqual({ speciesCount: 2, catchCount: 3 })
  })

  it('UNIT-05d 検索はひらがな・別名にヒット。合計は絞り込み前', () => {
    const stats = buildSpeciesStats([
      sampleRecord({ id: 'a1', fishSpecies: 'アジ' }),
      sampleRecord({ id: 's1', fishSpecies: 'スズキ' }),
      sampleRecord({ id: 'm1', fishSpecies: 'メバル' }),
    ])

    expect(filterSpeciesStats(stats, '').map((s) => s.species)).toEqual(
      expect.arrayContaining(['アジ', 'スズキ', 'メバル']),
    )
    expect(filterSpeciesStats(stats, '')).toHaveLength(3)
    expect(filterSpeciesStats(stats, 'あじ').map((s) => s.species)).toEqual(['アジ'])
    expect(filterSpeciesStats(stats, 'シーバス').map((s) => s.species)).toEqual(['スズキ'])
    expect(filterSpeciesStats(stats, '  アジ  ').map((s) => s.species)).toEqual(['アジ'])
    expect(filterSpeciesStats(stats, 'いない魚')).toEqual([])
    expect(encyclopediaTotals(stats)).toEqual({ speciesCount: 3, catchCount: 3 })
  })

  it('UNIT-05e 匹数は fishCount の合計。未入力は 1。最大釣果日は多い日', () => {
    const many = sampleRecord({
      id: 'a1',
      recordedAt: '2026-08-01T00:00:00.000Z',
      fishSpecies: 'アジ',
      fishCount: 3,
    })
    const one = sampleRecord({
      id: 'a2',
      recordedAt: '2026-08-02T00:00:00.000Z',
      fishSpecies: 'アジ',
    })
    const stats = buildSpeciesStats([many, one])

    expect(stats).toHaveLength(1)
    expect(stats[0].count).toBe(4)
    expect(stats[0].bestCatchCount).toBe(3)
    expect(stats[0].bestCatchDateKey).toBe(recordDateKey(many))
    expect(encyclopediaTotals(stats)).toEqual({ speciesCount: 1, catchCount: 4 })
  })
})
