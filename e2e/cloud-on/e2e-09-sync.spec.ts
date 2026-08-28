import { expect, saveRecord, test } from '../helpers'
import { E2E_API_URL, e2eJwt, openSignedInApp } from '../cloudAuth'

test.describe('E2E-09 クラウド同期', () => {
  test('E2E-09a 記録する → GET /records に 1 件。リロード後も履歴にある', async ({
    browser,
  }) => {
    const { page, context, user } = await openSignedInApp(browser)
    await saveRecord(page)

    const listed = await page.request.get(`${E2E_API_URL}/records`, {
      headers: { Authorization: `Bearer ${e2eJwt(user.sub, user.email)}` },
    })
    expect(listed.status()).toBe(200)
    const body = (await listed.json()) as { records: { id: string }[]; deleted: unknown[] }
    expect(body.records).toHaveLength(1)
    expect(body.deleted).toEqual([])

    await page.reload()
    await page.goto('/history')
    await expect(page.getByText('まだ記録がありません')).toHaveCount(0)
    await expect(page.getByText('（魚種なし）').first()).toBeVisible()
    await context.close()
  })

  test('E2E-09b 履歴から削除 → リロードしても戻らない。GET deleted に id', async ({
    browser,
  }) => {
    const { page, context, user } = await openSignedInApp(browser)
    await saveRecord(page)
    await page.goto('/history')
    await page.getByText('（魚種なし）').first().click()
    await page.getByRole('button', { name: '削除' }).click()
    await page.getByRole('button', { name: '削除する' }).click()
    await expect(page.getByText('削除しました')).toBeVisible()

    await page.reload()
    await expect(page.getByText('まだ記録がありません')).toBeVisible()

    const listed = await page.request.get(`${E2E_API_URL}/records`, {
      headers: { Authorization: `Bearer ${e2eJwt(user.sub, user.email)}` },
    })
    const body = (await listed.json()) as {
      records: { id: string }[]
      deleted: { id: string }[]
    }
    expect(body.records).toEqual([])
    expect(body.deleted).toHaveLength(1)
    expect(body.deleted[0].id).toBeTruthy()
    await context.close()
  })
})
