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

/** Playwright クラウド有効 E2E: Cognito の署名検証をせず JWT をセッションにする */
function isE2eCloudAuth(): boolean {
  return import.meta.env.MODE === 'e2e-cloud'
}

function readE2eSession(): AuthTokens | null {
  if (!isE2eCloudAuth() || typeof localStorage === 'undefined') return null
  const clientId = awsConfig.clientId
  if (!clientId) return null
  const prefix = `CognitoIdentityServiceProvider.${clientId}`
  const username = localStorage.getItem(`${prefix}.LastAuthUser`)
  if (!username) return null
  const idToken = localStorage.getItem(`${prefix}.${username}.idToken`)
  const accessToken = localStorage.getItem(`${prefix}.${username}.accessToken`)
  if (!idToken || !accessToken) return null
  const payload = readIdTokenPayload(idToken)
  const exp = typeof payload?.exp === 'number' ? payload.exp : 0
  if (exp * 1000 <= Date.now()) return null
  return {
    accessToken,
    idToken,
    refreshToken: localStorage.getItem(`${prefix}.${username}.refreshToken`) ?? '',
    expiresAt: exp * 1000,
  }
}

function clearE2eSession(): void {
  if (!isE2eCloudAuth() || typeof localStorage === 'undefined') return
  const clientId = awsConfig.clientId
  if (!clientId) return
  const prefix = `CognitoIdentityServiceProvider.${clientId}`
  const username = localStorage.getItem(`${prefix}.LastAuthUser`)
  if (username) {
    localStorage.removeItem(`${prefix}.${username}.idToken`)
    localStorage.removeItem(`${prefix}.${username}.accessToken`)
    localStorage.removeItem(`${prefix}.${username}.refreshToken`)
    localStorage.removeItem(`${prefix}.${username}.clockDrift`)
  }
  localStorage.removeItem(`${prefix}.LastAuthUser`)
}

export async function getSession(): Promise<AuthTokens | null> {
  const e2e = readE2eSession()
  if (e2e) return e2e

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
  clearE2eSession()
  try {
    getCurrentCognitoUser()?.signOut()
  } catch {
    // e2e-cloud では User Pool が実在しない
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

function requireCurrentUser(): CognitoUser {
  const user = getCurrentCognitoUser()
  if (!user) throw new Error('ログインしていません')
  return user
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = requireCurrentUser()
  return new Promise((resolve, reject) => {
    user.changePassword(currentPassword, newPassword, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

/** 新しいメールアドレスへ確認コードを送る */
export function requestEmailChange(newEmail: string): Promise<void> {
  const user = requireCurrentUser()
  return new Promise((resolve, reject) => {
    user.updateAttributes(
      [new CognitoUserAttribute({ Name: 'email', Value: newEmail })],
      (err) => {
        if (err) reject(err)
        else resolve()
      },
    )
  })
}

/** メールアドレス変更の確認コードを検証する */
export function confirmEmailChange(code: string): Promise<void> {
  const user = requireCurrentUser()
  return new Promise((resolve, reject) => {
    user.verifyAttribute('email', code, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    })
  })
}

function cognitoErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'string') {
    return err.code
  }
  if (err instanceof Error) return err.name
  return ''
}

export function forgotPasswordErrorMessage(err: unknown, fallback: string): string {
  const code = cognitoErrorCode(err)
  const message = err instanceof Error ? err.message : ''
  if (code === 'CodeMismatchException') return '確認コードが正しくありません'
  if (code === 'ExpiredCodeException') {
    return '確認コードの有効期限が切れています。再送信してください'
  }
  if (code === 'LimitExceededException' || code === 'TooManyRequestsException') {
    return '試行回数が多すぎます。しばらく待ってから再度お試しください'
  }
  if (code === 'InvalidPasswordException') {
    return 'パスワードは8文字以上で、英小文字と数字を含めてください'
  }
  if (message.includes('no registered/verified email')) {
    return 'このメールアドレスではパスワードをリセットできません。未確認のアカウントの場合は、先に登録の確認を完了してください'
  }
  return message || fallback
}

/** パスワードリセット用の確認コードをメール送信する */
export function forgotPassword(email: string): Promise<void> {
  const user = new CognitoUser({ Username: email, Pool: getUserPool() })
  return new Promise((resolve, reject) => {
    user.forgotPassword({
      onSuccess: () => resolve(),
      onFailure: (err) => {
        if (cognitoErrorCode(err) === 'UserNotFoundException') {
          resolve()
          return
        }
        reject(err)
      },
    })
  })
}

/** 確認コードと新しいパスワードでリセットを確定する */
export function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  const user = new CognitoUser({ Username: email, Pool: getUserPool() })
  return new Promise((resolve, reject) => {
    user.confirmPassword(code, newPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    })
  })
}
