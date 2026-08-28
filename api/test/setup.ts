import { beforeAll } from 'vitest'

process.env.LOCAL_DEV = 'true'
process.env.AWS_ENDPOINT_URL ??= 'http://127.0.0.1:4566'
process.env.AWS_REGION ??= 'ap-northeast-1'
process.env.AWS_ACCESS_KEY_ID ??= 'test'
process.env.AWS_SECRET_ACCESS_KEY ??= 'test'
process.env.TABLE_NAME ??= 'fissingplotter-records'
process.env.ACCOUNT_DELETIONS_TABLE ??= 'fissingplotter-account-deletions'
process.env.MEDIA_BUCKET_NAME ??= 'fissingplotter-media-local'
process.env.WEATHER_CACHE_TABLE ??= 'fissingplotter-weather-cache'
delete process.env.LOCAL_DEV_USER_ID

const endpoint = process.env.AWS_ENDPOINT_URL

beforeAll(async () => {
  try {
    const res = await fetch(`${endpoint}/_localstack/health`)
    if (!res.ok) throw new Error(`status ${res.status}`)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw new Error(
      `LocalStack is not running at ${endpoint} (${detail}). Run \`docker compose up -d\` and \`npm run local:init\`.`,
    )
  }
})
