import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.int.test.ts'],
    setupFiles: ['./test/setup.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    fileParallelism: false,
    env: {
      LOCAL_DEV: 'true',
      AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL ?? 'http://127.0.0.1:4566',
      AWS_REGION: process.env.AWS_REGION ?? 'ap-northeast-1',
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? 'test',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
      TABLE_NAME: process.env.TABLE_NAME ?? 'fissingplotter-records',
      ACCOUNT_DELETIONS_TABLE:
        process.env.ACCOUNT_DELETIONS_TABLE ?? 'fissingplotter-account-deletions',
      MEDIA_BUCKET_NAME: process.env.MEDIA_BUCKET_NAME ?? 'fissingplotter-media-local',
      WEATHER_CACHE_TABLE: process.env.WEATHER_CACHE_TABLE ?? 'fissingplotter-weather-cache',
    },
  },
})
