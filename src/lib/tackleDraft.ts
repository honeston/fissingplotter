import {
  hasTackleContent,
  normalizeTackleFields,
  type TackleFields,
} from '../types/tackle'

const KEEP_KEY = 'fp.keepTackle'
const DRAFT_KEY = 'fp.tackleDraft'

/** 未設定なら true（これまで記録後も入力を残していた挙動に合わせる） */
export function readKeepTackle(): boolean {
  try {
    const raw = localStorage.getItem(KEEP_KEY)
    if (raw == null) return true
    return raw === '1' || raw === 'true'
  } catch {
    return true
  }
}

export function writeKeepTackle(keep: boolean): void {
  localStorage.setItem(KEEP_KEY, keep ? '1' : '0')
}

export function readTackleDraft(): TackleFields | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    return normalizeTackleFields(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

export function writeTackleDraft(fields: TackleFields): void {
  const normalized = normalizeTackleFields(fields)
  if (!normalized || !hasTackleContent(normalized)) {
    localStorage.removeItem(DRAFT_KEY)
    return
  }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(normalized))
}

export function clearTackleDraft(): void {
  localStorage.removeItem(DRAFT_KEY)
}
