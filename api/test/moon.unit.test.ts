import { describe, expect, it } from 'vitest'
import { moonAgeDays, moonPhaseFromAge, tideCycleFromMoonAge } from '../src/moon.js'

const TIDE_CYCLES = ['大潮', '中潮', '小潮', '長潮', '若潮'] as const

describe('UNIT-01 月齢', () => {
  it('既知の朔付近は小さく、0〜29.5 程度に収まる', () => {
    const newMoon = new Date(Date.UTC(2000, 0, 6, 18, 14))
    const age = moonAgeDays(newMoon)
    expect(age).toBeGreaterThanOrEqual(0)
    expect(age).toBeLessThan(1.5)
    expect(age).toBeLessThanOrEqual(29.5)

    const later = moonAgeDays(new Date(Date.UTC(2026, 7, 28, 0, 0)))
    expect(later).toBeGreaterThanOrEqual(0)
    expect(later).toBeLessThanOrEqual(29.5)
  })
})

describe('UNIT-02 潮種', () => {
  it('朔・望付近は大潮。代表月齢は仕様の潮種のいずれか', () => {
    expect(tideCycleFromMoonAge(0)).toBe('大潮')
    expect(tideCycleFromMoonAge(14)).toBe('大潮')
    expect(TIDE_CYCLES).toContain(tideCycleFromMoonAge(7))
    expect(TIDE_CYCLES).toContain(tideCycleFromMoonAge(22))
  })
})

describe('UNIT-03 月相', () => {
  it('新月〜晦のラベルが月齢で切り替わる', () => {
    expect(moonPhaseFromAge(0)).toBe('新月')
    expect(moonPhaseFromAge(7)).toBe('上弦')
    expect(moonPhaseFromAge(14)).toBe('満月')
    expect(moonPhaseFromAge(22)).toBe('下弦')
    expect(moonPhaseFromAge(28.5)).toBe('新月')
    expect(moonPhaseFromAge(26)).toBe('晦')
  })
})
