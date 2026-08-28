import { describe, expect, it } from 'vitest'
import { hasCoordinates, sameCoordinates } from '../../src/lib/coordinates'
import { sampleRecord } from './recordFixture'

describe('UNIT-06 座標', () => {
  it('両方ありは可。両方 null は可。片方は不可', () => {
    const both = sampleRecord({
      id: 'both',
      recordedAt: '2026-08-01T00:00:00.000Z',
      latitude: 35.45,
      longitude: 139.65,
    })
    const neither = sampleRecord({
      id: 'neither',
      recordedAt: '2026-08-01T00:00:00.000Z',
    })
    const latOnly = sampleRecord({
      id: 'lat',
      recordedAt: '2026-08-01T00:00:00.000Z',
      latitude: 35.45,
    })

    expect(hasCoordinates(both)).toBe(true)
    expect(hasCoordinates(neither)).toBe(false)
    expect(hasCoordinates(latOnly)).toBe(false)
    expect(sameCoordinates(neither, neither)).toBe(true)
    expect(sameCoordinates(both, latOnly)).toBe(false)
  })
})
