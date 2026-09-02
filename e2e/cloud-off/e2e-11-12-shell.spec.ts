import { expect, test, waitForRecordHome } from '../helpers'

test.describe('E2E-11 / E2E-12 シェルと静的ページ（クラウド無効）', () => {
  test('E2E-11 記録ホームに 4 タブ。公開ページでは出ない', async ({ freshPage: page }) => {
    await waitForRecordHome(page)
    const nav = page.locator('nav.sticky')
    await expect(nav.getByTestId('nav-record')).toBeVisible()
    await expect(nav.getByTestId('nav-history')).toBeVisible()
    await expect(nav.getByTestId('nav-encyclopedia')).toBeVisible()
    await expect(nav.getByTestId('nav-mypage')).toBeVisible()
    await expect(page.getByTestId('banner-mypage')).toHaveCount(0)

    await nav.getByTestId('nav-encyclopedia').click()
    await expect(page.getByRole('heading', { name: 'マイ魚種図鑑' })).toBeVisible()
    await expect(nav.getByTestId('nav-encyclopedia')).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByTestId('nav-mypage')).not.toHaveAttribute('aria-current', 'page')

    await nav.getByTestId('nav-mypage').click()
    await expect(page.getByRole('heading', { name: 'マイページ' })).toBeVisible()
    await expect(nav.getByTestId('nav-mypage')).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByTestId('nav-encyclopedia')).not.toHaveAttribute('aria-current', 'page')

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
