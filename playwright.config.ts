import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5177',
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    geolocation: { latitude: 35.45, longitude: 139.65 },
    permissions: ['geolocation'],
    serviceWorkers: 'block',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5177 --strictPort --mode e2e',
    url: 'http://127.0.0.1:5177',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_API_URL: '',
      VITE_COGNITO_USER_POOL_ID: '',
      VITE_COGNITO_CLIENT_ID: '',
    },
  },
  projects: [{ name: 'cloud-off', testMatch: /cloud-off\/.*\.spec\.ts/ }],
})
