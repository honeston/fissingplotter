import type { MyTackle, TackleFields } from '../types/tackle'
import { hasTackleContent, normalizeTackleFields } from '../types/tackle'
import {
  deleteMyTackle as deleteStoredTackle,
  getMyTackle as getStoredTackle,
  listMyTackles as listStoredTackles,
  putMyTackle as putStoredTackle,
} from './storage'

export const MY_TACKLE_EVENT = 'fp-my-tackles'

function notify() {
  window.dispatchEvent(new Event(MY_TACKLE_EVENT))
}

export async function listMyTackles(): Promise<MyTackle[]> {
  return listStoredTackles()
}

export async function getMyTackle(id: string): Promise<MyTackle | undefined> {
  return getStoredTackle(id)
}

export async function saveMyTackle(
  fields: TackleFields,
  existingId?: string,
): Promise<MyTackle> {
  const normalized = normalizeTackleFields(fields)
  if (!normalized || !hasTackleContent(normalized)) {
    throw new Error('タックルの内容を入力してください')
  }
  const tackle: MyTackle = {
    ...normalized,
    id: existingId ?? crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  }
  const saved = await putStoredTackle(tackle)
  notify()
  return saved
}

export async function removeMyTackle(id: string): Promise<void> {
  await deleteStoredTackle(id)
  notify()
}
