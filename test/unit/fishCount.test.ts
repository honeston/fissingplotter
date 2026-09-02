import { describe, expect, it } from 'vitest'
import {
  catchCountOf,
  formatFishCount,
  parseFishCount,
} from '../../src/lib/fishCount'

describe('匹数', () => {
  it('空は null。1 以上の整数だけ通る', () => {
    expect(parseFishCount('')).toBeNull()
    expect(parseFishCount('  ')).toBeNull()
    expect(parseFishCount('1')).toBe(1)
    expect(parseFishCount('3')).toBe(3)
    expect(parseFishCount('0')).toBe('invalid')
    expect(parseFishCount('-1')).toBe('invalid')
    expect(parseFishCount('1.5')).toBe('invalid')
    expect(parseFishCount('abc')).toBe('invalid')
    expect(parseFishCount('01')).toBe('invalid')
  })

  it('未入力・旧記録は 1 匹として数える', () => {
    expect(catchCountOf({})).toBe(1)
    expect(catchCountOf({ fishCount: null })).toBe(1)
    expect(catchCountOf({ fishCount: 3 })).toBe(3)
    expect(formatFishCount(null)).toBe('—')
    expect(formatFishCount(3)).toBe('3匹')
  })
})
