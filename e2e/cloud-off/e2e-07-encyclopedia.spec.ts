import { expect, saveRecord, test, waitForRecordHome } from '../helpers'

test.describe('E2E-07 魚種図鑑', () => {
  test('E2E-07a 魚種なし記録だけ', async ({ freshPage: page }) => {
    await waitForRecordHome(page)
    await saveRecord(page)
    await page.goto('/mypage/encyclopedia')
    await expect(page.getByRole('heading', { name: 'マイ魚種図鑑' })).toBeVisible()
    await expect(page.getByText('魚種付きの記録がまだありません')).toBeVisible()
  })

  test('E2E-07b アジを保存 → 図鑑カードから詳細', async ({ freshPage: page }) => {
    await waitForRecordHome(page)
    await page.getByLabel('魚種（任意）').fill('アジ')
    await page.keyboard.press('Escape')
    await saveRecord(page)
    await page.goto('/mypage/encyclopedia')
    await expect(page.getByText('アジ').first()).toBeVisible()
    await page.getByRole('link', { name: /アジ/ }).click()
    await expect(page.getByRole('heading', { name: 'アジ' })).toBeVisible()
    await expect(page.getByText('アジ').nth(0)).toBeVisible()
  })
})
