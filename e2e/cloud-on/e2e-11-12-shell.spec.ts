import { expect, test } from '../helpers'
import { openSignedInApp } from '../cloudAuth'

test.describe('E2E-11 / E2E-12 シェルと静的ページ（クラウド有効）', () => {
  test('E2E-11a ログイン相当で / にバナーと 3 タブ。記録タブアクティブ', async ({
    browser,
  }) => {
    const { page, context, user } = await openSignedInApp(browser)
    await expect(page.getByText(`${user.email} でログイン中`)).toBeVisible()
    const nav = page.locator('nav.sticky')
    await expect(nav.getByRole('link', { name: '記録' })).toBeVisible()
    await expect(nav.getByRole('link', { name: '履歴' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'マイページ' })).toBeVisible()
    await expect(nav.getByRole('link', { name: '記録' })).toHaveClass(/text-cyan-800/)
    await context.close()
  })

  test('E2E-11b /guide はバナー・ナビなし', async ({ browser }) => {
    const { page, context } = await openSignedInApp(browser)
    await page.goto('/guide')
    await expect(page.getByRole('heading', { name: '使い方' })).toBeVisible()
    await expect(page.locator('nav.sticky')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'ログアウト' })).toHaveCount(0)
    await context.close()
  })

  test('E2E-12 未ログインの戻るは /', async ({ freshPage: page }) => {
    for (const [path, heading] of [
      ['/guide', '使い方'],
      ['/privacy', 'プライバシーポリシー'],
      ['/terms', '利用規約'],
    ] as const) {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
      await page.getByRole('link', { name: '戻る' }).click()
      await expect(page).toHaveURL(/\/$/)
      await expect(page.getByRole('link', { name: '無料ではじめる' }).first()).toBeVisible()
    }
  })
})
