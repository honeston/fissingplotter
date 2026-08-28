import { describe, expect, it } from 'vitest'
import { clusterRecordsByZoom } from '../../src/lib/clusterRecords'
import type { MappableRecord } from '../../src/lib/coordinates'
import { sampleRecord } from './recordFixture'

function mapped(
  id: string,
  recordedAt: string,
  latitude: number,
  longitude: number,
): MappableRecord {
  return sampleRecord({ id, recordedAt, latitude, longitude }) as MappableRecord
}

describe('UNIT-10 地点グループ', () => {
  it('同一座標 2 件は同一グループ。離れた 1 件は別', () => {
    const clusters = clusterRecordsByZoom(
      [
        mapped('a', '2026-08-01T00:00:00.000Z', 35.45, 139.65),
        mapped('b', '2026-08-02T00:00:00.000Z', 35.45, 139.65),
        mapped('c', '2026-08-03T00:00:00.000Z', 43.06, 141.35),
      ],
      12,
    )

    expect(clusters).toHaveLength(2)
    const sizes = clusters.map((c) => c.records.length).sort()
    expect(sizes).toEqual([1, 2])
    const pair = clusters.find((c) => c.records.length === 2)
    expect(pair?.records.map((r) => r.id).sort()).toEqual(['a', 'b'])
  })
})
