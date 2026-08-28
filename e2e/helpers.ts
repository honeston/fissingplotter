import { test as base, expect, type Browser, type Page } from '@playwright/test'

export const isolatedContextOptions = {
  locale: 'ja-JP',
  timezoneId: 'Asia/Tokyo',
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  geolocation: { latitude: 35.45, longitude: 139.65 },
  permissions: ['geolocation'] as const,
  serviceWorkers: 'block' as const,
}

export async function waitForRecordHome(page: Page) {
  await expect(page.getByRole('heading', { name: '記録' })).toBeVisible()
}

export async function saveRecord(page: Page) {
  await page.getByRole('button', { name: '記録する' }).click()
  await expect(page.getByText('保存しました')).toBeVisible({ timeout: 20_000 })
}

/** 互換用。新規コンテキストでは不要。既存のクラウド E2E が参照する */
export async function clearClientState(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('fissingplotter')
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error ?? new Error('idb'))
      req.onblocked = () => resolve()
    })
    localStorage.clear()
  })
}

export async function newIsolatedPage(browser: Browser) {
  const context = await browser.newContext({ ...isolatedContextOptions })
  const page = await context.newPage()
  return { context, page }
}

type Fixtures = {
  freshPage: Page
}

export const test = base.extend<Fixtures>({
  freshPage: async ({ browser }, use) => {
    const { context, page } = await newIsolatedPage(browser)
    await page.goto('/')
    // Playwright の fixture コールバック。React の use ではない
    // oxlint-disable-next-line react/rules-of-hooks
    await use(page)
    await context.close()
  },
})

export { expect }
