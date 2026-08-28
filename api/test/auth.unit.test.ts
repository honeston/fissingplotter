import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getUserId } from '../src/auth.js'

function jwtFor(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ sub })).toString('base64url')
  return `${header}.${payload}.sig`
}

function eventWithAuth(token?: string): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    requestContext: { http: { method: 'GET', path: '/records' } },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer
}

describe('UNIT-11 LOCAL_DEV の userId', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('LOCAL_DEV', 'true')
    delete process.env.LOCAL_DEV_USER_ID
  })

  it('JWT の sub を優先する', () => {
    vi.stubEnv('LOCAL_DEV_USER_ID', 'fallback-user')
    expect(getUserId(eventWithAuth(jwtFor('jwt-sub')))).toBe('jwt-sub')
  })

  it('ヘッダなしなら LOCAL_DEV_USER_ID にフォールバックする', () => {
    vi.stubEnv('LOCAL_DEV_USER_ID', 'fallback-user')
    expect(getUserId(eventWithAuth())).toBe('fallback-user')
  })

  it('どちらもなしなら throw する', () => {
    expect(() => getUserId(eventWithAuth())).toThrow(/Missing user id/)
  })
})
