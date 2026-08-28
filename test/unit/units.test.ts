import { describe, expect, it } from 'vitest'
import {
  cmToLength,
  DEFAULT_UNIT_PREFS,
  formatFishSize,
  formatFishWeight,
  gToWeight,
  lengthToCm,
  parseSizeToCm,
  parseWeightToG,
  weightToG,
} from '../../src/lib/units'

describe('UNIT-04 単位変換', () => {
  it('UNIT-04a 25 cm / 180 g の表示と逆変換。未設定は cm / g', () => {
    expect(DEFAULT_UNIT_PREFS).toEqual({ length: 'cm', weight: 'g' })
    expect(formatFishSize(25, 'cm')).toMatch(/cm$/)
    expect(formatFishSize(25, 'in')).toMatch(/inch$/)
    expect(formatFishWeight(180, 'g')).toMatch(/g$/)
    expect(formatFishWeight(180, 'kg')).toMatch(/kg$/)
    expect(formatFishWeight(180, 'oz')).toMatch(/oz$/)

    expect(lengthToCm(cmToLength(25, 'in'), 'in')).toBeCloseTo(25, 10)
    expect(weightToG(gToWeight(180, 'kg'), 'kg')).toBeCloseTo(180, 10)
    expect(weightToG(gToWeight(180, 'oz'), 'oz')).toBeCloseTo(180, 10)
  })

  it('UNIT-04b 空文字は保存値 null', () => {
    expect(parseSizeToCm('', 'cm')).toBeNull()
    expect(parseSizeToCm('   ', 'in')).toBeNull()
    expect(parseWeightToG('', 'g')).toBeNull()
    expect(parseWeightToG('  ', 'kg')).toBeNull()
  })

  it('UNIT-04c 負数・非数値は無効。cm / g にしない', () => {
    expect(parseSizeToCm('-1', 'cm')).toBe('invalid')
    expect(parseSizeToCm('abc', 'cm')).toBe('invalid')
    expect(parseWeightToG('-1', 'g')).toBe('invalid')
    expect(parseWeightToG('abc', 'g')).toBe('invalid')
  })
})
