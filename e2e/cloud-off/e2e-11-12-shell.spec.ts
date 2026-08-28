import { expect, test } from '../helpers'

test.describe('E2E-11 / E2E-12 シェルと静的ページ（クラウド無効）', () => {
  test('E2E-11 記録ホームに 3 タブ。公開ページでは出ない', async ({ freshPage: page }) => {
    const nav = page.locator('nav.sticky')
    await expect(nav.getByRole('link', { name: '記録' })).toBeVisible()
    await expect(nav.getByRole('link', { name: '履歴' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'マイページ' })).toBeVisible()

    await page.goto('/guide')
    await expect(page.getByRole('heading', { name: '使い方' })).toBeVisible()
    await expect(page.locator('nav.sticky')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'ログアウト' })).toHaveCount(0)
  })

  test('E2E-12 /guide /privacy /terms 本文。戻る先は /mypage', async ({ freshPage: page }) => {
    await page.goto('/guide')
    await expect(page.getByRole('heading', { name: '使い方' })).toBeVisible()
    await page.getByRole('link', { name: '戻る' }).click()
    await expect(page).toHaveURL(/\/mypage/)

    await page.goto('/privacy')
    await expect(page.getByRole('heading', { name: 'プライバシーポリシー' })).toBeVisible()
    await page.getByRole('link', { name: '戻る' }).click()
    await expect(page).toHaveURL(/\/mypage/)

    await page.goto('/terms')
    await expect(page.getByRole('heading', { name: '利用規約' })).toBeVisible()
    await page.getByRole('link', { name: '戻る' }).click()
    await expect(page).toHaveURL(/\/mypage/)
  })
})
