import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from 'aws-lambda'
import { isLocalDev } from './awsClients.js'

function readJwtSubFromHeader(event: APIGatewayProxyEventV2): string | null {
  const raw = event.headers?.authorization ?? event.headers?.Authorization
  if (!raw) return null

  const token = raw.replace(/^Bearer\s+/i, '').trim()
  const payload = token.split('.')[1]
  if (!payload) return null

  try {
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
      'utf8',
    )
    const data = JSON.parse(json) as { sub?: string }
    return typeof data.sub === 'string' && data.sub ? data.sub : null
  } catch {
    return null
  }
}

export function getUserId(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  const fromAuthorizer = event.requestContext.authorizer?.jwt?.claims?.sub
  if (typeof fromAuthorizer === 'string' && fromAuthorizer) {
    return fromAuthorizer
  }

  if (isLocalDev()) {
    const fromHeader = readJwtSubFromHeader(event)
    if (fromHeader) return fromHeader

    const fallback = process.env.LOCAL_DEV_USER_ID
    if (fallback) return fallback

    throw new Error('Missing user id (local: log in or set LOCAL_DEV_USER_ID)')
  }

  throw new Error('Missing user id')
}
