import { describe, expect, it } from 'vitest'
import { getRecords, invoke, jsonOf, newUserId, statusOf } from './http.js'

describe('INT-02 認証', () => {
  it('INT-02a GET /records ヘッダなしは 401 Unauthorized', async () => {
    const res = await invoke({ method: 'GET', path: '/records' })
    expect(statusOf(res)).toBe(401)
    expect(jsonOf<{ error: string }>(res).error).toBe('Unauthorized')
  })

  it('INT-02b 退会キューに載せた sub で GET /records は 403 Account deleted', async () => {
    const user = newUserId('02b')
    const email = `${user}@example.test`
    expect(
      statusOf(await invoke({ method: 'DELETE', path: '/account', sub: user, email })),
    ).toBe(204)

    const res = await getRecords(user)
    expect(statusOf(res)).toBe(403)
    expect(jsonOf<{ error: string }>(res).error).toBe('Account deleted')
  })

  it('INT-02c 同じ sub で GET /health は 200（403 にしない）', async () => {
    const user = newUserId('02c')
    const email = `${user}@example.test`
    expect(
      statusOf(await invoke({ method: 'DELETE', path: '/account', sub: user, email })),
    ).toBe(204)

    const res = await invoke({ method: 'GET', path: '/health', sub: user })
    expect(statusOf(res)).toBe(200)
    expect(jsonOf<{ ok: boolean }>(res)).toEqual({ ok: true })
  })
})
