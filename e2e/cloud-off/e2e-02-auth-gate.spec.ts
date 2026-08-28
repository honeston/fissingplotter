import { expect, test, waitForRecordHome } from '../helpers'

test.describe('E2E-02 認証ゲート（クラウド無効）', () => {
  test('E2E-02a /history /mypage が開く（ログインへ飛ばない）', async ({ freshPage: page }) => {
    await waitForRecordHome(page)
    await page.goto('/history')
    await expect(page.getByRole('heading', { name: '履歴' })).toBeVisible()
    await expect(page).toHaveURL(/\/history/)

    await page.goto('/mypage')
    await expect(page.getByRole('heading', { name: 'マイページ' })).toBeVisible()
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('E2E-02c /mypage/email は /mypage へ戻る', async ({ freshPage: page }) => {
    await page.goto('/mypage/email')
    await expect(page).toHaveURL(/\/mypage$/)
    await expect(page.getByRole('heading', { name: 'マイページ' })).toBeVisible()
  })
})
