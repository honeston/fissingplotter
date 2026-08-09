import type { APIGatewayProxyResultV2 } from 'aws-lambda'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}

export function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  if (statusCode === 204) {
    return { statusCode, headers: CORS_HEADERS }
  }
  return {
    statusCode,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export function optionsResponse(): APIGatewayProxyResultV2 {
  return { statusCode: 204, headers: CORS_HEADERS }
}
