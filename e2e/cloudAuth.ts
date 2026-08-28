import { type Browser, type Page } from '@playwright/test'
import { isolatedContextOptions, waitForRecordHome } from './helpers'

export const E2E_POOL_ID = 'ap-northeast-1_E2ETEST01'
export const E2E_CLIENT_ID = 'e2eclientidxxxxxxxxxxxxx'
export const E2E_API_URL = 'http://127.0.0.1:3010'

export function e2eJwt(sub: string, email: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      email,
      exp: now + 86_400,
      iat: now,
      token_use: 'id',
      aud: E2E_CLIENT_ID,
      iss: `https://cognito-idp.ap-northeast-1.amazonaws.com/${E2E_POOL_ID}`,
    }),
  ).toString('base64url')
  return `${header}.${payload}.sig`
}

export async function injectCognitoSession(page: Page, sub: string, email: string) {
  const jwt = e2eJwt(sub, email)
  const clientId = E2E_CLIENT_ID
  await page.addInitScript(
    ({ clientId, email, jwt }) => {
      const prefix = `CognitoIdentityServiceProvider.${clientId}`
      localStorage.setItem(`${prefix}.LastAuthUser`, email)
      localStorage.setItem(`${prefix}.${email}.idToken`, jwt)
      localStorage.setItem(`${prefix}.${email}.accessToken`, jwt)
      localStorage.setItem(`${prefix}.${email}.refreshToken`, 'e2e-refresh')
      localStorage.setItem(`${prefix}.${email}.clockDrift`, '0')
    },
    { clientId, email, jwt },
  )
}

export async function stubEnvApis(page: Page) {
  const fail = () => ({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'stubbed' }),
  })
  await page.route('**/weather/current**', (route) => route.fulfill(fail()))
  await page.route('**/place/current**', (route) => route.fulfill(fail()))
  await page.route('**/tide/current**', (route) => route.fulfill(fail()))
}

export function newE2eUser() {
  const sub = `e2e-${crypto.randomUUID()}`
  return { sub, email: `${sub}@example.test` }
}

export async function openSignedInApp(browser: Browser) {
  const user = newE2eUser()
  const context = await browser.newContext({ ...isolatedContextOptions })
  const page = await context.newPage()
  await stubEnvApis(page)
  await injectCognitoSession(page, user.sub, user.email)
  await page.goto('/')
  await waitForRecordHome(page)
  return { page, context, user }
}
