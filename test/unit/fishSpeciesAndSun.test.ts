import { describe, expect, it } from 'vitest'
import { canonicalFishSpeciesName, searchFishSpecies } from '../../src/lib/fishSpecies'
import { getSunTimes } from '../../src/lib/sun'

describe('魚種名の正規化（代表）', () => {
  it('ひらがな検索で標準和名に届き、別名は正規名へ寄せる', () => {
    const hits = searchFishSpecies('あじ')
    expect(hits.some((h) => h.name === 'マアジ' || h.name === 'アジ')).toBe(true)
    expect(canonicalFishSpeciesName('アジ')).toBe('アジ')
    expect(canonicalFishSpeciesName('')).toBe('')
  })
})

describe('日出没', () => {
  it('座標と日付が揃えば値が返り、欠けた入力では null', () => {
    const times = getSunTimes(new Date('2026-08-01T03:00:00.000Z'), 35.45, 139.65)
    expect(times).not.toBeNull()
    expect(times?.dawnAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(times?.sunriseAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(times?.sunsetAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(times?.duskAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(getSunTimes(new Date('2026-08-01T03:00:00.000Z'), Number.NaN, 139.65)).toBeNull()
  })
})
