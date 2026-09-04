/** ルアー／エサの入力モード（表示ラベル用。値は lureOrBait に入れる） */
export type LureOrBaitKind = 'lure' | 'bait'

/** タックル／仕掛けの入力項目（いずれも任意） */
export type TackleFields = {
  name: string
  rod: string
  reel: string
  line: string
  lureOrBaitKind: LureOrBaitKind
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
  lureOrBaitKind: 'lure',
  lureOrBait: '',
  rig: '',
}

export function parseLureOrBaitKind(value: unknown): LureOrBaitKind {
  return value === 'bait' ? 'bait' : 'lure'
}

export function lureOrBaitFieldLabel(kind: LureOrBaitKind): string {
  return kind === 'bait' ? 'エサ' : 'ルアー'
}

export function lureOrBaitFieldPlaceholder(kind: LureOrBaitKind): string {
  return kind === 'bait' ? '例: アオイソメ' : '例: ミノー'
}

export function rigFieldPlaceholder(kind: LureOrBaitKind): string {
  return kind === 'bait' ? '例: サビキ / ウキ釣り / 胴突き' : '例: フロロリーダー 8lb'
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
    lureOrBaitKind: parseLureOrBaitKind(v.lureOrBaitKind),
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
    lureOrBaitKind: tackle.lureOrBaitKind,
    lureOrBait: tackle.lureOrBait,
    rig: tackle.rig,
  }
}
