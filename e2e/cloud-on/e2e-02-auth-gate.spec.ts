import { expect, test } from '../helpers'

test.describe('E2E-02 認証ゲート（クラウド有効・未ログイン）', () => {
  test('E2E-02b /history は /login', async ({ freshPage: page }) => {
    await page.goto('/history')
    await expect(page).toHaveURL(/\/login/)
  })
})
