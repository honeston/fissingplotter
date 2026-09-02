import { describe, expect, it } from 'vitest'
import { validateRecord } from '../src/records.js'

function body(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rec-1',
    recordedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

function expectInvalid(input: unknown, message: string) {
  expect(() => validateRecord(input)).toThrow(message)
}

describe('UNIT-12 記録バリデーション', () => {
  it('UNIT-12a id 欠落または空文字は Invalid id', () => {
    expectInvalid({ recordedAt: '2026-08-01T00:00:00.000Z' }, 'Invalid id')
    expectInvalid(body({ id: '' }), 'Invalid id')
  })

  it('UNIT-12b recordedAt 欠落または空文字は Invalid recordedAt', () => {
    expectInvalid({ id: 'rec-1' }, 'Invalid recordedAt')
    expectInvalid(body({ recordedAt: '' }), 'Invalid recordedAt')
  })

  it('UNIT-12c fishSizeCm -1 は Invalid fishSizeCm', () => {
    expectInvalid(body({ fishSizeCm: -1 }), 'Invalid fishSizeCm')
  })

  it('UNIT-12d 緯度だけは Invalid coordinates', () => {
    expectInvalid(body({ latitude: 35.45 }), 'Invalid coordinates')
  })

  it('UNIT-12e fishWeightG -1 は Invalid fishWeightG', () => {
    expectInvalid(body({ fishWeightG: -1 }), 'Invalid fishWeightG')
  })

  it('UNIT-12f 本文がオブジェクトでないは Invalid record body', () => {
    expectInvalid(null, 'Invalid record body')
    expectInvalid('x', 'Invalid record body')
  })

  it('UNIT-12g 緯度が非数値は Invalid latitude', () => {
    expectInvalid(body({ latitude: 'abc', longitude: 139.65 }), 'Invalid latitude')
  })

  it('UNIT-12h fishCount 0 / 小数 / 負は Invalid fishCount', () => {
    expectInvalid(body({ fishCount: 0 }), 'Invalid fishCount')
    expectInvalid(body({ fishCount: 1.5 }), 'Invalid fishCount')
    expectInvalid(body({ fishCount: -1 }), 'Invalid fishCount')
  })

  it('fishCount 3 は通る。空は null', () => {
    expect(validateRecord(body({ fishCount: 3 })).fishCount).toBe(3)
    expect(validateRecord(body()).fishCount).toBeNull()
  })

  it('タックル全空は null（エラーにしない）', () => {
    const record = validateRecord(
      body({
        tackle: { name: '', rod: '', reel: '', line: '', lureOrBait: '', rig: '' },
      }),
    )
    expect(record.tackle).toBeNull()
  })
})
