const STORAGE_KEY = 'fp.unitPrefs'
export const UNIT_PREFS_EVENT = 'fp-unit-prefs'

export type LengthUnit = 'cm' | 'in'
export type WeightUnit = 'g' | 'kg' | 'oz'

export type UnitPrefs = {
  length: LengthUnit
  weight: WeightUnit
}

export const DEFAULT_UNIT_PREFS: UnitPrefs = {
  length: 'cm',
  weight: 'g',
}

const CM_PER_INCH = 2.54
const G_PER_KG = 1000
const G_PER_OZ = 28.349523125

function isLengthUnit(value: unknown): value is LengthUnit {
  return value === 'cm' || value === 'in'
}

function isWeightUnit(value: unknown): value is WeightUnit {
  return value === 'g' || value === 'kg' || value === 'oz'
}

/** useSyncExternalStore 用に、値が同じなら同一参照を返す */
let cachedPrefs: UnitPrefs = DEFAULT_UNIT_PREFS

function prefsEqual(a: UnitPrefs, b: UnitPrefs): boolean {
  return a.length === b.length && a.weight === b.weight
}

export function readUnitPrefs(): UnitPrefs {
  let next: UnitPrefs = DEFAULT_UNIT_PREFS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UnitPrefs>
      next = {
        length: isLengthUnit(parsed.length) ? parsed.length : DEFAULT_UNIT_PREFS.length,
        weight: isWeightUnit(parsed.weight) ? parsed.weight : DEFAULT_UNIT_PREFS.weight,
      }
    }
  } catch {
    next = DEFAULT_UNIT_PREFS
  }

  if (prefsEqual(cachedPrefs, next)) return cachedPrefs
  cachedPrefs = next
  return cachedPrefs
}

export function writeUnitPrefs(prefs: UnitPrefs): void {
  const next = { length: prefs.length, weight: prefs.weight }
  if (!prefsEqual(cachedPrefs, next)) {
    cachedPrefs = next
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(UNIT_PREFS_EVENT))
}

export function lengthUnitLabel(unit: LengthUnit): string {
  return unit === 'cm' ? 'cm' : 'inch'
}

export function weightUnitLabel(unit: WeightUnit): string {
  if (unit === 'kg') return 'kg'
  if (unit === 'oz') return 'oz'
  return 'g'
}

export function cmToLength(cm: number, unit: LengthUnit): number {
  return unit === 'in' ? cm / CM_PER_INCH : cm
}

export function lengthToCm(value: number, unit: LengthUnit): number {
  return unit === 'in' ? value * CM_PER_INCH : value
}

export function gToWeight(g: number, unit: WeightUnit): number {
  if (unit === 'kg') return g / G_PER_KG
  if (unit === 'oz') return g / G_PER_OZ
  return g
}

export function weightToG(value: number, unit: WeightUnit): number {
  if (unit === 'kg') return value * G_PER_KG
  if (unit === 'oz') return value * G_PER_OZ
  return value
}

function trimNumber(value: number, digits: number): string {
  const fixed = value.toFixed(digits)
  return fixed.replace(/\.?0+$/, '')
}

export function formatFishSize(cm: number | null, unit: LengthUnit): string {
  if (cm == null) return '—'
  const value = cmToLength(cm, unit)
  const text = unit === 'in' ? trimNumber(value, 2) : trimNumber(value, 1)
  return `${text} ${lengthUnitLabel(unit)}`
}

export function formatFishWeight(g: number | null, unit: WeightUnit): string {
  if (g == null) return '—'
  const value = gToWeight(g, unit)
  const text =
    unit === 'kg' ? trimNumber(value, 3) : unit === 'oz' ? trimNumber(value, 2) : trimNumber(value, 0)
  return `${text} ${weightUnitLabel(unit)}`
}

/** 入力欄用（単位ラベルなし） */
export function sizeToInputString(cm: number, unit: LengthUnit): string {
  const value = cmToLength(cm, unit)
  return unit === 'in' ? trimNumber(value, 2) : trimNumber(value, 1)
}

export function weightToInputString(g: number, unit: WeightUnit): string {
  const value = gToWeight(g, unit)
  if (unit === 'kg') return trimNumber(value, 3)
  if (unit === 'oz') return trimNumber(value, 2)
  return trimNumber(value, 0)
}

export function parseSizeToCm(raw: string, unit: LengthUnit): number | null | 'invalid' {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return 'invalid'
  return lengthToCm(n, unit)
}

export function parseWeightToG(raw: string, unit: WeightUnit): number | null | 'invalid' {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return 'invalid'
  return weightToG(n, unit)
}

export function sizeInputStep(unit: LengthUnit): string {
  return unit === 'in' ? '0.1' : '0.1'
}

export function weightInputStep(unit: WeightUnit): string {
  if (unit === 'kg') return '0.001'
  if (unit === 'oz') return '0.1'
  return '1'
}

export function sizePlaceholder(unit: LengthUnit): string {
  return unit === 'in' ? '例: 10' : '例: 25'
}

export function weightPlaceholder(unit: WeightUnit): string {
  if (unit === 'kg') return '例: 0.35'
  if (unit === 'oz') return '例: 12'
  return '例: 350'
}
