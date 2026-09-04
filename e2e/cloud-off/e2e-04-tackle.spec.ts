import { expect, saveRecord, test, waitForRecordHome } from '../helpers'

test.describe('E2E-04 記録タックル', () => {
  test('E2E-04a ロッドだけ入力・次回も使う ON: 保存後もタックルが残る', async ({
    freshPage: page,
  }) => {
    await waitForRecordHome(page)
    await page.getByRole('button', { name: 'タックル入力を開く' }).click()
    await page.getByLabel('ロッド').fill('8ft ML')
    await page.keyboard.press('Escape')
    await expect(page.getByLabel('次回もこのタックルを使う')).toBeChecked()
    await saveRecord(page)
    await page.getByRole('button', { name: 'タックル入力を開く' }).click()
    await expect(page.getByLabel('ロッド')).toHaveValue('8ft ML')
  })

  test('E2E-04b 次回も使う OFF: 保存後タックルは空', async ({ freshPage: page }) => {
    await waitForRecordHome(page)
    await page.getByRole('button', { name: 'タックル入力を開く' }).click()
    await page.getByLabel('ロッド').fill('7ft')
    await page.keyboard.press('Escape')
    await page.getByLabel('次回もこのタックルを使う').uncheck()
    await saveRecord(page)
    await page.getByRole('button', { name: 'タックル入力を開く' }).click()
    await expect(page.getByLabel('ロッド')).toHaveValue('')
  })

  test('E2E-04c マイタックルに保存 → マイタックルを使う', async ({ freshPage: page }) => {
    await waitForRecordHome(page)
    await page.getByRole('button', { name: 'タックル入力を開く' }).click()
    await page.getByLabel('セット名').fill('シーバスセット')
    await page.getByLabel('ロッド').fill('9ft M')
    await page.getByRole('button', { name: 'マイタックルに保存' }).click()
    await expect(page.getByText('マイタックルに保存しました')).toBeVisible()
    await page.getByRole('button', { name: '入力をクリア' }).click()
    await expect(page.getByLabel('ロッド')).toHaveValue('')
    await page.getByRole('button', { name: 'マイタックルを使う' }).click()
    await page.getByRole('button', { name: 'シーバスセット' }).click()
    await expect(page.getByText('「シーバスセット」を適用しました')).toBeVisible()
    await expect(page.getByLabel('ロッド')).toHaveValue('9ft M')
  })

  test('E2E-04d ルアー候補から選ぶと値が入る', async ({ freshPage: page }) => {
    await waitForRecordHome(page)
    await page.getByRole('button', { name: 'タックル入力を開く' }).click()
    await page.getByLabel('ロッド').click()
    await expect(page.getByRole('option', { name: 'エメラルダス', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'エサ' }).click()
    await page.getByLabel('エサ', { exact: true }).click()
    await expect(page.getByRole('option', { name: 'アオイソメ', exact: true })).toBeVisible()
    await expect(page.getByRole('option', { name: 'ミノー', exact: true })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'ルアー' }).click()
    await page.getByLabel('ルアー', { exact: true }).click()
    await page.getByRole('option', { name: 'ミノー', exact: true }).click()
    await expect(page.getByLabel('ルアー', { exact: true })).toHaveValue('ミノー')
  })
})
