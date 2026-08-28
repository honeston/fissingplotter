import { describe, expect, it } from 'vitest'
import { invoke, jsonOf, newUserId, statusOf } from './http.js'

describe('INT-01 health', () => {
  it('認証なし GET /health は 200 { ok: true }', async () => {
    const res = await invoke({ method: 'GET', path: '/health' })
    expect(statusOf(res)).toBe(200)
    expect(jsonOf<{ ok: boolean }>(res)).toEqual({ ok: true })
  })

  it('OPTIONS /health は 204', async () => {
    const res = await invoke({ method: 'OPTIONS', path: '/health' })
    expect(statusOf(res)).toBe(204)
  })
})

describe('INT-10 不明パス', () => {
  it('GET /no-such-route は 404 Not found', async () => {
    const res = await invoke({ method: 'GET', path: '/no-such-route', sub: newUserId('10') })
    expect(statusOf(res)).toBe(404)
    expect(jsonOf<{ error: string }>(res).error).toBe('Not found')
  })
})
