import { expect, test } from '../helpers'

test.describe('E2E-06 マイタックル', () => {
  test('E2E-06a 空の /mypage/tackle', async ({ freshPage: page }) => {
    await page.goto('/mypage/tackle')
    await expect(page.getByText('まだマイタックルがありません')).toBeVisible()
  })

  test('E2E-06b 追加保存。空保存はバリデーション', async ({ freshPage: page }) => {
    await page.goto('/mypage/tackle')
    await page.getByRole('button', { name: '新しいタックルを追加' }).click()
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByText('いずれかの項目を入力してください')).toBeVisible()
    await page.getByLabel('セット名').fill('ライトセット')
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByText('ライトセット')).toBeVisible()
  })

  test('E2E-06c コピー → 削除確認', async ({ freshPage: page }) => {
    await page.goto('/mypage/tackle')
    await page.getByRole('button', { name: '新しいタックルを追加' }).click()
    await page.getByLabel('セット名').fill('メイン')
    await page.getByRole('button', { name: '保存' }).click()
    await page.getByRole('button', { name: 'コピー' }).click()
    await expect(page.getByLabel('セット名')).toHaveValue('メインのコピー')
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByText('メインのコピー')).toBeVisible()
    page.on('dialog', (dialog) => dialog.accept())
    await page.locator('li').filter({ hasText: 'メインのコピー' }).getByRole('button', { name: '削除' }).click()
    await expect(page.getByText('メインのコピー')).toHaveCount(0)
  })
})
