import { describe, expect, it } from 'vitest'
import { invoke, jsonOf, newUserId, statusOf } from './http.js'

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xd9])

describe('INT-06 写真', () => {
  it('INT-06a POST /photos/presign: photoKey は {sub}/{recordId}.jpg、expiresIn 900', async () => {
    const user = newUserId('06a')
    const recordId = crypto.randomUUID()
    const res = await invoke({
      method: 'POST',
      path: '/photos/presign',
      sub: user,
      body: { recordId },
    })
    expect(statusOf(res)).toBe(200)
    const body = jsonOf<{ photoKey: string; expiresIn: number; uploadUrl: string }>(res)
    expect(body.photoKey).toBe(`${user}/${recordId}.jpg`)
    expect(body.expiresIn).toBe(900)
    expect(body.uploadUrl).toMatch(/^https?:\/\//)
  })

  it('INT-06b uploadUrl に JPEG PUT → viewUrl GET で画像が取れる', async () => {
    const user = newUserId('06b')
    const recordId = crypto.randomUUID()
    const presign = jsonOf<{ uploadUrl: string }>(
      await invoke({
        method: 'POST',
        path: '/photos/presign',
        sub: user,
        body: { recordId },
      }),
    )
    const put = await fetch(presign.uploadUrl, {
      method: 'PUT',
      body: JPEG,
      headers: { 'Content-Type': 'image/jpeg' },
    })
    expect(put.status).toBe(200)

    const viewRes = await invoke({
      method: 'GET',
      path: `/photos/${recordId}/url`,
      sub: user,
    })
    expect(statusOf(viewRes)).toBe(200)
    const { viewUrl } = jsonOf<{ viewUrl: string }>(viewRes)
    const got = await fetch(viewUrl)
    expect(got.status).toBe(200)
    expect(Buffer.from(await got.arrayBuffer()).equals(JPEG)).toBe(true)
  })

  it('INT-06c recordId 欠落は 400 Invalid recordId または Missing body', async () => {
    const missingBody = await invoke({
      method: 'POST',
      path: '/photos/presign',
      sub: newUserId('06c-body'),
    })
    expect(statusOf(missingBody)).toBe(400)
    expect(jsonOf<{ error: string }>(missingBody).error).toBe('Missing body')

    const missingId = await invoke({
      method: 'POST',
      path: '/photos/presign',
      sub: newUserId('06c-id'),
      body: {},
    })
    expect(statusOf(missingId)).toBe(400)
    expect(jsonOf<{ error: string }>(missingId).error).toBe('Invalid recordId')
  })

  it('INT-06d 未アップロードでも viewUrl は返す。S3 GET は 404 でよい', async () => {
    const user = newUserId('06d')
    const recordId = crypto.randomUUID()
    const res = await invoke({
      method: 'GET',
      path: `/photos/${recordId}/url`,
      sub: user,
    })
    expect(statusOf(res)).toBe(200)
    const { viewUrl } = jsonOf<{ viewUrl: string }>(res)
    expect(viewUrl).toMatch(/^https?:\/\//)
    const got = await fetch(viewUrl)
    expect(got.status).toBe(404)
  })
})
