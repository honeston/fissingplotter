import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from 'aws-lambda'
import { isLocalDev } from './awsClients.js'

type JwtClaims = Record<string, string | number | boolean | string[] | undefined>

function decodeJwtPayload(event: APIGatewayProxyEventV2): JwtClaims | null {
  const raw = event.headers?.authorization ?? event.headers?.Authorization
  if (!raw) return null

  const token = raw.replace(/^Bearer\s+/i, '').trim()
  const payload = token.split('.')[1]
  if (!payload) return null

  try {
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
      'utf8',
    )
    return JSON.parse(json) as JwtClaims
  } catch {
    return null
  }
}

function usernameFromClaims(claims: JwtClaims | undefined | null): string | null {
  if (!claims) return null
  const email = claims.email
  if (typeof email === 'string' && email) return email
  const cognitoUsername = claims['cognito:username']
  if (typeof cognitoUsername === 'string' && cognitoUsername) return cognitoUsername
  return null
}

export function getUserId(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  const fromAuthorizer = event.requestContext.authorizer?.jwt?.claims?.sub
  if (typeof fromAuthorizer === 'string' && fromAuthorizer) {
    return fromAuthorizer
  }

  if (isLocalDev()) {
    const fromHeader = decodeJwtPayload(event)?.sub
    if (typeof fromHeader === 'string' && fromHeader) return fromHeader

    const fallback = process.env.LOCAL_DEV_USER_ID
    if (fallback) return fallback

    throw new Error('Missing user id (local: log in or set LOCAL_DEV_USER_ID)')
  }

  throw new Error('Missing user id')
}

/** Cognito AdminDeleteUser 用の Username（email 優先） */
export function getCognitoUsername(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  const fromAuthorizer = usernameFromClaims(
    event.requestContext.authorizer?.jwt?.claims as JwtClaims | undefined,
  )
  if (fromAuthorizer) return fromAuthorizer

  if (isLocalDev()) {
    const fromHeader = usernameFromClaims(decodeJwtPayload(event))
    if (fromHeader) return fromHeader

    const fallback = process.env.LOCAL_DEV_USERNAME
    if (fallback) return fallback
  }

  throw new Error('Missing Cognito username')
}
