import { describe, expect, it } from 'vitest'
import { normalizeEditedFields } from '../../src/lib/editedFields'

describe('UNIT-07 editedFields', () => {
  it('残るのは recordedAt / location のみ', () => {
    expect(
      normalizeEditedFields(['recordedAt', 'location', 'temperature', 'fishSpecies']),
    ).toEqual(['recordedAt', 'location'])
    expect(normalizeEditedFields('recordedAt')).toEqual([])
    expect(normalizeEditedFields(null)).toEqual([])
  })
})
