import { expect, saveRecord, test, waitForRecordHome } from '../helpers'

test.describe('E2E-08 単位', () => {
  test('体長 25 で保存 → 単位を inch にすると履歴表示が inch。再編集は cm 相当', async ({
    freshPage: page,
  }) => {
    await waitForRecordHome(page)
    await page.getByLabel(/体長/).fill('25')
    await saveRecord(page)
    await page.goto('/mypage')
    await page.getByRole('button', { name: 'inch' }).click()
    await page.goto('/history')
    await expect(page.getByText('9.84 inch').first()).toBeVisible()
    await page.getByText('（魚種なし）').first().click()
    await page.getByRole('button', { name: '編集' }).click()
    const size = page.getByLabel(/体長/)
    const value = Number(await size.inputValue())
    expect(value).toBeCloseTo(25 / 2.54, 1)
  })
})
