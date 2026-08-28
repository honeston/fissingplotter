import { describe, expect, it } from 'vitest'
import { weatherCodeLabel } from '../../src/lib/weatherCode'

describe('UNIT-09 天気コード', () => {
  it('空や不明は — 側。既知コードはラベルあり', () => {
    expect(weatherCodeLabel(null)).toBe('—')
    expect(weatherCodeLabel(0)).toBe('晴れ')
    expect(weatherCodeLabel(61)).toBe('弱い雨')
    expect(weatherCodeLabel(12345)).toBe('天気コード12345')
  })
})
