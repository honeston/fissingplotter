import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession,
} from 'amazon-cognito-identity-js'
import { awsConfig } from './config'

let userPool: CognitoUserPool | null = null

function getUserPool(): CognitoUserPool {
  if (!awsConfig.userPoolId || !awsConfig.clientId) {
    throw new Error('Cognito is not configured')
  }
  if (!userPool) {
    userPool = new CognitoUserPool({
      UserPoolId: awsConfig.userPoolId,
      ClientId: awsConfig.clientId,
    })
  }
  return userPool
}

export function getCurrentCognitoUser(): CognitoUser | null {
  return getUserPool().getCurrentUser()
}

function sessionToTokens(session: CognitoUserSession) {
  return {
    accessToken: session.getAccessToken().getJwtToken(),
    idToken: session.getIdToken().getJwtToken(),
    refreshToken: session.getRefreshToken().getToken(),
    expiresAt: session.getAccessToken().getExpiration() * 1000,
  }
}

export type AuthTokens = ReturnType<typeof sessionToTokens>

export async function getSession(): Promise<AuthTokens | null> {
  const user = getCurrentCognitoUser()
  if (!user) return null

  return new Promise((resolve) => {
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) {
        resolve(null)
        return
      }
      resolve(sessionToTokens(session))
    })
  })
}

export async function getIdToken(): Promise<string | null> {
  const session = await getSession()
  return session?.idToken ?? null
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession()
  return session?.accessToken ?? null
}

export function signIn(email: string, password: string): Promise<AuthTokens> {
  const user = new CognitoUser({ Username: email, Pool: getUserPool() })
  const authDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  })

  return new Promise((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: (session) => resolve(sessionToTokens(session)),
      onFailure: (err) => reject(err),
    })
  })
}

export function signUp(email: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    getUserPool().signUp(
      email,
      password,
      [new CognitoUserAttribute({ Name: 'email', Value: email })],
      [],
      (err) => {
        if (err) reject(err)
        else resolve()
      },
    )
  })
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  const user = new CognitoUser({ Username: email, Pool: getUserPool() })
  return new Promise((resolve, reject) => {
    user.confirmRegistration(code, true, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export function signOut(): void {
  getCurrentCognitoUser()?.signOut()
}

function readIdTokenPayload(idToken: string): Record<string, unknown> | null {
  try {
    const payload = idToken.split('.')[1]
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function getUserId(): Promise<string | null> {
  const session = await getSession()
  if (!session) return null
  const payload = readIdTokenPayload(session.idToken)
  return typeof payload?.sub === 'string' ? payload.sub : null
}

export async function getSignedInEmail(): Promise<string | null> {
  const session = await getSession()
  if (!session) return null
  const payload = readIdTokenPayload(session.idToken)
  if (typeof payload?.email === 'string' && payload.email) return payload.email
  const username = payload?.['cognito:username']
  if (typeof username === 'string' && username) return username
  return getCurrentCognitoUser()?.getUsername() ?? null
}
