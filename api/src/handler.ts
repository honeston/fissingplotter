import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda'
import { isAccountDeleted, markAccountDeleted } from './account.js'
import { getCognitoUsername, getUserId } from './auth.js'
import { getPlaceName } from './place.js'
import { presignPhotoUpload, presignPhotoView } from './photos.js'
import { deleteRecord, listRecords, upsertRecord } from './records.js'
import { jsonResponse, optionsResponse } from './response.js'
import { getTideAt } from './tide.js'
import { getCurrentWeather } from './weather.js'

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
    if (path === '/account' && method === 'DELETE') {
      const username = getCognitoUsername(event)
      await markAccountDeleted(userId, username)
      return jsonResponse(204, null)
    }

    if (await isAccountDeleted(userId)) {
      return jsonResponse(403, { error: 'Account deleted' })
    }

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

    if (path === '/photos/presign' && method === 'POST') {
      if (!event.body) {
        return jsonResponse(400, { error: 'Missing body' })
      }
      const body = JSON.parse(event.body) as { recordId?: string }
      if (!body.recordId || typeof body.recordId !== 'string') {
        return jsonResponse(400, { error: 'Invalid recordId' })
      }
      const result = await presignPhotoUpload(userId, body.recordId)
      return jsonResponse(200, result)
    }

    const photoViewMatch = path.match(/^\/photos\/([^/]+)\/url$/)
    if (photoViewMatch && method === 'GET') {
      const recordId = decodeURIComponent(photoViewMatch[1])
      const result = await presignPhotoView(userId, recordId)
      return jsonResponse(200, result)
    }

    if (path === '/weather/current' && method === 'GET') {
      const latRaw = event.queryStringParameters?.lat
      const lngRaw = event.queryStringParameters?.lng
      if (latRaw == null || lngRaw == null) {
        return jsonResponse(400, { error: 'Invalid lat/lng' })
      }
      const latitude = Number(latRaw)
      const longitude = Number(lngRaw)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return jsonResponse(400, { error: 'Invalid lat/lng' })
      }
      const weather = await getCurrentWeather(latitude, longitude)
      return jsonResponse(200, { weather })
    }

    if (path === '/place/current' && method === 'GET') {
      const latRaw = event.queryStringParameters?.lat
      const lngRaw = event.queryStringParameters?.lng
      if (latRaw == null || lngRaw == null) {
        return jsonResponse(400, { error: 'Invalid lat/lng' })
      }
      const latitude = Number(latRaw)
      const longitude = Number(lngRaw)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return jsonResponse(400, { error: 'Invalid lat/lng' })
      }
      const placeName = await getPlaceName(latitude, longitude)
      return jsonResponse(200, { placeName })
    }

    if (path === '/tide/current' && method === 'GET') {
      const latRaw = event.queryStringParameters?.lat
      const lngRaw = event.queryStringParameters?.lng
      if (latRaw == null || lngRaw == null) {
        return jsonResponse(400, { error: 'Invalid lat/lng' })
      }
      const latitude = Number(latRaw)
      const longitude = Number(lngRaw)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return jsonResponse(400, { error: 'Invalid lat/lng' })
      }
      const atRaw = event.queryStringParameters?.at
      let at = new Date()
      if (atRaw) {
        const parsed = new Date(atRaw)
        if (Number.isNaN(parsed.getTime())) {
          return jsonResponse(400, { error: 'Invalid at' })
        }
        at = parsed
      }
      const tide = await getTideAt(latitude, longitude, at)
      return jsonResponse(200, { tide })
    }

    return jsonResponse(404, { error: 'Not found' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    const status = message.startsWith('Invalid') ? 400 : 500
    return jsonResponse(status, { error: message })
  }
}
