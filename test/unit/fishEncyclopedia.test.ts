import { describe, expect, it } from 'vitest'
import { buildSpeciesStats } from '../../src/lib/fishEncyclopedia'
import { sampleRecord } from './recordFixture'

describe('UNIT-05 魚種図鑑集計', () => {
  it('魚種なしは除外。アジは匹数 2、最大サイズは大きい方', () => {
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
})
