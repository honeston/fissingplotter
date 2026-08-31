import { describe, expect, it } from 'vitest'
import { buildSpeciesStats, pickCoverRecord } from '../../src/lib/fishEncyclopedia'
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
})
