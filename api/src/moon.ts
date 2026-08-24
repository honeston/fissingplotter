/** 簡易月齢・潮種（海しる潮位 API は月情報を返さないため内製） */

const SYNODIC_DAYS = 29.530588853
/** 既知の朔（UTC）付近 — 十分な精度の近似 */
const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14)

export function moonAgeDays(at: Date): number {
  const days = (at.getTime() - KNOWN_NEW_MOON_MS) / 86_400_000
  const age = ((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS
  return Math.round(age * 10) / 10
}

/** 朔望からの距離で潮種をざっくり分類 */
export function tideCycleFromMoonAge(age: number): string {
  const fromNew = Math.min(age, SYNODIC_DAYS - age)
  const fromFull = Math.abs(age - SYNODIC_DAYS / 2)
  const fromSpring = Math.min(fromNew, fromFull)
  if (fromSpring < 1.5) return '大潮'
  if (fromSpring < 3.5) return '中潮'
  if (fromSpring < 5.5) return '小潮'
  if (fromSpring < 6.5) return '長潮'
  return '若潮'
}

export function moonPhaseFromAge(age: number): string {
  if (age < 1.5 || age >= 28) return '新月'
  if (age < 5) return '三日月'
  if (age < 9) return '上弦'
  if (age < 13) return '十三夜'
  if (age < 16) return '満月'
  if (age < 20) return '居待月'
  if (age < 23) return '下弦'
  if (age < 26) return '二十六夜'
  return '晦'
}
