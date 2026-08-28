import { expect, test } from '../helpers'

test.describe('E2E-01 ランディング', () => {
  test('未ログインの / はランディング。記録フォームは出ない', async ({ freshPage: page }) => {
    await expect(page.getByRole('link', { name: '無料ではじめる' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'ログイン' }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: '記録' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '記録する' })).toHaveCount(0)

    await page.getByRole('link', { name: '無料ではじめる' }).first().click()
    await expect(page).toHaveURL(/\/login\?mode=signup/)
    await page.goto('/')
    await page.getByRole('link', { name: 'ログイン' }).first().click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
