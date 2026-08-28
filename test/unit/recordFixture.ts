import type { FishingRecord } from '../../src/types/record'

export function sampleRecord(
  overrides: Partial<FishingRecord> & Pick<FishingRecord, 'id' | 'recordedAt'>,
): FishingRecord {
  return {
    latitude: null,
    longitude: null,
    locationName: null,
    temperature: null,
    weatherCode: null,
    windSpeedMs: null,
    dawnAt: null,
    sunriseAt: null,
    sunsetAt: null,
    duskAt: null,
    tideLevel: null,
    tideHarbor: null,
    tideCycle: null,
    moonPhase: null,
    moonAge: null,
    tideSlopeCmPerHour: null,
    fishSpecies: null,
    fishSizeCm: null,
    fishWeightG: null,
    tackle: null,
    photoKey: null,
    editedFields: [],
    ...overrides,
  }
}
