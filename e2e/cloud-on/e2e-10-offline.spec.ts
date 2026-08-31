import { expect, test } from '../helpers'
import { openSignedInApp } from '../cloudAuth'

test.describe('E2E-10 オフライン', () => {
  test('E2E-10a offline で記録する: 端末に残る', async ({ browser }) => {
    const { page, context } = await openSignedInApp(browser)
    await context.setOffline(true)
    await page.getByTestId('record-submit').click()
    await expect(page.getByTestId('record-saved')).toBeVisible({ timeout: 20_000 })
    await context.setOffline(false)
    await page.goto('/history')
    await expect(page.getByText('（魚種なし）').first()).toBeVisible()
    await context.close()
  })

  test('E2E-10b offline で削除 → オンラインで履歴に戻らない', async ({ browser }) => {
    const { page, context } = await openSignedInApp(browser)
    await page.getByTestId('record-submit').click()
    await expect(page.getByTestId('record-saved')).toBeVisible({ timeout: 20_000 })
    await page.goto('/history')
    await page.getByText('（魚種なし）').first().click()
    await context.setOffline(true)
    await page.getByRole('button', { name: '削除' }).click()
    await page.getByRole('button', { name: '削除する' }).click()
    await expect(page.getByText('削除しました')).toBeVisible()
    await context.setOffline(false)
    await page.reload()
    await expect(page.getByText('まだ記録がありません')).toBeVisible()
    await context.close()
  })
})
