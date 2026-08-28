#!/usr/bin/env node
/**
 * E2E 向け: handler を HTTP で公開する（SAM local は使わない）
 */
import { createServer, type IncomingHttpHeaders } from 'node:http'
import { handler } from '../src/handler.js'

process.env.LOCAL_DEV ??= 'true'
process.env.AWS_ENDPOINT_URL ??= 'http://127.0.0.1:4566'
process.env.AWS_REGION ??= 'ap-northeast-1'
process.env.AWS_ACCESS_KEY_ID ??= 'test'
process.env.AWS_SECRET_ACCESS_KEY ??= 'test'
process.env.TABLE_NAME ??= 'fissingplotter-records'
process.env.ACCOUNT_DELETIONS_TABLE ??= 'fissingplotter-account-deletions'
process.env.MEDIA_BUCKET_NAME ??= 'fissingplotter-media-local'
process.env.WEATHER_CACHE_TABLE ??= 'fissingplotter-weather-cache'
process.env.AWS_ENDPOINT_URL_PUBLIC ??= 'http://127.0.0.1:4566'

const PORT = Number(process.env.API_HTTP_PORT ?? '3010')

function headerMap(headers: IncomingHttpHeaders): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') out[key.toLowerCase()] = value
    else if (Array.isArray(value) && value[0]) out[key.toLowerCase()] = value[0]
  }
  return out
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`)
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const rawBody = Buffer.concat(chunks).toString('utf8')
    const method = req.method ?? 'GET'

    const event = {
      version: '2.0',
      routeKey: `${method} ${url.pathname}`,
      rawPath: url.pathname,
      headers: headerMap(req.headers),
      queryStringParameters: Object.fromEntries(url.searchParams),
      body: rawBody === '' ? undefined : rawBody,
      requestContext: {
        stage: '$default',
        http: { method, path: url.pathname },
      },
    }

    const result = await handler(event as never)
    if (typeof result === 'string') {
      res.statusCode = 200
      res.end(result)
      return
    }
    res.statusCode = result.statusCode ?? 200
    for (const [key, value] of Object.entries(result.headers ?? {})) {
      if (typeof value === 'string') res.setHeader(key, value)
    }
    res.end(result.body ?? '')
  } catch (err) {
    console.error(err)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Internal error' }))
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`API HTTP server listening on http://127.0.0.1:${PORT}`)
})
