import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { deleteRecord, listRecords, upsertRecord } from './records.js'
import { jsonResponse, optionsResponse } from './response.js'
import { getUserId } from './auth.js'

/** HTTP API の stage 付き URL（/prod/health）でもルートパス（/health）に正規化 */
function apiPath(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  const stage = event.requestContext.stage
  let path = event.rawPath
  if (stage && path.startsWith(`/${stage}/`)) {
    path = path.slice(stage.length + 1)
  } else if (stage && path === `/${stage}`) {
    path = '/'
  }
  return path
}

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method
  const path = apiPath(event)

  if (method === 'OPTIONS') {
    return optionsResponse()
  }

  if (path === '/health' && method === 'GET') {
    return jsonResponse(200, { ok: true })
  }

  let userId: string
  try {
    userId = getUserId(event)
  } catch {
    return jsonResponse(401, { error: 'Unauthorized' })
  }

  try {
    if (path === '/records' && method === 'GET') {
      const since = event.queryStringParameters?.since
      const records = await listRecords(userId, since)
      return jsonResponse(200, { records })
    }

    if (path === '/records' && method === 'POST') {
      if (!event.body) {
        return jsonResponse(400, { error: 'Missing body' })
      }
      const body = JSON.parse(event.body) as unknown
      const record = await upsertRecord(userId, body)
      return jsonResponse(201, { record })
    }

    const deleteMatch = path.match(/^\/records\/([^/]+)$/)
    if (deleteMatch && method === 'DELETE') {
      const id = decodeURIComponent(deleteMatch[1])
      await deleteRecord(userId, id)
      return jsonResponse(204, null)
    }

    return jsonResponse(404, { error: 'Not found' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    const status = message.startsWith('Invalid') ? 400 : 500
    return jsonResponse(status, { error: message })
  }
}
