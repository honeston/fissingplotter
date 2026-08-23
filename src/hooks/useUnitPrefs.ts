import { useCallback, useSyncExternalStore } from 'react'
import {
  readUnitPrefs,
  UNIT_PREFS_EVENT,
  writeUnitPrefs,
  type LengthUnit,
  type UnitPrefs,
  type WeightUnit,
} from '../lib/units'

function subscribe(onStoreChange: () => void) {
  window.addEventListener(UNIT_PREFS_EVENT, onStoreChange)
  window.addEventListener('storage', onStoreChange)
  return () => {
    window.removeEventListener(UNIT_PREFS_EVENT, onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

export function useUnitPrefs() {
  const prefs = useSyncExternalStore(subscribe, readUnitPrefs, () => ({
    length: 'cm' as LengthUnit,
    weight: 'g' as WeightUnit,
  }))

  const setPrefs = useCallback((next: UnitPrefs) => {
    writeUnitPrefs(next)
  }, [])

  const setLengthUnit = useCallback((length: LengthUnit) => {
    writeUnitPrefs({ ...readUnitPrefs(), length })
  }, [])

  const setWeightUnit = useCallback((weight: WeightUnit) => {
    writeUnitPrefs({ ...readUnitPrefs(), weight })
  }, [])

  return { prefs, setPrefs, setLengthUnit, setWeightUnit }
}
