/** タックル／仕掛けの入力項目（いずれも任意） */
export type TackleFields = {
  name: string
  rod: string
  reel: string
  line: string
  lureOrBait: string
  rig: string
}

/** マイタックル（端末に保存するプリセット） */
export type MyTackle = TackleFields & {
  id: string
  updatedAt: string
}

export const EMPTY_TACKLE_FIELDS: TackleFields = {
  name: '',
  rod: '',
  reel: '',
  line: '',
  lureOrBait: '',
  rig: '',
}

export function normalizeTackleFields(value: unknown): TackleFields | null {
  if (value == null) return null
  if (typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const fields: TackleFields = {
    name: typeof v.name === 'string' ? v.name.trim() : '',
    rod: typeof v.rod === 'string' ? v.rod.trim() : '',
    reel: typeof v.reel === 'string' ? v.reel.trim() : '',
    line: typeof v.line === 'string' ? v.line.trim() : '',
    lureOrBait: typeof v.lureOrBait === 'string' ? v.lureOrBait.trim() : '',
    rig: typeof v.rig === 'string' ? v.rig.trim() : '',
  }
  return hasTackleContent(fields) ? fields : null
}

export function hasTackleContent(fields: TackleFields | null | undefined): boolean {
  if (!fields) return false
  return Boolean(
    fields.name ||
      fields.rod ||
      fields.reel ||
      fields.line ||
      fields.lureOrBait ||
      fields.rig,
  )
}

export function tackleFromMyTackle(tackle: MyTackle): TackleFields {
  return {
    name: tackle.name,
    rod: tackle.rod,
    reel: tackle.reel,
    line: tackle.line,
    lureOrBait: tackle.lureOrBait,
    rig: tackle.rig,
  }
}
