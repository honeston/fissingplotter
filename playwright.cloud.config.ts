import { defineConfig } from '@playwright/test'

const API_URL = 'http://127.0.0.1:3010'
const POOL_ID = 'ap-northeast-1_E2ETEST01'
const CLIENT_ID = 'e2eclientidxxxxxxxxxxxxx'

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    geolocation: { latitude: 35.45, longitude: 139.65 },
    permissions: ['geolocation'],
    trace: 'on-first-retry',
    serviceWorkers: 'block',
  },
  webServer: [
    {
      command: 'npx tsx scripts/http-server.ts',
      cwd: './api',
      port: 3010,
      reuseExistingServer: false,
      env: {
        API_HTTP_PORT: '3010',
        LOCAL_DEV: 'true',
        AWS_ENDPOINT_URL: 'http://127.0.0.1:4566',
        AWS_ENDPOINT_URL_PUBLIC: 'http://127.0.0.1:4566',
        AWS_REGION: 'ap-northeast-1',
        AWS_ACCESS_KEY_ID: 'test',
        AWS_SECRET_ACCESS_KEY: 'test',
        TABLE_NAME: 'fissingplotter-records',
        ACCOUNT_DELETIONS_TABLE: 'fissingplotter-account-deletions',
        MEDIA_BUCKET_NAME: 'fissingplotter-media-local',
        WEATHER_CACHE_TABLE: 'fissingplotter-weather-cache',
      },
    },
    {
      command: 'npx vite --port 5174 --strictPort --mode e2e-cloud',
      port: 5174,
      reuseExistingServer: false,
      env: {
        VITE_API_URL: API_URL,
        VITE_COGNITO_USER_POOL_ID: POOL_ID,
        VITE_COGNITO_CLIENT_ID: CLIENT_ID,
        VITE_AWS_REGION: 'ap-northeast-1',
      },
    },
  ],
  projects: [{ name: 'cloud-on', testMatch: /cloud-on\/.*\.spec\.ts/ }],
})
