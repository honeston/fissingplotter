import { expect, saveRecord, test, waitForRecordHome } from '../helpers'

test.describe('E2E-03 記録保存', () => {
  test('E2E-03a 入力なしで記録する: 保存サマリー。履歴に 1 件', async ({ freshPage: page }) => {
    await waitForRecordHome(page)
    await saveRecord(page)
    await page.getByTestId('view-history').first().click()
    await expect(page.getByRole('heading', { name: '履歴' })).toBeVisible()
    await expect(page.getByText('まだ記録がありません')).toHaveCount(0)
    await expect(page.getByText('（魚種なし）').first()).toBeVisible()
  })

  test('E2E-03b 魚種・体長を入れて保存。続けて記録でクリア', async ({ freshPage: page }) => {
    await waitForRecordHome(page)
    await page.getByLabel('魚種（任意）').fill('アジ')
    await page.keyboard.press('Escape')
    await page.getByLabel(/体長/).fill('25')
    await saveRecord(page)
    await expect(page.getByText('アジ').first()).toBeVisible()
    await page.getByTestId('record-continue').click()
    await expect(page.getByLabel('魚種（任意）')).toHaveValue('')
    await expect(page.getByLabel(/体長/)).toHaveValue('')
  })

  test('E2E-03c 体長に -1: エラーで未保存', async ({ freshPage: page }) => {
    await waitForRecordHome(page)
    await page.getByLabel(/体長/).fill('-1')
    await page.getByTestId('record-submit').click()
    await expect(page.getByText('体長は 0 以上の数値で入力してください')).toBeVisible()
    await expect(page.getByText('保存しました')).toHaveCount(0)
    await page.goto('/history')
    await expect(page.getByRole('heading', { name: '履歴' })).toBeVisible()
    await expect(page.getByText('まだ記録がありません')).toBeVisible()
  })

  test('E2E-03e 魚種・匹数 3 で保存。続けて記録でクリア', async ({ freshPage: page }) => {
    await waitForRecordHome(page)
    await page.getByLabel('魚種（任意）').fill('アジ')
    await page.keyboard.press('Escape')
    await page.getByLabel('匹数').fill('3')
    await saveRecord(page)
    await expect(page.getByTestId('record-saved')).toContainText('3匹')
    await page.getByTestId('record-continue').click()
    await expect(page.getByLabel('匹数')).toHaveValue('')
  })

  test('E2E-03f 匹数に 0: エラーで未保存', async ({ freshPage: page }) => {
    await waitForRecordHome(page)
    await page.getByLabel('匹数').fill('0')
    await page.getByTestId('record-submit').click()
    await expect(page.getByText('匹数は 1 以上の整数で入力してください')).toBeVisible()
    await expect(page.getByText('保存しました')).toHaveCount(0)
    await page.goto('/history')
    await expect(page.getByRole('heading', { name: '履歴' })).toBeVisible()
    await expect(page.getByText('まだ記録がありません')).toBeVisible()
  })

  test('E2E-03d geolocation 失敗でも保存される', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
      isMobile: true,
      hasTouch: true,
      permissions: [],
      serviceWorkers: 'block',
    })
    const page = await context.newPage()
    await page.goto('/')
    await waitForRecordHome(page)
    await saveRecord(page)
    await context.close()
  })
})
