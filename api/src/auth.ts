import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'

export function getUserId(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  const claims = event.requestContext.authorizer?.jwt?.claims
  const sub = claims?.sub
  if (typeof sub !== 'string' || !sub) {
    throw new Error('Missing user id')
  }
  return sub
}
